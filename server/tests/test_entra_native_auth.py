import json
import sys
import unittest
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import parse_qs

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.entra_native_auth import (
    EntraNativeAuthClient,
    EntraNativeAuthError,
    normalize_native_auth_response,
)


@dataclass
class FakeSettings:
    entra_app_id: str = "client-id"
    entra_tenant_id: str = "tenant-id"
    entra_tenant_subdomain: str = "contoso"
    entra_tenant_domain: str = "contoso.onmicrosoft.com"
    entra_scopes: str = "openid offline_access profile"
    request_timeout: float = 5.0

    @property
    def entra_base_url(self) -> str:
        return f"https://{self.entra_tenant_subdomain}.ciamlogin.com/{self.entra_tenant_domain}"


def form_body(request: httpx.Request) -> dict[str, str]:
    parsed = parse_qs(request.content.decode())
    return {key: values[-1] for key, values in parsed.items()}


class EntraNativeAuthClientTest(unittest.IsolatedAsyncioTestCase):
    async def call_client(self, responses, action, *args):
        requests = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            status_code, body = responses[len(requests) - 1]
            return httpx.Response(status_code, json=body)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            client = EntraNativeAuthClient(FakeSettings(), http_client=http_client)
            result = await getattr(client, action)(*args)

        return result, requests

    async def test_signup_start_sends_password_flow_capabilities_and_attributes(self):
        result, requests = await self.call_client(
            [(200, {"continuation_token": "signup-token"})],
            "signup_start",
            "casey@example.com",
            "Secret123!",
            {"displayName": "Casey Jensen"},
        )

        body = form_body(requests[0])
        self.assertEqual(requests[0].url.path, "/contoso.onmicrosoft.com/signup/v1.0/start")
        self.assertEqual(body["client_id"], "client-id")
        self.assertEqual(body["challenge_type"], "oob password redirect")
        self.assertEqual(body["capabilities"], "registration_required mfa_required")
        self.assertEqual(body["username"], "casey@example.com")
        self.assertEqual(body["password"], "Secret123!")
        self.assertEqual(json.loads(body["attributes"]), {"displayName": "Casey Jensen"})
        self.assertEqual(normalize_native_auth_response(result)["status"], "next_step")

    async def test_signin_password_maps_success_tokens(self):
        result, requests = await self.call_client(
            [
                (200, {"challenge_type": "password", "continuation_token": "password-token"}),
                (
                    200,
                    {
                        "token_type": "Bearer",
                        "scope": "openid profile",
                        "expires_in": 3600,
                        "access_token": "access",
                        "refresh_token": "refresh",
                        "id_token": "id",
                    },
                ),
            ],
            "signin_password",
            "init-token",
            "Secret123!",
        )

        challenge_body = form_body(requests[0])
        token_body = form_body(requests[1])
        normalized = normalize_native_auth_response(result)

        self.assertEqual(requests[0].url.path, "/contoso.onmicrosoft.com/oauth2/v2.0/challenge")
        self.assertEqual(challenge_body["challenge_type"], "password redirect")
        self.assertEqual(challenge_body["continuation_token"], "init-token")
        self.assertEqual(requests[1].url.path, "/contoso.onmicrosoft.com/oauth2/v2.0/token")
        self.assertEqual(token_body["grant_type"], "password")
        self.assertEqual(token_body["continuation_token"], "password-token")
        self.assertEqual(token_body["scope"], "openid offline_access profile")
        self.assertEqual(normalized["status"], "authenticated")
        self.assertEqual(normalized["tokens"]["accessToken"], "access")
        self.assertEqual(normalized["tokens"]["refreshToken"], "refresh")

    async def test_signin_password_maps_mfa_required(self):
        result, _ = await self.call_client(
            [
                (200, {"challenge_type": "password", "continuation_token": "password-token"}),
                (
                    400,
                    {
                        "error": "invalid_grant",
                        "suberror": "mfa_required",
                        "continuation_token": "mfa-token",
                        "trace_id": "trace",
                        "correlation_id": "correlation",
                    },
                ),
            ],
            "signin_password",
            "init-token",
            "Secret123!",
        )

        normalized = normalize_native_auth_response(result)
        self.assertEqual(normalized["status"], "mfa_required")
        self.assertEqual(normalized["continuationToken"], "mfa-token")
        self.assertEqual(normalized["traceId"], "trace")
        self.assertEqual(normalized["correlationId"], "correlation")

    async def test_signin_password_maps_registration_required(self):
        result, _ = await self.call_client(
            [
                (200, {"challenge_type": "password", "continuation_token": "password-token"}),
                (
                    400,
                    {
                        "error": "registration_required",
                        "continuation_token": "registration-token",
                    },
                ),
            ],
            "signin_password",
            "init-token",
            "Secret123!",
        )

        normalized = normalize_native_auth_response(result)
        self.assertEqual(normalized["status"], "registration_required")
        self.assertEqual(normalized["continuationToken"], "registration-token")

    async def test_mfa_methods_challenge_and_verify_call_expected_endpoints(self):
        methods_result, method_requests = await self.call_client(
            [
                (
                    200,
                    {
                        "continuation_token": "methods-token",
                        "methods": [
                            {
                                "id": "email-method-id",
                                "challenge_type": "oob",
                                "challenge_channel": "email",
                                "login_hint": "casey@example.com",
                            }
                        ],
                    },
                )
            ],
            "signin_mfa_methods",
            "mfa-token",
        )
        challenge_result, challenge_requests = await self.call_client(
            [
                (
                    200,
                    {
                        "continuation_token": "challenge-token",
                        "challenge_type": "oob",
                        "challenge_channel": "email",
                        "code_length": 8,
                    },
                )
            ],
            "signin_mfa_challenge",
            "methods-token",
            "email-method-id",
        )
        verify_result, verify_requests = await self.call_client(
            [
                (
                    200,
                    {
                        "token_type": "Bearer",
                        "access_token": "access",
                        "id_token": "id",
                    },
                )
            ],
            "signin_mfa_verify",
            "challenge-token",
            "12345678",
        )

        self.assertEqual(method_requests[0].url.path, "/contoso.onmicrosoft.com/oauth2/v2.0/introspect")
        self.assertEqual(form_body(method_requests[0])["continuation_token"], "mfa-token")
        self.assertEqual(normalize_native_auth_response(methods_result)["methods"][0]["loginHint"], "casey@example.com")
        self.assertEqual(challenge_requests[0].url.path, "/contoso.onmicrosoft.com/oauth2/v2.0/challenge")
        self.assertEqual(form_body(challenge_requests[0])["id"], "email-method-id")
        self.assertEqual(normalize_native_auth_response(challenge_result)["codeLength"], 8)
        self.assertEqual(verify_requests[0].url.path, "/contoso.onmicrosoft.com/oauth2/v2.0/token")
        self.assertEqual(form_body(verify_requests[0])["grant_type"], "mfa_oob")
        self.assertEqual(form_body(verify_requests[0])["oob"], "12345678")
        self.assertEqual(normalize_native_auth_response(verify_result)["status"], "authenticated")

    async def test_register_strong_auth_handles_oob_and_preverified(self):
        challenge_result, challenge_requests = await self.call_client(
            [
                (
                    200,
                    {
                        "continuation_token": "register-challenge-token",
                        "challenge_type": "oob",
                        "challenge_channel": "email",
                        "challenge_target": "casey@example.com",
                        "code_length": 8,
                    },
                )
            ],
            "register_challenge",
            "register-token",
            "email",
            "casey@example.com",
            None,
        )
        verify_result, verify_requests = await self.call_client(
            [(200, {"continuation_token": "registered-token"})],
            "register_verify",
            "register-challenge-token",
            "12345678",
        )
        preverified_result, preverified_requests = await self.call_client(
            [(200, {"continuation_token": "preverified-token"})],
            "register_verify",
            "preverified-challenge-token",
            None,
        )

        challenge_body = form_body(challenge_requests[0])
        self.assertEqual(challenge_requests[0].url.path, "/contoso.onmicrosoft.com/register/v1.0/challenge")
        self.assertEqual(challenge_body["challenge_type"], "oob")
        self.assertEqual(challenge_body["challenge_channel"], "email")
        self.assertEqual(challenge_body["challenge_target"], "casey@example.com")
        self.assertEqual(normalize_native_auth_response(challenge_result)["challengeTarget"], "casey@example.com")
        self.assertEqual(form_body(verify_requests[0])["grant_type"], "oob")
        self.assertEqual(form_body(verify_requests[0])["oob"], "12345678")
        self.assertEqual(normalize_native_auth_response(verify_result)["continuationToken"], "registered-token")
        self.assertEqual(form_body(preverified_requests[0])["grant_type"], "continuation_token")
        self.assertEqual(normalize_native_auth_response(preverified_result)["continuationToken"], "preverified-token")

    async def test_entra_error_payload_is_preserved_without_credentials(self):
        with self.assertRaises(EntraNativeAuthError) as caught:
            await self.call_client(
                [
                    (
                        400,
                        {
                            "error": "invalid_grant",
                            "suberror": "password_too_short",
                            "error_description": "Password does not meet policy.",
                            "trace_id": "trace",
                            "correlation_id": "correlation",
                        },
                    )
                ],
                "signup_start",
                "casey@example.com",
                "Secret123!",
                None,
            )

        detail = caught.exception.detail
        self.assertEqual(caught.exception.status_code, 400)
        self.assertEqual(detail["error"], "invalid_grant")
        self.assertEqual(detail["suberror"], "password_too_short")
        self.assertEqual(detail["trace_id"], "trace")
        self.assertNotIn("Secret123!", json.dumps(detail))


if __name__ == "__main__":
    unittest.main()
