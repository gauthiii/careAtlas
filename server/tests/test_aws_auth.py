import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("SNOW_INSTANCE", "ven04690.service-now.com")
os.environ.setdefault("SNOW_USERNAME", "snow-user")
os.environ.setdefault("SNOW_PASSWORD", "snow-password")

from app.aws_auth import cognito_dep
from app.config import get_settings
from app.main import create_app


class FakeCognitoError(Exception):
    """Base for the boto3-style exception classes the router catches."""


def _exc(name):
    return type(name, (FakeCognitoError,), {})


# Mirror the `client.exceptions.<Name>` classes the router references.
EXCEPTIONS = SimpleNamespace(
    UsernameExistsException=_exc("UsernameExistsException"),
    InvalidPasswordException=_exc("InvalidPasswordException"),
    NotAuthorizedException=_exc("NotAuthorizedException"),
    UserNotConfirmedException=_exc("UserNotConfirmedException"),
    EnableSoftwareTokenMFAException=_exc("EnableSoftwareTokenMFAException"),
    CodeMismatchException=_exc("CodeMismatchException"),
    ExpiredCodeException=_exc("ExpiredCodeException"),
    UserNotFoundException=_exc("UserNotFoundException"),
)


class FakeCognito:
    """Records calls and returns canned responses; raises queued exceptions."""

    def __init__(self):
        self.calls = []
        self.exceptions = EXCEPTIONS
        self._responses = {}
        self._raises = {}

    def will_return(self, method, value):
        self._responses[method] = value

    def will_raise(self, method, exc):
        self._raises[method] = exc

    def __getattr__(self, method):
        # Only invoked for unknown attributes (real ones are set in __init__).
        def _call(**kwargs):
            self.calls.append((method, kwargs))
            if method in self._raises:
                raise self._raises[method]
            return self._responses.get(method, {})

        return _call


class FakeSettings:
    cognito_region = "us-east-1"
    cognito_user_pool_id = "us-east-1_pool"
    cognito_client_id = "client-id"
    cognito_client_secret = "client-secret"


class AwsAuthTest(unittest.TestCase):
    def setUp(self):
        get_settings.cache_clear()
        self.app = create_app()
        self.cognito = FakeCognito()
        self.app.dependency_overrides[cognito_dep] = lambda: (self.cognito, FakeSettings())
        self.client = TestClient(self.app)

    def tearDown(self):
        self.app.dependency_overrides.clear()

    # -- register ----------------------------------------------------------

    def test_register_signs_up_confirms_and_verifies(self):
        self.cognito.will_return("sign_up", {"UserSub": "sub-123"})
        resp = self.client.post(
            "/api/aws/register",
            json={"name": "Ada", "email": "ada@example.com", "password": "Sup3r!secret"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"status": "SIGNUP_AND_CONFIRMED", "user_sub": "sub-123"})
        methods = [c[0] for c in self.cognito.calls]
        self.assertEqual(methods, ["sign_up", "admin_confirm_sign_up", "admin_update_user_attributes"])

    def test_register_duplicate_returns_400(self):
        self.cognito.will_raise("sign_up", EXCEPTIONS.UsernameExistsException())
        resp = self.client.post(
            "/api/aws/register",
            json={"name": "Ada", "email": "ada@example.com", "password": "pw"},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("already exists", resp.json()["detail"])

    # -- login -------------------------------------------------------------

    def test_login_success_returns_tokens(self):
        self.cognito.will_return(
            "initiate_auth",
            {"AuthenticationResult": {"IdToken": "id", "AccessToken": "ac", "RefreshToken": "re"}},
        )
        resp = self.client.post(
            "/api/aws/login", json={"username": "ada@example.com", "password": "pw"}
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "AUTH_SUCCESS")
        self.assertEqual(body["access_token"], "ac")

    def test_login_mfa_challenge_returns_session(self):
        self.cognito.will_return(
            "initiate_auth", {"ChallengeName": "SOFTWARE_TOKEN_MFA", "Session": "sess-1"}
        )
        resp = self.client.post(
            "/api/aws/login", json={"username": "ada@example.com", "password": "pw"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"status": "MFA_REQUIRED", "session": "sess-1"})

    def test_login_bad_password_returns_401(self):
        self.cognito.will_raise("initiate_auth", EXCEPTIONS.NotAuthorizedException())
        resp = self.client.post(
            "/api/aws/login", json={"username": "ada@example.com", "password": "wrong"}
        )
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.json()["detail"], "Invalid email or password")

    def test_login_new_password_challenge_returns_session(self):
        self.cognito.will_return(
            "initiate_auth", {"ChallengeName": "NEW_PASSWORD_REQUIRED", "Session": "sess-new"}
        )
        resp = self.client.post(
            "/api/aws/login", json={"username": "ada@example.com", "password": "temporary"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp.json(),
            {"status": "CHALLENGE", "challenge_name": "NEW_PASSWORD_REQUIRED", "session": "sess-new"},
        )

    def test_complete_new_password_returns_next_mfa_setup_challenge(self):
        self.cognito.will_return(
            "respond_to_auth_challenge", {"ChallengeName": "MFA_SETUP", "Session": "sess-mfa"}
        )
        resp = self.client.post(
            "/api/aws/login/new-password",
            json={
                "session": "sess-new",
                "username": "ada@example.com",
                "new_password": "Sup3r!secret2",
                "name": "Ada Lovelace",
            },
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"status": "MFA_SETUP_REQUIRED", "session": "sess-mfa"})
        self.assertEqual(self.cognito.calls[0][0], "respond_to_auth_challenge")
        self.assertEqual(self.cognito.calls[0][1]["ChallengeName"], "NEW_PASSWORD_REQUIRED")
        self.assertEqual(
            self.cognito.calls[0][1]["ChallengeResponses"]["userAttributes.name"],
            "Ada Lovelace",
        )

    # -- mfa setup ---------------------------------------------------------

    def test_mfa_setup_start_returns_secret_and_qr(self):
        self.cognito.will_return(
            "associate_software_token", {"SecretCode": "BASE32SECRET", "Session": "sess-2"}
        )
        resp = self.client.post(
            "/api/aws/mfa/setup/start",
            json={"session": "sess-1", "username": "ada@example.com"},
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["secret"], "BASE32SECRET")
        self.assertIn("otpauth://totp/", body["otpauth_url"])
        self.assertIn("CareAtlas%3Aada%40example.com", body["otpauth_url"])
        self.assertTrue(body["qr_image_data_url"].startswith("data:image/png;base64,"))

    def test_mfa_setup_verify_failure_returns_400(self):
        self.cognito.will_return("verify_software_token", {"Status": "ERROR"})
        resp = self.client.post(
            "/api/aws/mfa/setup/verify",
            json={"session": "s", "username": "ada@example.com", "code": "000000"},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("MFA verify failed", resp.json()["detail"])

    def test_mfa_setup_verify_success_completes_challenge_and_sets_preference(self):
        self.cognito.will_return("verify_software_token", {"Status": "SUCCESS", "Session": "sess-3"})
        self.cognito.will_return(
            "respond_to_auth_challenge",
            {"AuthenticationResult": {"IdToken": "id", "AccessToken": "ac", "RefreshToken": "re"}},
        )
        resp = self.client.post(
            "/api/aws/mfa/setup/verify",
            json={"session": "sess-2", "username": "ada@example.com", "code": "123456"},
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "AUTH_SUCCESS")
        self.assertEqual(body["access_token"], "ac")
        methods = [c[0] for c in self.cognito.calls]
        self.assertEqual(methods, ["verify_software_token", "respond_to_auth_challenge", "set_user_mfa_preference"])
        self.assertEqual(self.cognito.calls[1][1]["ChallengeName"], "MFA_SETUP")

    # -- login with mfa ----------------------------------------------------

    def test_login_verify_mfa_success(self):
        self.cognito.will_return(
            "respond_to_auth_challenge",
            {"AuthenticationResult": {"IdToken": "id", "AccessToken": "ac", "RefreshToken": "re"}},
        )
        resp = self.client.post(
            "/api/aws/login/verify-mfa",
            json={"session": "s", "username": "ada@example.com", "code": "123456"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["access_token"], "ac")

    def test_login_verify_mfa_bad_code_returns_401(self):
        self.cognito.will_raise(
            "respond_to_auth_challenge", EXCEPTIONS.CodeMismatchException()
        )
        resp = self.client.post(
            "/api/aws/login/verify-mfa",
            json={"session": "s", "username": "ada@example.com", "code": "000000"},
        )
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.json()["detail"], "Invalid MFA code")

    # -- password reset ----------------------------------------------------

    def test_forgot_password_unknown_user_does_not_leak(self):
        self.cognito.will_raise("forgot_password", EXCEPTIONS.UserNotFoundException())
        resp = self.client.post(
            "/api/aws/password/forgot", json={"username": "nobody@example.com"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "RESET_CODE_SENT")

    def test_reset_password_expired_code_returns_400(self):
        self.cognito.will_raise(
            "confirm_forgot_password", EXCEPTIONS.ExpiredCodeException()
        )
        resp = self.client.post(
            "/api/aws/password/reset",
            json={"username": "ada@example.com", "code": "111111", "new_password": "New!pass1"},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("expired", resp.json()["detail"])

    # -- token validate / logout ------------------------------------------

    def test_validate_token_returns_attributes_map(self):
        self.cognito.will_return(
            "get_user",
            {
                "Username": "ada@example.com",
                "UserAttributes": [
                    {"Name": "email", "Value": "ada@example.com"},
                    {"Name": "email_verified", "Value": "true"},
                ],
            },
        )
        resp = self.client.post("/api/aws/token/validate", json={"access_token": "ac"})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "VALID")
        self.assertEqual(body["attributes"]["email_verified"], "true")

    def test_logout_success(self):
        resp = self.client.post("/api/aws/logout", json={"access_token": "ac"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "LOGOUT_SUCCESSFUL")
        self.assertEqual(self.cognito.calls[0][0], "global_sign_out")


class UnconfiguredSettings:
    cognito_region = "us-east-1"
    cognito_user_pool_id = None
    cognito_client_id = None
    cognito_client_secret = None


class AwsAuthNotConfiguredTest(unittest.TestCase):
    """With the COGNITO_* settings unset, the dependency should 503."""

    def setUp(self):
        get_settings.cache_clear()
        self.app = create_app()
        # Override the settings the real cognito_dep reads, so it hits the guard.
        self.app.dependency_overrides[get_settings] = lambda: UnconfiguredSettings()
        self.client = TestClient(self.app)

    def tearDown(self):
        self.app.dependency_overrides.clear()

    def test_returns_503_when_unconfigured(self):
        resp = self.client.post("/api/aws/logout", json={"access_token": "ac"})
        self.assertEqual(resp.status_code, 503)
        self.assertIn("Cognito not configured", resp.json()["detail"])


if __name__ == "__main__":
    unittest.main()
