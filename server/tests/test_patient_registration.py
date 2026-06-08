import base64
import json
import os
import sys
import unittest
from dataclasses import dataclass
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("SNOW_INSTANCE", "ven04690.service-now.com")
os.environ.setdefault("SNOW_USERNAME", "snow-user")
os.environ.setdefault("SNOW_PASSWORD", "snow-password")

from app.config import get_settings
from app.main import create_app
from app.models import PatientRegistrationRequest, PatientRegistrationResponse
from app.servicenow import ServiceNowError, create_patient_registration


@dataclass
class FakeSettings:
    snow_instance: str = "ven04690.service-now.com"
    snow_username: str = "interface-account"
    snow_password: str = "interface-password"
    request_timeout: float = 5.0

    @property
    def snow_base_url(self) -> str:
        return f"https://{self.snow_instance}"


def registration_data() -> dict[str, object]:
    return {
        "first_name": "Aisha",
        "last_name": "Evans",
        "date_of_birth": "1981-09-30",
        "gender": "Female",
        "ethnicity": "White",
        "primary_language": "English",
        "phone": "07721130263",
        "email": "aisha.evans77@example.com",
        "address_line1": "1 Demo Street",
        "address_line2": "",
        "city": "London",
        "postcode": "E1 6AA",
        "health_condition": "Preventative care",
        "accessibility": "Yes",
        "insurance_id": "",
        "emergency_name": "Emergency Contact",
        "emergency_phone": "07700000000",
        "emergency_relationship": "Partner",
        "username": "aisha.evans77",
        "consent_accepted": True,
    }


class PatientRegistrationServiceNowTest(unittest.IsolatedAsyncioTestCase):
    async def test_creates_patient_with_normalized_payload_and_basic_auth(self):
        requests = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(
                201,
                json={
                    "result": {
                        "sys_id": "patient-sys-id",
                        "u_patient_id": "patient-public-id",
                        "u_first_name": "Aisha",
                        "u_last_name": "Evans",
                        "u_email": "aisha.evans77@example.com",
                        "u_registration_status": "pending",
                    }
                },
            )

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            response = await create_patient_registration(
                FakeSettings(),
                PatientRegistrationRequest(**registration_data()),
                http_client=http_client,
            )

        self.assertEqual(response.sys_id, "patient-sys-id")
        self.assertEqual(response.patient_id, "patient-public-id")
        self.assertEqual(requests[0].url.path, "/api/now/table/u_patient")

        scheme, _, encoded = requests[0].headers["authorization"].partition(" ")
        self.assertEqual(scheme, "Basic")
        self.assertEqual(
            base64.b64decode(encoded).decode(),
            "interface-account:interface-password",
        )

        payload = json.loads(requests[0].content)
        self.assertNotIn("password", json.dumps(payload).lower())
        self.assertEqual(payload["u_gender"], "female")
        self.assertEqual(payload["u_ethnicity"], "white")
        self.assertEqual(payload["u_health_condition"], "preventative")
        self.assertEqual(payload["u_accessibility"], "true")
        self.assertEqual(payload["u_consent_accepted"], "true")
        self.assertEqual(payload["u_registration_status"], "pending")
        self.assertEqual(payload["u_account_status"], "active")
        self.assertEqual(payload["u_profile_complete"], "true")
        self.assertEqual(payload["u_confidence_score"], "100")
        self.assertNotIn("u_address_line2", payload)
        self.assertNotIn("u_insurance_id", payload)

    async def test_non_success_response_raises_servicenow_error(self):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(403, json={"error": {"message": "Forbidden"}})

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            with self.assertRaisesRegex(ServiceNowError, "ServiceNow 403"):
                await create_patient_registration(
                    FakeSettings(),
                    PatientRegistrationRequest(**registration_data()),
                    http_client=http_client,
                )


class PatientRegistrationEndpointTest(unittest.TestCase):
    def setUp(self):
        get_settings.cache_clear()
        self.app = create_app()
        self.client = TestClient(self.app)

    def tearDown(self):
        self.app.dependency_overrides.clear()

    def test_valid_request_returns_confirmation(self):
        expected = PatientRegistrationResponse(
            message="Patient registration created in ServiceNow.",
            sys_id="patient-sys-id",
            patient_id="patient-public-id",
            first_name="Aisha",
            last_name="Evans",
            email="aisha.evans77@example.com",
            registration_status="pending",
        )

        with patch("app.main.create_patient_registration", new=AsyncMock(return_value=expected)):
            response = self.client.post("/api/patients/register", json=registration_data())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["sys_id"], "patient-sys-id")
        self.assertEqual(response.json()["patient_id"], "patient-public-id")

    def test_missing_required_field_returns_422(self):
        data = registration_data()
        data["first_name"] = ""

        response = self.client.post("/api/patients/register", json=data)

        self.assertEqual(response.status_code, 422)

    def test_upstream_failure_returns_502(self):
        with patch(
            "app.main.create_patient_registration",
            new=AsyncMock(side_effect=ServiceNowError("ServiceNow 403: Forbidden")),
        ):
            response = self.client.post("/api/patients/register", json=registration_data())

        self.assertEqual(response.status_code, 502)
        self.assertIn("ServiceNow 403", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
