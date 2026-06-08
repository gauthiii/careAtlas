"""ServiceNow AI Control Tower client.

Owns every call out to ServiceNow: the AI agent inventory (`sn_aia_agent`) and
user-credential validation (`sys_user`). This is the server-side home of the
logic that used to live in the frontend `serviceNow.ts` plus the Vite proxy.
"""

import logging
import time
from dataclasses import dataclass
from typing import Any, Literal, NoReturn
from uuid import uuid4

import httpx

from .config import Settings
from .models import (
    AISystem,
    AclTestCheck,
    AclTestResponse,
    PatientRegistrationRequest,
    PatientRegistrationResponse,
)

logger = logging.getLogger("careatlas.servicenow")

_A2A_TOKEN_CACHE: dict[str, tuple[str, float]] = {}

# Fields pulled from sn_aia_agent for the AI Agent inventory view.
AGENT_FIELDS = [
    "sys_id",
    "name",
    "internal_name",
    "agent_type",
    "strategy",
    "role",
    "description",
    "proficiency",
    "instructions",
    "condition",
]


@dataclass(frozen=True)
class AclProbe:
    label: str
    expected: Literal["allowed", "denied"]
    table: str
    fields: tuple[str, ...]
    inspect_denied_fields: bool = False


ACL_TEST_PROBES: dict[str, tuple[AclProbe, AclProbe]] = {
    "svc-identity-verification-agent": (
        AclProbe(
            label="Allowed patient identity fields",
            expected="allowed",
            table="u_patient",
            fields=("sys_id", "u_registration_status", "u_confidence_score"),
        ),
        AclProbe(
            label="Denied appointment table",
            expected="denied",
            table="u_appointment",
            fields=("sys_id",),
        ),
    ),
    "svc-scheduling-agent": (
        AclProbe(
            label="Allowed patient scheduling fields",
            expected="allowed",
            table="u_patient",
            fields=(
                "sys_id",
                "u_patient_id",
                "u_health_condition",
                "u_accessibility",
                "u_time_preference",
                "u_account_status",
            ),
        ),
        AclProbe(
            label="Denied patient PII fields",
            expected="denied",
            table="u_patient",
            fields=(
                "u_first_name",
                "u_last_name",
                "u_email",
                "u_phone",
                "u_date_of_birth",
                "u_gender",
                "u_ethnicity",
            ),
            inspect_denied_fields=True,
        ),
    ),
    "svc-reminder-agent": (
        AclProbe(
            label="Allowed appointment table",
            expected="allowed",
            table="u_appointment",
            fields=("sys_id",),
        ),
        AclProbe(
            label="Denied patient table",
            expected="denied",
            table="u_patient",
            fields=("sys_id",),
        ),
    ),
    "svc-notes-agent": (
        AclProbe(
            label="Allowed appointment notes fields",
            expected="allowed",
            table="u_appointment",
            fields=("sys_id", "u_notes"),
        ),
        AclProbe(
            label="Denied patient PII fields",
            expected="denied",
            table="u_patient",
            fields=(
                "u_first_name",
                "u_last_name",
                "u_email",
                "u_phone",
                "u_date_of_birth",
            ),
            inspect_denied_fields=True,
        ),
    ),
    "svc-triage-agent": (
        AclProbe(
            label="Allowed patient triage fields",
            expected="allowed",
            table="u_patient",
            fields=("sys_id", "u_reason_text", "u_health_condition"),
        ),
        AclProbe(
            label="Denied patient PII fields",
            expected="denied",
            table="u_patient",
            fields=(
                "u_first_name",
                "u_last_name",
                "u_email",
                "u_phone",
                "u_date_of_birth",
            ),
            inspect_denied_fields=True,
        ),
    ),
}


class ServiceNowError(RuntimeError):
    """Raised when ServiceNow returns a non-OK response we can't recover from."""


@dataclass
class AgentExecutionResult:
    request_id: str
    output: str
    context_id: str | None = None
    task_id: str | None = None
    state: str | None = None
    status: str = "completed"


REQUIRED_PATIENT_FIELDS = (
    "u_first_name",
    "u_last_name",
    "u_date_of_birth",
    "u_gender",
    "u_ethnicity",
    "u_primary_language",
    "u_phone",
    "u_email",
    "u_address_line1",
    "u_city",
    "u_postcode",
    "u_health_condition",
    "u_accessibility",
    "u_emergency_name",
    "u_emergency_phone",
    "u_emergency_relationship",
    "u_username",
)


def _display_val(field: Any) -> str:
    """ServiceNow returns reference fields as {value, display_value} when
    sysparm_display_value=true, and plain fields as strings. Normalize both."""
    if isinstance(field, dict):
        return field.get("display_value") or ""
    return field or ""


def _error_detail(response: httpx.Response) -> str:
    detail = response.reason_phrase
    try:
        body = response.json()
        error = body.get("error", {}) if isinstance(body, dict) else {}
        message = error.get("message")
        extra = error.get("detail")
        joined = ": ".join(part for part in (message, extra) if part)
        detail = joined or str(body)
    except Exception:  # noqa: BLE001 - keep the status text on non-JSON bodies
        pass
    return f"ServiceNow {response.status_code}: {detail}"


def _raise_snow_error(response: httpx.Response) -> NoReturn:
    """Log the failing request (method, URL, status, detail) and raise."""
    detail = _error_detail(response)
    logger.error(
        "ServiceNow request failed: %s %s -> %s",
        response.request.method,
        response.request.url,
        detail,
    )
    raise ServiceNowError(detail)


def _a2a_auth_configured(settings: Settings) -> bool:
    return bool(settings.snow_a2a_client_id and settings.snow_a2a_client_secret)


def _a2a_token_cache_key(settings: Settings) -> str:
    return f"{settings.snow_base_url}:{settings.snow_a2a_client_id or ''}"


async def _fetch_a2a_access_token(settings: Settings, client: httpx.AsyncClient) -> str:
    if not _a2a_auth_configured(settings):
        raise ServiceNowError(
            "ServiceNow A2A OAuth is not configured. Set SNOW_A2A_CLIENT_ID and "
            "SNOW_A2A_CLIENT_SECRET in server/.env."
        )

    response = await client.post(
        f"{settings.snow_base_url}/oauth_token.do",
        data={
            "grant_type": "client_credentials",
            "client_id": settings.snow_a2a_client_id,
            "client_secret": settings.snow_a2a_client_secret,
        },
        headers={"Accept": "application/json"},
    )

    if not response.is_success:
        detail = _error_detail(response)
        logger.error(
            "ServiceNow A2A OAuth failed: %s %s -> %s",
            response.request.method,
            response.request.url,
            detail,
        )
        raise ServiceNowError(f"ServiceNow A2A OAuth failed: {detail}")

    try:
        body = response.json()
    except ValueError as exc:
        raise ServiceNowError("ServiceNow A2A OAuth failed: invalid JSON response") from exc

    token = body.get("access_token") if isinstance(body, dict) else None
    if not token:
        raise ServiceNowError("ServiceNow A2A OAuth failed: access_token missing")

    expires_in = body.get("expires_in", 0) if isinstance(body, dict) else 0
    try:
        expires_at = time.time() + max(float(expires_in) - settings.snow_a2a_token_skew_seconds, 0)
    except (TypeError, ValueError):
        expires_at = time.time()

    _A2A_TOKEN_CACHE[_a2a_token_cache_key(settings)] = (str(token), expires_at)
    return str(token)


async def _get_a2a_access_token(
    settings: Settings,
    client: httpx.AsyncClient,
) -> str:
    cache_key = _a2a_token_cache_key(settings)
    cached = _A2A_TOKEN_CACHE.get(cache_key)
    if cached and cached[1] > time.time():
        return cached[0]
    return await _fetch_a2a_access_token(settings, client)


def _map_agent(record: dict[str, Any]) -> AISystem:
    return AISystem(
        sys_id=_display_val(record.get("sys_id")),
        name=_display_val(record.get("name")),
        display_name=_display_val(record.get("internal_name")),
        agent_type=_display_val(record.get("agent_type")),
        strategy=_display_val(record.get("strategy")),
        role=_display_val(record.get("role")),
        description=_display_val(record.get("description")),
        proficiency=_display_val(record.get("proficiency")),
        instructions=_display_val(record.get("instructions")),
        condition=_display_val(record.get("condition")),
    )


async def fetch_agents(settings: Settings) -> list[AISystem]:
    """Return all agents created on/after the configured date, newest first."""
    params = {
        "sysparm_query": (
            f"sys_created_on>={settings.agents_created_since}^ORDERBYDESCsys_created_on"
        ),
        "sysparm_fields": ",".join(AGENT_FIELDS),
        "sysparm_display_value": "true",
    }

    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        response = await client.get(
            f"{settings.snow_base_url}/api/now/table/sn_aia_agent",
            params=params,
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )

    if not response.is_success:
        _raise_snow_error(response)

    result = response.json().get("result", [])
    return [_map_agent(record) for record in result]


async def create_patient_registration(
    settings: Settings,
    registration: PatientRegistrationRequest,
    http_client: httpx.AsyncClient | None = None,
) -> PatientRegistrationResponse:
    """Create a patient record in ServiceNow's u_patient table."""
    payload = _patient_registration_payload(registration)

    async def run(client: httpx.AsyncClient) -> httpx.Response:
        return await client.post(
            f"{settings.snow_base_url}/api/now/table/u_patient",
            json=payload,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            auth=(settings.snow_username, settings.snow_password),
        )

    if http_client is not None:
        response = await run(http_client)
    else:
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            response = await run(client)

    if not response.is_success:
        _raise_snow_error(response)

    try:
        body = response.json()
    except ValueError as exc:
        raise ServiceNowError("ServiceNow patient registration failed: invalid JSON response") from exc

    result = body.get("result") if isinstance(body, dict) else None
    if not isinstance(result, dict):
        raise ServiceNowError("ServiceNow patient registration response did not include a result object")

    return PatientRegistrationResponse(
        message="Patient registration created in ServiceNow.",
        sys_id=_display_val(result.get("sys_id")),
        patient_id=_display_val(result.get("u_patient_id")),
        first_name=_display_val(result.get("u_first_name")),
        last_name=_display_val(result.get("u_last_name")),
        email=_display_val(result.get("u_email")),
        registration_status=_display_val(result.get("u_registration_status")),
    )


def _patient_registration_payload(registration: PatientRegistrationRequest) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "u_first_name": registration.first_name,
        "u_last_name": registration.last_name,
        "u_date_of_birth": registration.date_of_birth,
        "u_gender": _normalize_simple_choice(registration.gender),
        "u_ethnicity": _normalize_ethnicity(registration.ethnicity),
        "u_primary_language": registration.primary_language,
        "u_phone": registration.phone,
        "u_email": registration.email,
        "u_address_line1": registration.address_line1,
        "u_city": registration.city,
        "u_postcode": registration.postcode,
        "u_health_condition": _normalize_health_condition(registration.health_condition),
        "u_accessibility": _normalize_yes_no(registration.accessibility),
        "u_emergency_name": registration.emergency_name,
        "u_emergency_phone": registration.emergency_phone,
        "u_emergency_relationship": registration.emergency_relationship,
        "u_username": registration.username,
        "u_registration_status": "pending",
        "u_account_status": "active",
        "u_email_verified": "false",
        "u_profile_complete": str(_has_complete_patient_profile(registration)).lower(),
        "u_consent_accepted": str(registration.consent_accepted).lower(),
        "u_privacy_notice_version": "v1",
        "u_confidence_score": "100",
    }
    if registration.address_line2:
        payload["u_address_line2"] = registration.address_line2
    if registration.insurance_id:
        payload["u_insurance_id"] = registration.insurance_id
    return payload


def _normalize_simple_choice(value: str) -> str:
    return value.strip().lower()


def _normalize_ethnicity(value: str) -> str:
    normalized = _normalize_simple_choice(value)
    if normalized == "black or black british":
        return "black"
    if normalized == "prefer not to say":
        return "prefer_not_to_say"
    return normalized


def _normalize_health_condition(value: str) -> str:
    normalized = _normalize_simple_choice(value)
    aliases = {
        "chronic condition": "chronic",
        "mental health": "mental_health",
        "preventative care": "preventative",
    }
    return aliases.get(normalized, normalized)


def _normalize_yes_no(value: str) -> str:
    normalized = _normalize_simple_choice(value)
    if normalized in {"yes", "true", "1"}:
        return "true"
    if normalized in {"no", "false", "0"}:
        return "false"
    return normalized


def _has_complete_patient_profile(registration: PatientRegistrationRequest) -> bool:
    patient_payload = {
        "u_first_name": registration.first_name,
        "u_last_name": registration.last_name,
        "u_date_of_birth": registration.date_of_birth,
        "u_gender": registration.gender,
        "u_ethnicity": registration.ethnicity,
        "u_primary_language": registration.primary_language,
        "u_phone": registration.phone,
        "u_email": registration.email,
        "u_address_line1": registration.address_line1,
        "u_city": registration.city,
        "u_postcode": registration.postcode,
        "u_health_condition": registration.health_condition,
        "u_accessibility": registration.accessibility,
        "u_emergency_name": registration.emergency_name,
        "u_emergency_phone": registration.emergency_phone,
        "u_emergency_relationship": registration.emergency_relationship,
        "u_username": registration.username,
    }
    return all(str(patient_payload.get(field) or "").strip() for field in REQUIRED_PATIENT_FIELDS)


async def test_service_account_acl(
    settings: Settings,
    service_account: str,
    http_client: httpx.AsyncClient | None = None,
) -> AclTestResponse:
    """Run read-only ServiceNow ACL probes as one known service account."""
    username = service_account.strip()
    probes = ACL_TEST_PROBES.get(username)
    if probes is None:
        raise ValueError(f"Unknown service account: {service_account}")

    async def run(client: httpx.AsyncClient) -> list[AclTestCheck]:
        checks = []
        for probe in probes:
            checks.append(await _run_acl_probe(settings, client, username, probe))
        return checks

    if http_client is not None:
        checks = await run(http_client)
    else:
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            checks = await run(client)

    return AclTestResponse(
        service_account=username,
        overall_status=_acl_overall_status(checks),
        checks=checks,
    )


async def _run_acl_probe(
    settings: Settings,
    client: httpx.AsyncClient,
    username: str,
    probe: AclProbe,
) -> AclTestCheck:
    params = {
        "sysparm_fields": ",".join(probe.fields),
        "sysparm_display_value": "true",
        "sysparm_limit": "1",
    }
    response = await client.get(
        f"{settings.snow_base_url}/api/now/table/{probe.table}",
        params=params,
        headers={"Accept": "application/json"},
        auth=(username, settings.snow_password),
    )

    if response.status_code in (401, 403):
        return _acl_check(
            probe,
            actual="denied",
            status_code=response.status_code,
            detail=f"ServiceNow returned HTTP {response.status_code}.",
        )

    if not response.is_success:
        return _acl_check(
            probe,
            actual="error",
            status_code=response.status_code,
            detail=_error_detail(response),
        )

    if probe.expected == "denied" and probe.inspect_denied_fields:
        return _inspect_denied_field_response(probe, response)

    return _acl_check(
        probe,
        actual="allowed",
        status_code=response.status_code,
        detail=f"ServiceNow returned HTTP {response.status_code}.",
    )


def _inspect_denied_field_response(probe: AclProbe, response: httpx.Response) -> AclTestCheck:
    try:
        body = response.json()
    except ValueError:
        return _acl_check(
            probe,
            actual="error",
            status_code=response.status_code,
            detail="ServiceNow returned invalid JSON.",
        )

    records = body.get("result") if isinstance(body, dict) else None
    if not isinstance(records, list):
        return _acl_check(
            probe,
            actual="error",
            status_code=response.status_code,
            detail="ServiceNow response did not include a result list.",
        )
    if not records:
        return _acl_check(
            probe,
            actual="inconclusive",
            status_code=response.status_code,
            detail="No records returned to inspect field-level ACL behavior.",
        )

    record = records[0] if isinstance(records[0], dict) else {}
    visible_fields = [field for field in probe.fields if field in record]
    if visible_fields:
        return _acl_check(
            probe,
            actual="allowed",
            status_code=response.status_code,
            detail=f"Visible denied fields: {', '.join(visible_fields)}.",
        )

    return _acl_check(
        probe,
        actual="denied",
        status_code=response.status_code,
        detail="Requested denied fields were not present in the returned record.",
    )


def _acl_check(
    probe: AclProbe,
    actual: Literal["allowed", "denied", "inconclusive", "error"],
    status_code: int | None,
    detail: str,
) -> AclTestCheck:
    return AclTestCheck(
        label=probe.label,
        expected=probe.expected,
        actual=actual,
        passed=actual == probe.expected,
        table=probe.table,
        fields=list(probe.fields),
        status_code=status_code,
        detail=detail,
    )


def _acl_overall_status(
    checks: list[AclTestCheck],
) -> Literal["passed", "failed", "inconclusive", "error"]:
    actuals = {check.actual for check in checks}
    if "error" in actuals:
        return "error"
    if "inconclusive" in actuals:
        return "inconclusive"
    if all(check.passed for check in checks):
        return "passed"
    return "failed"


async def execute_agent(
    settings: Settings,
    agent_sys_id: str,
    user_input: str,
    context_id: str | None = None,
    task_id: str | None = None,
    http_client: httpx.AsyncClient | None = None,
) -> AgentExecutionResult:
    """Submit a Zurich ServiceNow AI agent through asynchronous A2A."""
    logger.info("Executing ServiceNow A2A agent %s", agent_sys_id)
    if not settings.a2a_callback_base_url or not settings.a2a_callback_token:
        raise ServiceNowError(
            "ServiceNow A2A callbacks are not configured. Set A2A_CALLBACK_BASE_URL "
            "and A2A_CALLBACK_TOKEN in server/.env."
        )

    request_id = str(uuid4())
    message_id = str(uuid4())
    message = {
        "kind": "message",
        "role": "user",
        "messageId": message_id,
        "parts": [{"kind": "text", "text": user_input}],
    }
    if context_id:
        message["contextId"] = context_id
    if task_id:
        message["taskId"] = task_id

    payload = {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": "message/send",
        "params": {
            "configuration": {
                "acceptedOutputModes": ["application/json"],
                "blocking": False,
                "returnImmediately": True,
                "return_immediately": True,
                "historyLength": 0,
                "pushNotificationConfig": {
                    "url": settings.a2a_callback_url(agent_sys_id),
                    "token": settings.a2a_callback_token,
                    "authentication": {"schemes": ["Bearer"]},
                },
            },
            "message": message,
            "metadata": {},
        },
    }

    async def run(client: httpx.AsyncClient) -> httpx.Response:
        token = await _get_a2a_access_token(settings, client)
        return await client.post(
            f"{settings.snow_base_url}/api/sn_aia/a2a/v2/agent/id/{agent_sys_id}",
            json=payload,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

    if http_client is not None:
        response = await run(http_client)
    else:
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            response = await run(client)

    if not response.is_success:
        detail = _error_detail(response)
        if response.status_code in (401, 403):
            detail = (
                f"{detail}. Check A2A OAuth scope/client credentials, AI Agent Studio "
                "third-party access/discoverability, and agent ACL/user access."
            )
        logger.error(
            "ServiceNow A2A execution failed for agent %s: %s %s -> %s",
            agent_sys_id,
            response.request.method,
            response.request.url,
            detail,
        )
        raise ServiceNowError(detail)

    try:
        body = response.json()
    except ValueError as exc:
        raise ServiceNowError("ServiceNow A2A execution failed: invalid JSON response") from exc

    if isinstance(body, dict) and isinstance(body.get("error"), dict):
        error = body["error"]
        message = error.get("message") or "Unknown JSON-RPC error"
        code = error.get("code")
        code_part = f" {code}" if code is not None else ""
        raise ServiceNowError(f"ServiceNow A2A JSON-RPC error{code_part}: {message}")

    output = _extract_a2a_text(body)
    context_id = _extract_a2a_context_id(body) or context_id
    task_id = _extract_a2a_task_id(body) or task_id
    state = _extract_a2a_state(body)
    if output:
        return AgentExecutionResult(
            request_id=request_id,
            output=output,
            context_id=context_id,
            task_id=task_id,
            state=state,
            status="completed",
        )

    return AgentExecutionResult(
        request_id=request_id,
        output="",
        context_id=context_id,
        task_id=task_id,
        state=state or "submitted",
        status="pending",
    )


def _part_texts(node: Any) -> list[str]:
    if not isinstance(node, dict):
        return []

    parts = node.get("parts")
    if not isinstance(parts, list):
        return []

    texts = []
    for part in parts:
        if isinstance(part, dict) and part.get("kind") == "text":
            text = str(part.get("text") or "").strip()
            if text:
                texts.append(text)
    return texts


def _extract_a2a_text(body: Any) -> str:
    """Extract the human-visible text from common Zurich A2A response shapes."""
    roots = [body]
    if isinstance(body, dict) and isinstance(body.get("content"), dict):
        roots.append(body["content"])

    texts: list[str] = []
    for root in roots:
        if not isinstance(root, dict):
            continue

        result = root.get("result")
        if isinstance(result, str) and result.strip():
            texts.append(result.strip())
            continue
        if not isinstance(result, dict):
            continue

        status = result.get("status")
        if isinstance(status, dict):
            texts.extend(_part_texts(status.get("message")))

        texts.extend(_part_texts(result.get("message")))

        artifacts = result.get("artifacts")
        if isinstance(artifacts, list):
            for artifact in artifacts:
                texts.extend(_part_texts(artifact))

    return "\n\n".join(texts)


def _a2a_results(body: Any) -> list[dict[str, Any]]:
    roots = [body]
    if isinstance(body, dict) and isinstance(body.get("content"), dict):
        roots.append(body["content"])

    results = []
    for root in roots:
        if isinstance(root, dict) and isinstance(root.get("result"), dict):
            results.append(root["result"])
    return results


def _extract_a2a_context_id(body: Any) -> str | None:
    for result in _a2a_results(body):
        value = result.get("contextId")
        if value:
            return str(value)
    return None


def _extract_a2a_task_id(body: Any) -> str | None:
    for result in _a2a_results(body):
        value = result.get("taskId") or result.get("id")
        if value:
            return str(value)
    return None


def _extract_a2a_state(body: Any) -> str | None:
    for result in _a2a_results(body):
        status = result.get("status")
        if isinstance(status, dict) and status.get("state"):
            return str(status["state"])
    return None


async def validate_user(settings: Settings, username: str, password: str) -> bool:
    """Validate credentials against ServiceNow sys_user using Basic Auth as that user."""
    username = username.strip()
    if not username or not password:
        return False

    params = {
        "sysparm_query": f"user_name={username}^active=true",
        "sysparm_fields": "sys_id,user_name,name,active",
        "sysparm_display_value": "true",
        "sysparm_limit": "1",
    }

    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        response = await client.get(
            f"{settings.snow_base_url}/api/now/table/sys_user",
            params=params,
            headers={"Accept": "application/json"},
            auth=(username, password),
        )

    if response.status_code in (401, 403):
        return False

    if not response.is_success:
        _raise_snow_error(response)

    return len(response.json().get("result", [])) > 0
