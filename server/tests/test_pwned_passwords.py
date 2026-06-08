import hashlib
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
from app.models import PasswordPwnedCheckResponse
from app.pwned_passwords import PwnedPasswordsError, check_pwned_password


@dataclass
class FakeSettings:
    request_timeout: float = 5.0


class PwnedPasswordsClientTest(unittest.IsolatedAsyncioTestCase):
    async def test_matching_suffix_returns_count(self):
        password = "password"
        digest = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
        requests = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(
                200,
                text=f"00000000000000000000000000000000000:0\r\n{digest[5:]}:12345\r\n",
            )

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            response = await check_pwned_password(
                FakeSettings(),
                password,
                http_client=http_client,
            )

        self.assertTrue(response.pwned)
        self.assertEqual(response.count, 12345)
        self.assertEqual(requests[0].url.path, f"/range/{digest[:5]}")
        self.assertEqual(requests[0].headers["add-padding"], "true")
        self.assertIn("CareAtlas", requests[0].headers["user-agent"])

    async def test_missing_suffix_returns_safe_result(self):
        transport = httpx.MockTransport(lambda request: httpx.Response(200, text="ABCDEF:2\r\n"))
        async with httpx.AsyncClient(transport=transport) as http_client:
            response = await check_pwned_password(
                FakeSettings(),
                "not-in-response",
                http_client=http_client,
            )

        self.assertFalse(response.pwned)
        self.assertEqual(response.count, 0)

    async def test_non_success_response_raises(self):
        transport = httpx.MockTransport(lambda request: httpx.Response(403, text="Forbidden"))
        async with httpx.AsyncClient(transport=transport) as http_client:
            with self.assertRaisesRegex(PwnedPasswordsError, "Pwned Passwords 403"):
                await check_pwned_password(
                    FakeSettings(),
                    "password",
                    http_client=http_client,
                )


class PwnedPasswordsEndpointTest(unittest.TestCase):
    def setUp(self):
        get_settings.cache_clear()
        self.app = create_app()
        self.client = TestClient(self.app)

    def tearDown(self):
        self.app.dependency_overrides.clear()

    def test_valid_request_returns_check_result(self):
        expected = PasswordPwnedCheckResponse(pwned=True, count=42)

        with patch("app.main.check_pwned_password", new=AsyncMock(return_value=expected)):
            response = self.client.post("/api/passwords/pwned-check", json={"password": "password"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"pwned": True, "count": 42})

    def test_missing_password_returns_422(self):
        response = self.client.post("/api/passwords/pwned-check", json={"password": ""})

        self.assertEqual(response.status_code, 422)

    def test_upstream_failure_returns_502(self):
        with patch(
            "app.main.check_pwned_password",
            new=AsyncMock(side_effect=PwnedPasswordsError("Pwned Passwords 403: Forbidden")),
        ):
            response = self.client.post("/api/passwords/pwned-check", json={"password": "password"})

        self.assertEqual(response.status_code, 502)
        self.assertIn("Pwned Passwords 403", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
