"""Microsoft Entra External ID Native Authentication API proxy."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .config import Settings, get_settings

logger = logging.getLogger("careatlas.entra")

router = APIRouter(prefix="/auth/entra", tags=["auth"])

SIGNUP_CHALLENGE_TYPES = "oob password redirect"
SIGNIN_CHALLENGE_TYPES = "password redirect"
SIGNIN_CAPABILITIES = "registration_required mfa_required"
SSPR_CHALLENGE_TYPES = "oob redirect"
FLOW_SUBERRORS = {"mfa_required", "registration_required"}


class EntraNativeAuthError(Exception):
    """Structured wrapper for upstream Entra errors."""

    def __init__(self, status_code: int, detail: dict[str, Any]) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail.get("error_description") or detail.get("error") or "Entra auth error")


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class SignupStartRequest(CamelModel):
    email: str
    password: str
    attributes: dict[str, Any] | None = None


class ContinuationRequest(CamelModel):
    continuation_token: str = Field(alias="continuationToken")


class CodeRequest(ContinuationRequest):
    code: str


class SigninStartRequest(CamelModel):
    email: str


class SigninPasswordRequest(ContinuationRequest):
    password: str


class MfaChallengeRequest(ContinuationRequest):
    method_id: str = Field(alias="methodId")


class MfaRegisterChallengeRequest(MfaChallengeRequest):
    challenge_target: Optional[str] = Field(default=None, alias="challengeTarget")
    challenge_channel: Optional[str] = Field(default=None, alias="challengeChannel")


class MfaRegisterVerifyRequest(ContinuationRequest):
    code: Optional[str] = None


class RefreshTokenRequest(CamelModel):
    refresh_token: str = Field(alias="refreshToken")


def _clean_payload(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict):
        return {str(key).strip(): value for key, value in payload.items()}
    return {"error": "entra_response_error", "error_description": str(payload)}


def _tokens_from(body: dict[str, Any]) -> dict[str, Any]:
    token_keys = ("token_type", "scope", "expires_in", "access_token", "refresh_token", "id_token")
    return {key: body[key] for key in token_keys if key in body}


def _camel_key(key: str) -> str:
    known_keys = {
        "access_token": "accessToken",
        "binding_method": "bindingMethod",
        "challenge_channel": "challengeChannel",
        "challenge_target": "challengeTarget",
        "challenge_target_label": "challengeTargetLabel",
        "challenge_type": "challengeType",
        "code_length": "codeLength",
        "continuation_token": "continuationToken",
        "correlation_id": "correlationId",
        "error_codes": "errorCodes",
        "error_description": "errorDescription",
        "expires_in": "expiresIn",
        "id_token": "idToken",
        "login_hint": "loginHint",
        "refresh_token": "refreshToken",
        "required_attributes": "requiredAttributes",
        "token_type": "tokenType",
        "trace_id": "traceId",
    }
    return known_keys.get(key, key)


def _to_camel(value: Any) -> Any:
    if isinstance(value, list):
        return [_to_camel(item) for item in value]
    if isinstance(value, dict):
        return {_camel_key(str(key).strip()): _to_camel(item) for key, item in value.items()}
    return value


def normalize_native_auth_response(body: dict[str, Any]) -> dict[str, Any]:
    """Return a stable API response while preserving useful Entra metadata."""

    body = _clean_payload(body)
    challenge_type = body.get("challenge_type")
    flow_marker = body.get("suberror") or body.get("error")

    if challenge_type == "redirect":
        return {"status": "redirect_required", **_to_camel(body)}

    if "access_token" in body or "id_token" in body:
        return {"status": "authenticated", "tokens": _to_camel(_tokens_from(body))}

    if flow_marker in FLOW_SUBERRORS:
        return {"status": flow_marker, **_to_camel(body)}

    return {"status": "next_step", **_to_camel(body)}


class EntraNativeAuthClient:
    def __init__(
        self,
        settings: Settings,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.settings = settings
        self._http_client = http_client

    async def signup_start(
        self,
        email: str,
        password: str,
        attributes: dict[str, Any] | None,
    ) -> dict[str, Any]:
        data: dict[str, Any] = {
            "client_id": self.settings.entra_app_id,
            "challenge_type": SIGNUP_CHALLENGE_TYPES,
            "capabilities": SIGNIN_CAPABILITIES,
            "username": email,
            "password": password,
        }
        if attributes:
            data["attributes"] = json.dumps(attributes, separators=(",", ":"))
        return await self._post("/signup/v1.0/start", data)

    async def signup_challenge(self, continuation_token: str) -> dict[str, Any]:
        return await self._post(
            "/signup/v1.0/challenge",
            {
                "client_id": self.settings.entra_app_id,
                "challenge_type": SIGNUP_CHALLENGE_TYPES,
                "continuation_token": continuation_token,
            },
        )

    async def signup_verify(self, continuation_token: str, code: str) -> dict[str, Any]:
        return await self._post(
            "/signup/v1.0/continue",
            {
                "client_id": self.settings.entra_app_id,
                "continuation_token": continuation_token,
                "grant_type": "oob",
                "oob": code,
            },
        )

    async def signin_start(self, email: str) -> dict[str, Any]:
        return await self._post(
            "/oauth2/v2.0/initiate",
            {
                "client_id": self.settings.entra_app_id,
                "challenge_type": SIGNIN_CHALLENGE_TYPES,
                "capabilities": SIGNIN_CAPABILITIES,
                "username": email,
            },
        )

    async def signin_password(self, continuation_token: str, password: str) -> dict[str, Any]:
        challenge = await self._post(
            "/oauth2/v2.0/challenge",
            {
                "client_id": self.settings.entra_app_id,
                "challenge_type": SIGNIN_CHALLENGE_TYPES,
                "continuation_token": continuation_token,
            },
        )
        if challenge.get("challenge_type") == "redirect":
            return challenge

        return await self._post(
            "/oauth2/v2.0/token",
            {
                "client_id": self.settings.entra_app_id,
                "continuation_token": challenge.get("continuation_token", continuation_token),
                "grant_type": "password",
                "password": password,
                "scope": self.settings.entra_scopes,
            },
        )

    async def signin_mfa_methods(self, continuation_token: str) -> dict[str, Any]:
        return await self._post(
            "/oauth2/v2.0/introspect",
            {
                "client_id": self.settings.entra_app_id,
                "continuation_token": continuation_token,
            },
        )

    async def signin_mfa_challenge(self, continuation_token: str, method_id: str) -> dict[str, Any]:
        return await self._post(
            "/oauth2/v2.0/challenge",
            {
                "client_id": self.settings.entra_app_id,
                "continuation_token": continuation_token,
                "id": method_id,
            },
        )

    async def signin_mfa_verify(self, continuation_token: str, code: str) -> dict[str, Any]:
        return await self._post(
            "/oauth2/v2.0/token",
            {
                "client_id": self.settings.entra_app_id,
                "continuation_token": continuation_token,
                "grant_type": "mfa_oob",
                "oob": code,
                "scope": self.settings.entra_scopes,
            },
        )

    async def register_methods(self, continuation_token: str) -> dict[str, Any]:
        return await self._post(
            "/register/v1.0/introspect",
            {
                "client_id": self.settings.entra_app_id,
                "continuation_token": continuation_token,
            },
        )

    async def register_challenge(
        self,
        continuation_token: str,
        method_id: str,
        challenge_target: str | None,
        challenge_channel: str | None,
    ) -> dict[str, Any]:
        data: dict[str, Any] = {
            "client_id": self.settings.entra_app_id,
            "continuation_token": continuation_token,
            "challenge_type": "oob",
        }
        if challenge_target:
            data["challenge_target"] = challenge_target
        if challenge_channel:
            data["challenge_channel"] = challenge_channel
        elif method_id in {"email", "sms"}:
            data["challenge_channel"] = method_id
        return await self._post("/register/v1.0/challenge", data)

    async def register_verify(self, continuation_token: str, code: str | None) -> dict[str, Any]:
        data = {
            "client_id": self.settings.entra_app_id,
            "continuation_token": continuation_token,
            "grant_type": "oob" if code else "continuation_token",
        }
        if code:
            data["oob"] = code
        return await self._post("/register/v1.0/continue", data)

    async def token_continue(self, continuation_token: str) -> dict[str, Any]:
        return await self._post(
            "/oauth2/v2.0/token",
            {
                "client_id": self.settings.entra_app_id,
                "continuation_token": continuation_token,
                "grant_type": "continuation_token",
                "scope": self.settings.entra_scopes,
            },
        )

    async def token_refresh(self, refresh_token: str) -> dict[str, Any]:
        return await self._post(
            "/oauth2/v2.0/token",
            {
                "client_id": self.settings.entra_app_id,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "scope": self.settings.entra_scopes,
            },
        )

    async def _post(self, path: str, data: dict[str, Any]) -> dict[str, Any]:
        if self._http_client:
            return await self._send(self._http_client, path, data)

        async with httpx.AsyncClient(timeout=self.settings.request_timeout) as client:
            return await self._send(client, path, data)

    async def _send(
        self,
        client: httpx.AsyncClient,
        path: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            response = await client.post(
                f"{self.settings.entra_base_url}{path}",
                data={key: value for key, value in data.items() if value is not None},
                headers={"Accept": "application/json"},
            )
        except httpx.HTTPError as exc:
            raise EntraNativeAuthError(
                502,
                {
                    "error": "entra_unreachable",
                    "error_description": str(exc),
                },
            ) from exc

        try:
            body = _clean_payload(response.json())
        except ValueError as exc:
            raise EntraNativeAuthError(
                502,
                {
                    "error": "entra_response_error",
                    "error_description": "Microsoft Entra returned a non-JSON response.",
                },
            ) from exc

        flow_marker = body.get("suberror") or body.get("error")
        if response.is_error and flow_marker not in FLOW_SUBERRORS:
            raise EntraNativeAuthError(response.status_code, body)

        return body


def _client(settings: Settings) -> EntraNativeAuthClient:
    return EntraNativeAuthClient(settings)


async def _call(client: EntraNativeAuthClient, action: str, *args: Any) -> dict[str, Any]:
    try:
        result = await getattr(client, action)(*args)
    except EntraNativeAuthError as exc:
        logger.warning("Entra %s failed (%s): %s", action, exc.status_code, exc.detail)
        raise HTTPException(status_code=exc.status_code, detail=_to_camel(exc.detail)) from exc
    return normalize_native_auth_response(result)


@router.get("/config")
async def entra_config(settings: Settings = Depends(get_settings)) -> dict[str, Any]:
    return {
        "appId": settings.entra_app_id,
        "tenantId": settings.entra_tenant_id,
        "tenantSubdomain": settings.entra_tenant_subdomain,
        "tenantDomain": settings.entra_domain,
        "authorityUrl": settings.entra_authority_url,
        "scopes": settings.entra_scopes.split(),
    }


@router.post("/signup/start")
async def signup_start(
    body: SignupStartRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(_client(settings), "signup_start", body.email, body.password, body.attributes)


@router.post("/signup/challenge")
async def signup_challenge(
    body: ContinuationRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(_client(settings), "signup_challenge", body.continuation_token)


@router.post("/signup/verify")
async def signup_verify(
    body: CodeRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(_client(settings), "signup_verify", body.continuation_token, body.code)


@router.post("/signin/start")
async def signin_start(
    body: SigninStartRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(_client(settings), "signin_start", body.email)


@router.post("/signin/password")
async def signin_password(
    body: SigninPasswordRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(_client(settings), "signin_password", body.continuation_token, body.password)


@router.post("/signin/mfa/methods")
async def signin_mfa_methods(
    body: ContinuationRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(_client(settings), "signin_mfa_methods", body.continuation_token)


@router.post("/signin/mfa/challenge")
async def signin_mfa_challenge(
    body: MfaChallengeRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(_client(settings), "signin_mfa_challenge", body.continuation_token, body.method_id)


@router.post("/signin/mfa/verify")
async def signin_mfa_verify(
    body: CodeRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(_client(settings), "signin_mfa_verify", body.continuation_token, body.code)


@router.post("/mfa/register/methods")
async def mfa_register_methods(
    body: ContinuationRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(_client(settings), "register_methods", body.continuation_token)


@router.post("/mfa/register/challenge")
async def mfa_register_challenge(
    body: MfaRegisterChallengeRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(
        _client(settings),
        "register_challenge",
        body.continuation_token,
        body.method_id,
        body.challenge_target,
        body.challenge_channel,
    )


@router.post("/mfa/register/verify")
async def mfa_register_verify(
    body: MfaRegisterVerifyRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(_client(settings), "register_verify", body.continuation_token, body.code)


@router.post("/token/continue")
async def token_continue(
    body: ContinuationRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(_client(settings), "token_continue", body.continuation_token)


@router.post("/token/refresh")
async def token_refresh(
    body: RefreshTokenRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    return await _call(_client(settings), "token_refresh", body.refresh_token)
