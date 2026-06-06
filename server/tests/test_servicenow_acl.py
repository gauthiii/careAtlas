import base64
import os
import sys
import unittest
from dataclasses import dataclass
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("SNOW_INSTANCE", "ven04690.service-now.com")
os.environ.setdefault("SNOW_USERNAME", "snow-user")
os.environ.setdefault("SNOW_PASSWORD", "snow-password")
os.environ.setdefault("ENTRA_APP_ID", "entra-app-id")
os.environ.setdefault("ENTRA_TENANT_ID", "entra-tenant-id")
os.environ.setdefault("ENTRA_TENANT_SUBDOMAIN", "entra-subdomain")

from app.config import get_settings
from app.main import create_app
from app.servicenow import test_service_account_acl


@dataclass
class FakeSettings:
    snow_instance: str = "ven04690.service-now.com"
    snow_password: str = "shared-password"
    request_timeout: float = 5.0

    @property
    def snow_base_url(self) -> str:
        return f"https://{self.snow_instance}"


class ServiceNowAclTest(unittest.IsolatedAsyncioTestCase):
    async def call_acl_test(self, service_account, responses):
        requests = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            status_code, body = responses[len(requests) - 1]
            return httpx.Response(status_code, json=body)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            result = await test_service_account_acl(
                FakeSettings(),
                service_account,
                http_client=http_client,
            )

        return result, requests

    async def test_allowed_read_and_denied_403_pass(self):
        result, requests = await self.call_acl_test(
            "svc-reminder-agent",
            [
                (200, {"result": [{"sys_id": "appointment-1"}]}),
                (403, {"error": {"message": "Forbidden"}}),
            ],
        )

        self.assertEqual(result.overall_status, "passed")
        self.assertEqual(result.checks[0].actual, "allowed")
        self.assertEqual(result.checks[1].actual, "denied")
        self.assertTrue(all(check.passed for check in result.checks))
        self.assertEqual(requests[0].url.path, "/api/now/table/u_appointment")
        self.assertEqual(requests[1].url.path, "/api/now/table/u_patient")
        scheme, _, encoded = requests[0].headers["authorization"].partition(" ")
        self.assertEqual(scheme, "Basic")
        self.assertEqual(
            base64.b64decode(encoded).decode(),
            "svc-reminder-agent:shared-password",
        )

    async def test_denied_field_probe_passes_when_requested_fields_are_omitted(self):
        result, _ = await self.call_acl_test(
            "svc-scheduling-agent",
            [
                (
                    200,
                    {
                        "result": [
                            {
                                "sys_id": "patient-1",
                                "u_patient_id": "P-1",
                                "u_health_condition": "checkup",
                            }
                        ]
                    },
                ),
                (200, {"result": [{}]}),
            ],
        )

        self.assertEqual(result.overall_status, "passed")
        self.assertEqual(result.checks[1].expected, "denied")
        self.assertEqual(result.checks[1].actual, "denied")
        self.assertTrue(result.checks[1].passed)

    async def test_empty_denied_field_probe_is_inconclusive(self):
        result, _ = await self.call_acl_test(
            "svc-scheduling-agent",
            [
                (200, {"result": [{"sys_id": "patient-1"}]}),
                (200, {"result": []}),
            ],
        )

        self.assertEqual(result.overall_status, "inconclusive")
        self.assertEqual(result.checks[1].actual, "inconclusive")
        self.assertFalse(result.checks[1].passed)


class AclEndpointTest(unittest.TestCase):
    def setUp(self):
        get_settings.cache_clear()
        self.app = create_app()
        self.client = TestClient(self.app)

    def tearDown(self):
        self.app.dependency_overrides.clear()

    def test_unknown_service_account_returns_400(self):
        response = self.client.post(
            "/api/acl/test",
            json={"service_account": "not-a-known-account"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Unknown service account", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
