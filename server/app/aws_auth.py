"""AWS Cognito email/password + TOTP MFA authentication router.

Everything here is plain username (email) / password auth with software-token
(authenticator app) MFA. There is intentionally no social / hosted-UI login or
logout — only the email/password + MFA surface area:

    register -> confirm email -> login -> set up MFA -> verify MFA ->
    login with MFA -> reset password -> validate token -> logout

Mounted under ``/api/aws`` by ``app.main.create_app``.
"""

import base64
import hashlib
import hmac
import logging
import urllib.parse
from functools import lru_cache
from io import BytesIO

import boto3
import qrcode
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from .config import Settings, get_settings

logger = logging.getLogger("careatlas.aws_auth")

router = APIRouter(prefix="/api/aws", tags=["AWS Cognito Auth"])


# ---------------------------------------------------------------------------
# Client + helpers
# ---------------------------------------------------------------------------


@lru_cache
def _client(region: str):
    """Cached cognito-idp client. Credentials come from the standard AWS chain
    (env vars / shared config / instance role)."""
    return boto3.client("cognito-idp", region_name=region)


def _require_cognito(settings: Settings) -> None:
    """Fail fast with a clear error if the pool is not configured."""
    missing = [
        name
        for name, value in (
            ("COGNITO_USER_POOL_ID", settings.cognito_user_pool_id),
            ("COGNITO_CLIENT_ID", settings.cognito_client_id),
            ("COGNITO_CLIENT_SECRET", settings.cognito_client_secret),
        )
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=503,
            detail=f"Cognito not configured; missing: {', '.join(missing)}",
        )


def _secret_hash(settings: Settings, username: str) -> str:
    """Cognito SecretHash = Base64(HMAC_SHA256(username + client_id, client_secret))."""
    message = username + (settings.cognito_client_id or "")
    digest = hmac.new(
        (settings.cognito_client_secret or "").encode("utf-8"),
        msg=message.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    return base64.b64encode(digest).decode()


def cognito_dep(settings: Settings = Depends(get_settings)):
    """Dependency that yields a ready cognito client + settings, or 503s."""
    _require_cognito(settings)
    return _client(settings.cognito_region), settings


def _auth_response(resp: dict):
    """Normalize Cognito auth/challenge responses for the frontend."""
    challenge = resp.get("ChallengeName")

    if not challenge:
        result = resp["AuthenticationResult"]
        return {
            "status": "AUTH_SUCCESS",
            "id_token": result["IdToken"],
            "access_token": result["AccessToken"],
            "refresh_token": result.get("RefreshToken"),
        }

    if challenge == "MFA_SETUP":
        return {"status": "MFA_SETUP_REQUIRED", "session": resp["Session"]}

    if challenge == "SOFTWARE_TOKEN_MFA":
        return {"status": "MFA_REQUIRED", "session": resp["Session"]}

    return {
        "status": "CHALLENGE",
        "challenge_name": challenge,
        "session": resp["Session"],
    }


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    username: EmailStr  # email is the username
    password: str


class NewPasswordChallengeRequest(BaseModel):
    session: str
    username: EmailStr
    new_password: str
    name: str | None = None


class MfaSetupStartRequest(BaseModel):
    session: str  # Session returned from /login when status == MFA_SETUP_REQUIRED
    username: EmailStr


class MfaSetupVerifyRequest(BaseModel):
    session: str
    username: EmailStr
    code: str  # 6-digit code from the authenticator app


class MfaPreferenceRequest(BaseModel):
    access_token: str


class LoginVerifyMfaRequest(BaseModel):
    session: str
    username: EmailStr
    code: str


class AccessTokenRequest(BaseModel):
    access_token: str


class ForgotPasswordRequest(BaseModel):
    username: EmailStr


class ResetPasswordRequest(BaseModel):
    username: EmailStr
    code: str  # code emailed by Cognito from /password/forgot
    new_password: str


class EmailSendCodeRequest(BaseModel):
    access_token: str


class EmailVerifyRequest(BaseModel):
    access_token: str
    code: str


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------


@router.post("/register")
def register(data: RegisterRequest, dep=Depends(cognito_dep)):
    """Sign the user up, admin-confirm them, and mark the email verified."""
    cognito, settings = dep
    try:
        resp = cognito.sign_up(
            ClientId=settings.cognito_client_id,
            SecretHash=_secret_hash(settings, data.email),
            Username=data.email,
            Password=data.password,
            UserAttributes=[
                {"Name": "email", "Value": data.email},
                {"Name": "name", "Value": data.name},
            ],
        )

        cognito.admin_confirm_sign_up(
            UserPoolId=settings.cognito_user_pool_id,
            Username=data.email,
        )
        cognito.admin_update_user_attributes(
            UserPoolId=settings.cognito_user_pool_id,
            Username=data.email,
            UserAttributes=[{"Name": "email_verified", "Value": "true"}],
        )

        return {"status": "SIGNUP_AND_CONFIRMED", "user_sub": resp["UserSub"]}
    except cognito.exceptions.UsernameExistsException:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    except cognito.exceptions.InvalidPasswordException as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


@router.post("/login")
def login(data: LoginRequest, dep=Depends(cognito_dep)):
    """USER_PASSWORD_AUTH. Returns tokens, or an MFA challenge to continue."""
    cognito, settings = dep
    try:
        resp = cognito.initiate_auth(
            ClientId=settings.cognito_client_id,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": data.username,
                "PASSWORD": data.password,
                "SECRET_HASH": _secret_hash(settings, data.username),
            },
        )

        return _auth_response(resp)
    except cognito.exceptions.NotAuthorizedException:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    except cognito.exceptions.UserNotConfirmedException:
        raise HTTPException(status_code=403, detail="User is not confirmed")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/login/new-password")
def complete_new_password_challenge(data: NewPasswordChallengeRequest, dep=Depends(cognito_dep)):
    """Complete Cognito NEW_PASSWORD_REQUIRED, then return tokens or next challenge."""
    cognito, settings = dep
    try:
        display_name = (data.name or "").strip() or str(data.username).split("@")[0]
        resp = cognito.respond_to_auth_challenge(
            ClientId=settings.cognito_client_id,
            ChallengeName="NEW_PASSWORD_REQUIRED",
            Session=data.session,
            ChallengeResponses={
                "USERNAME": data.username,
                "NEW_PASSWORD": data.new_password,
                "userAttributes.name": display_name,
                "SECRET_HASH": _secret_hash(settings, data.username),
            },
        )
        return _auth_response(resp)
    except cognito.exceptions.InvalidPasswordException as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except cognito.exceptions.NotAuthorizedException:
        raise HTTPException(status_code=401, detail="Invalid or expired password challenge")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


# ---------------------------------------------------------------------------
# MFA setup
# ---------------------------------------------------------------------------


@router.post("/mfa/setup/start")
def mfa_setup_start(data: MfaSetupStartRequest, dep=Depends(cognito_dep)):
    """Associate a software token and return the secret + a QR code to scan."""
    cognito, _ = dep
    try:
        resp = cognito.associate_software_token(Session=data.session)
        secret = resp["SecretCode"]
        new_session = resp["Session"]

        issuer = "CareAtlas"
        label = urllib.parse.quote(f"{issuer}:{data.username}")
        otpauth_url = (
            f"otpauth://totp/{label}?secret={secret}&issuer={issuer}"
            "&algorithm=SHA1&digits=6&period=30"
        )

        qr = qrcode.QRCode(box_size=10, border=4)
        qr.add_data(otpauth_url)
        qr.make(fit=True)
        buf = BytesIO()
        qr.make_image().save(buf, format="PNG")
        data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

        return {
            "status": "MFA_SETUP_TOKEN_CREATED",
            "secret": secret,
            "session": new_session,
            "otpauth_url": otpauth_url,
            "qr_image_data_url": data_url,
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/mfa/setup/verify")
def mfa_setup_verify(data: MfaSetupVerifyRequest, dep=Depends(cognito_dep)):
    """Verify the first authenticator code, finish setup, and return tokens."""
    cognito, settings = dep
    try:
        resp = cognito.verify_software_token(
            Session=data.session,
            UserCode=data.code,
            FriendlyDeviceName="AuthenticatorApp",
        )
        status = resp.get("Status")
        if status != "SUCCESS":
            raise HTTPException(status_code=400, detail=f"MFA verify failed: {status}")

        challenge_resp = cognito.respond_to_auth_challenge(
            ClientId=settings.cognito_client_id,
            ChallengeName="MFA_SETUP",
            Session=resp.get("Session"),
            ChallengeResponses={
                "USERNAME": data.username,
                "SECRET_HASH": _secret_hash(settings, data.username),
            },
        )
        result = challenge_resp.get("AuthenticationResult")
        if not result:
            raise HTTPException(status_code=400, detail="MFA setup completion failed")

        access_token = result["AccessToken"]
        cognito.set_user_mfa_preference(
            AccessToken=access_token,
            SoftwareTokenMfaSettings={"Enabled": True, "PreferredMfa": True},
        )

        return {
            "status": "AUTH_SUCCESS",
            "id_token": result["IdToken"],
            "access_token": access_token,
            "refresh_token": result.get("RefreshToken"),
        }
    except HTTPException:
        raise
    except cognito.exceptions.EnableSoftwareTokenMFAException as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/mfa/preference")
def set_mfa_preference(data: MfaPreferenceRequest, dep=Depends(cognito_dep)):
    """Make TOTP the user's preferred MFA (call after setup with an access token)."""
    cognito, _ = dep
    try:
        cognito.set_user_mfa_preference(
            AccessToken=data.access_token,
            SoftwareTokenMfaSettings={"Enabled": True, "PreferredMfa": True},
        )
        return {"status": "MFA_PREFERENCE_SET"}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


# ---------------------------------------------------------------------------
# Login with MFA
# ---------------------------------------------------------------------------


@router.post("/login/verify-mfa")
def login_verify_mfa(data: LoginVerifyMfaRequest, dep=Depends(cognito_dep)):
    """Complete the SOFTWARE_TOKEN_MFA challenge from /login and return tokens."""
    cognito, settings = dep
    try:
        resp = cognito.respond_to_auth_challenge(
            ClientId=settings.cognito_client_id,
            ChallengeName="SOFTWARE_TOKEN_MFA",
            Session=data.session,
            ChallengeResponses={
                "USERNAME": data.username,
                "SOFTWARE_TOKEN_MFA_CODE": data.code,
                "SECRET_HASH": _secret_hash(settings, data.username),
            },
        )

        result = resp.get("AuthenticationResult")
        if not result:
            raise HTTPException(status_code=400, detail="MFA verification failed")

        return {
            "status": "AUTH_SUCCESS",
            "id_token": result["IdToken"],
            "access_token": result["AccessToken"],
            "refresh_token": result.get("RefreshToken"),
        }
    except HTTPException:
        raise
    except cognito.exceptions.CodeMismatchException:
        raise HTTPException(status_code=401, detail="Invalid MFA code")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


# ---------------------------------------------------------------------------
# Reset / forgot password
# ---------------------------------------------------------------------------


@router.post("/password/forgot")
def forgot_password(data: ForgotPasswordRequest, dep=Depends(cognito_dep)):
    """Send a password-reset code to the user's email."""
    cognito, settings = dep
    try:
        resp = cognito.forgot_password(
            ClientId=settings.cognito_client_id,
            Username=data.username,
            SecretHash=_secret_hash(settings, data.username),
        )
        return {"status": "RESET_CODE_SENT", "delivery": resp.get("CodeDeliveryDetails", {})}
    except cognito.exceptions.UserNotFoundException:
        # Don't reveal whether the account exists.
        return {"status": "RESET_CODE_SENT", "delivery": {}}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/password/reset")
def reset_password(data: ResetPasswordRequest, dep=Depends(cognito_dep)):
    """Confirm the reset code and set a new password."""
    cognito, settings = dep
    try:
        cognito.confirm_forgot_password(
            ClientId=settings.cognito_client_id,
            Username=data.username,
            ConfirmationCode=data.code,
            Password=data.new_password,
            SecretHash=_secret_hash(settings, data.username),
        )
        return {"status": "PASSWORD_RESET_COMPLETE"}
    except cognito.exceptions.CodeMismatchException:
        raise HTTPException(status_code=400, detail="Invalid reset code")
    except cognito.exceptions.ExpiredCodeException:
        raise HTTPException(status_code=400, detail="Reset code has expired")
    except cognito.exceptions.InvalidPasswordException as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


# ---------------------------------------------------------------------------
# Validate token / current user
# ---------------------------------------------------------------------------


@router.post("/token/validate")
def validate_token(data: AccessTokenRequest, dep=Depends(cognito_dep)):
    """Validate an access token and return the user behind it."""
    cognito, _ = dep
    try:
        resp = cognito.get_user(AccessToken=data.access_token)
        return {
            "status": "VALID",
            "username": resp["Username"],
            "attributes": {a["Name"]: a["Value"] for a in resp["UserAttributes"]},
        }
    except cognito.exceptions.NotAuthorizedException:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


# ---------------------------------------------------------------------------
# Email verification (optional helpers; pool is auto-confirmed on register)
# ---------------------------------------------------------------------------


@router.post("/email/send-code")
def send_email_code(data: EmailSendCodeRequest, dep=Depends(cognito_dep)):
    """Send an email-verification code to the signed-in user."""
    cognito, _ = dep
    try:
        resp = cognito.get_user_attribute_verification_code(
            AccessToken=data.access_token,
            AttributeName="email",
        )
        return {"status": "CODE_SENT", "delivery": resp.get("CodeDeliveryDetails", {})}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/email/verify")
def verify_email(data: EmailVerifyRequest, dep=Depends(cognito_dep)):
    """Confirm the email-verification code."""
    cognito, _ = dep
    try:
        cognito.verify_user_attribute(
            AccessToken=data.access_token,
            AttributeName="email",
            Code=data.code,
        )
        return {"status": "EMAIL_VERIFIED"}
    except cognito.exceptions.CodeMismatchException:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))


# ---------------------------------------------------------------------------
# Logout (token invalidation — works for email/password users)
# ---------------------------------------------------------------------------


@router.post("/logout")
def logout(data: AccessTokenRequest, dep=Depends(cognito_dep)):
    """Global sign-out: invalidate the user's access + refresh tokens."""
    cognito, _ = dep
    try:
        cognito.global_sign_out(AccessToken=data.access_token)
        return {"status": "LOGOUT_SUCCESSFUL"}
    except cognito.exceptions.NotAuthorizedException:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))
