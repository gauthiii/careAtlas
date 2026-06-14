"""ServiceNow AI Control Tower client.

Owns every call out to ServiceNow: the AI agent inventory (`sn_aia_agent`) and
user-credential validation (`sys_user`). This is the server-side home of the
logic that used to live in the frontend `serviceNow.ts` plus the Vite proxy.
"""

import logging
import time
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Literal, NoReturn
from uuid import uuid4

import httpx

from .config import Settings
from .models import (
    AIAsset,
    AISystem,
    AclTestCheck,
    AclTestResponse,
    AiDecisionLogEntry,
    BookingAppointment,
    BookingAppointmentRequest,
    BookingAvailabilityResponse,
    BookingCalendarDay,
    BookingDoctor,
    PatientProfileResponse,
    PatientRegistrationRequest,
    PatientRegistrationResponse,
    PatientRegistrationSummary,
)

logger = logging.getLogger("careatlas.servicenow")

_A2A_TOKEN_CACHE: dict[str, tuple[str, float]] = {}

# Fields pulled from alm_ai_system_digital_asset for the managed/unmanaged AI asset tables.
ASSET_FIELDS = [
    "sys_id",
    "display_name",
    "vendor",
    "managed_by",
    "life_cycle_stage",
    "install_status",
    "life_cycle_stage_status",
    "sys_created_on",
]

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

DOCTOR_FIELDS = [
    "sys_id",
    "u_doctor_id",
    "u_first_name",
    "u_last_name",
    "u_department",
    "u_speciality",
    "u_email",
    "u_active",
]

APPOINTMENT_FIELDS = [
    "sys_id",
    "u_appointment_id",
    "u_doctor",
    "u_patient",
    "u_appointment_date",
    "u_appointment_time",
    "u_status",
    "u_reason_category",
    "u_reason_text",
    "u_triage_priority",
]

BOOKING_AVAILABILITY_MAX_DAYS = 211

PATIENT_PROFILE_FIELDS = [
    "sys_id",
    "sys_created_on",
    "sys_updated_on",
    "u_patient_id",
    "u_first_name",
    "u_last_name",
    "u_date_of_birth",
    "u_gender",
    "u_ethnicity",
    "u_primary_language",
    "u_phone",
    "u_email",
    "u_address_line1",
    "u_address_line2",
    "u_city",
    "u_postcode",
    "u_state",
    "u_region",
    "u_country",
    "u_health_condition",
    "u_accessibility",
    "u_insurance_id",
    "u_insurance_provider",
    "u_emergency_name",
    "u_emergency_phone",
    "u_emergency_relationship",
    "u_username",
    "u_registration_status",
    "u_account_status",
    "u_email_verified",
    "u_profile_complete",
    "u_confidence_score",
    "u_consent_accepted",
    "u_privacy_notice_version",
    "u_time_preference",
    "u_blood_type",
    "u_known_allergies",
]


# Fields pulled from u_patient for the staff intake / registration approval queue.
REGISTRATION_SUMMARY_FIELDS = [
    "sys_id",
    "sys_created_on",
    "u_patient_id",
    "u_first_name",
    "u_last_name",
    "u_email",
    "u_phone",
    "u_health_condition",
    "u_registration_status",
    "u_account_status",
    "u_confidence_score",
    "u_profile_complete",
]

# Fields pulled from u_ai_decision_log for the governance Action Fabric audit log.
DECISION_LOG_FIELDS = [
    "sys_id",
    "u_log_id",
    "u_timestamp",
    "u_confidence_score",
    "u_model_version",
    "u_patient_id_anon",
    "u_reason_parsed",
    "u_triage_input",
    "u_slots_considered",
    "u_slots_returned",
    "u_appointment",
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


class BookingPatientNotFoundError(RuntimeError):
    """Raised when a booking request cannot be linked to a u_patient record."""


class BookingConflictError(RuntimeError):
    """Raised when the requested appointment time cannot be booked safely."""


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


def _field_value(field: Any) -> str:
    if isinstance(field, dict):
        return str(field.get("value") or "").strip()
    return str(field or "").strip()


def _field_display(field: Any) -> str:
    return str(_display_val(field)).strip()


def _field_best(field: Any) -> str:
    return _field_display(field) or _field_value(field)


def _truthy_snow(field: Any) -> bool:
    value = (_field_value(field) or _field_display(field)).strip().lower()
    return value in {"true", "1", "yes", "y", "active"}


def _date_value(field: Any) -> str:
    return (_field_value(field) or _field_display(field)).strip()


def _time_value(field: Any) -> str:
    value = (_field_display(field) or _field_value(field)).strip()
    if " " in value:
        value = value.rsplit(" ", 1)[-1]
    return value[:8] if len(value) >= 8 else value


def _time_key(value: str) -> str:
    return (value or "").strip()[:5]


def _calendar_label(day: date) -> str:
    return day.strftime("%b %d").replace(" 0", " ")


def _doctor_name(record: dict[str, Any]) -> str:
    first_name = _field_best(record.get("u_first_name"))
    last_name = _field_best(record.get("u_last_name"))
    name = " ".join(part for part in (first_name, last_name) if part).strip()
    return name or _field_best(record.get("u_email")) or _field_best(record.get("u_doctor_id")) or _field_best(record.get("sys_id"))


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

    form = {
        "grant_type": "client_credentials",
        "client_id": settings.snow_a2a_client_id,
        "client_secret": settings.snow_a2a_client_secret,
    }
    if settings.snow_a2a_scope:
        form["scope"] = settings.snow_a2a_scope

    response = await client.post(
        f"{settings.snow_base_url}/oauth_token.do",
        data=form,
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


async def create_agent(settings: Settings, name: str, description: str, instructions: str, active: bool) -> tuple[str, str]:
    """Create a new agent record in sn_aia_agent. Returns (sys_id, name)."""
    payload: dict[str, Any] = {
        "name": name,
        "description": description,
        "instructions": instructions,
        "active": "true" if active else "false",
    }
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        response = await client.post(
            f"{settings.snow_base_url}/api/now/table/sn_aia_agent",
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
    if not response.is_success:
        _raise_snow_error(response)
    result = response.json().get("result", {})
    sys_id = _display_val(result.get("sys_id")) or str(result.get("sys_id", ""))
    created_name = _display_val(result.get("name")) or name
    return sys_id, created_name


def _map_asset(record: dict[str, Any]) -> AIAsset:
    return AIAsset(
        sys_id=_field_best(record.get("sys_id")),
        name=_field_best(record.get("display_name")),
        display_name=_field_best(record.get("display_name")),
        vendor=_field_best(record.get("vendor")),
        managed_by=_field_best(record.get("managed_by")),
        lifecycle_phase=_field_best(record.get("life_cycle_stage")),
        state=_field_best(record.get("install_status")),
        lifecycle_status=_field_best(record.get("life_cycle_stage_status")),
    )


async def fetch_managed_ai_assets(settings: Settings) -> list[AIAsset]:
    """Return post-June-2 assets that have an owner (managed_by is set)."""
    params = {
        "sysparm_query": (
            f"sys_created_on>={settings.agents_created_since}"
            "^managed_byISNOTEMPTY"
            "^ORDERBYDESCsys_created_on"
        ),
        "sysparm_fields": ",".join(ASSET_FIELDS),
        "sysparm_display_value": "true",
    }
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        response = await client.get(
            f"{settings.snow_base_url}/api/now/table/alm_ai_system_digital_asset",
            params=params,
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
    if not response.is_success:
        _raise_snow_error(response)
    result = response.json().get("result", [])
    return [_map_asset(record) for record in result]


async def fetch_unmanaged_ai_assets(settings: Settings) -> list[AIAsset]:
    """Return post-June-2 assets with no owner assigned (unmanaged/shadow AI)."""
    params = {
        "sysparm_query": (
            f"sys_created_on>={settings.agents_created_since}"
            "^managed_byISEMPTY"
            "^ORDERBYDESCsys_created_on"
        ),
        "sysparm_fields": ",".join(ASSET_FIELDS),
        "sysparm_display_value": "true",
    }
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        response = await client.get(
            f"{settings.snow_base_url}/api/now/table/alm_ai_system_digital_asset",
            params=params,
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
    if not response.is_success:
        _raise_snow_error(response)
    result = response.json().get("result", [])
    return [_map_asset(record) for record in result]


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


def _service_now_query_value(value: str) -> str:
    return value.strip().replace("^", " ").replace("=", " ")


def _first_last_from_name(name: str | None) -> tuple[str, str]:
    parts = [part for part in (name or "").strip().split() if part]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _patient_profile_queries(email: str | None, username: str | None, name: str | None) -> list[str]:
    queries: list[str] = []
    normalized_email = _service_now_query_value(email or "")
    normalized_username = _service_now_query_value(username or "")
    first_name, last_name = (_service_now_query_value(part) for part in _first_last_from_name(name))

    if normalized_email:
        queries.append(f"u_email={normalized_email}")
    if normalized_username and normalized_username != normalized_email:
        queries.append(f"u_username={normalized_username}")
    if first_name and last_name:
        queries.append(f"u_first_name={first_name}^u_last_name={last_name}")
    elif first_name:
        queries.append(f"u_first_name={first_name}")

    return queries


async def fetch_patient_profile(
    settings: Settings,
    *,
    email: str | None = None,
    username: str | None = None,
    name: str | None = None,
    http_client: httpx.AsyncClient | None = None,
) -> PatientProfileResponse | None:
    """Return the first u_patient record matching auth email, username, then name."""
    queries = _patient_profile_queries(email, username, name)
    if not queries:
        return None

    async def run_query(client: httpx.AsyncClient, query: str) -> httpx.Response:
        return await client.get(
            f"{settings.snow_base_url}/api/now/table/u_patient",
            params={
                "sysparm_query": query,
                "sysparm_fields": ",".join(PATIENT_PROFILE_FIELDS),
                "sysparm_display_value": "true",
                "sysparm_limit": "1",
            },
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )

    async def run(client: httpx.AsyncClient) -> PatientProfileResponse | None:
        for query in queries:
            response = await run_query(client, query)
            if not response.is_success:
                _raise_snow_error(response)
            records = response.json().get("result", [])
            if records:
                return _map_patient_profile(records[0])
        return None

    if http_client is not None:
        return await run(http_client)

    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


def _map_patient_profile(record: dict[str, Any]) -> PatientProfileResponse:
    state_region = ", ".join(
        part
        for part in (
            _field_best(record.get("u_state")) or _field_best(record.get("u_region")),
            _field_best(record.get("u_country")),
        )
        if part
    )

    return PatientProfileResponse(
        sys_id=_field_best(record.get("sys_id")),
        patient_id=_field_best(record.get("u_patient_id")),
        first_name=_field_best(record.get("u_first_name")),
        last_name=_field_best(record.get("u_last_name")),
        date_of_birth=_date_value(record.get("u_date_of_birth")),
        gender=_field_best(record.get("u_gender")),
        ethnicity=_field_best(record.get("u_ethnicity")),
        primary_language=_field_best(record.get("u_primary_language")),
        phone=_field_best(record.get("u_phone")),
        email=_field_best(record.get("u_email")),
        address_line1=_field_best(record.get("u_address_line1")),
        address_line2=_field_best(record.get("u_address_line2")),
        city=_field_best(record.get("u_city")),
        postcode=_field_best(record.get("u_postcode")),
        state_region=state_region,
        health_condition=_field_best(record.get("u_health_condition")),
        accessibility=_field_best(record.get("u_accessibility")),
        insurance_id=_field_best(record.get("u_insurance_id")),
        insurance_provider=_field_best(record.get("u_insurance_provider")),
        emergency_name=_field_best(record.get("u_emergency_name")),
        emergency_phone=_field_best(record.get("u_emergency_phone")),
        emergency_relationship=_field_best(record.get("u_emergency_relationship")),
        username=_field_best(record.get("u_username")),
        registration_status=_field_best(record.get("u_registration_status")),
        account_status=_field_best(record.get("u_account_status")),
        email_verified=_truthy_snow(record.get("u_email_verified")),
        profile_complete=_truthy_snow(record.get("u_profile_complete")),
        blood_type=_field_best(record.get("u_blood_type")),
        known_allergies=_field_best(record.get("u_known_allergies")),
        active_since=_date_value(record.get("sys_created_on")),
        confidence_score=_field_best(record.get("u_confidence_score")),
        consent_accepted=_truthy_snow(record.get("u_consent_accepted")),
        privacy_notice_version=_field_best(record.get("u_privacy_notice_version")),
        time_preference=_field_best(record.get("u_time_preference")),
        last_updated=_date_value(record.get("sys_updated_on")),
    )


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


async def fetch_patient_registrations(
    settings: Settings,
    status: str | None = None,
    limit: int = 100,
    http_client: httpx.AsyncClient | None = None,
) -> list[PatientRegistrationSummary]:
    """Return u_patient records as intake summaries, optionally filtered by status.

    Used by the staff/admin intake queue. ``status`` matches u_registration_status
    case-insensitively (e.g. "pending", "approved"); omit it to return every record.
    """
    query_parts = []
    normalized_status = _service_now_query_value(status or "").strip()
    if normalized_status:
        query_parts.append(f"u_registration_statusSTARTSWITH{normalized_status.lower()}")
    query_parts.append("ORDERBYDESCsys_created_on")
    params = {
        "sysparm_query": "^".join(query_parts),
        "sysparm_fields": ",".join(REGISTRATION_SUMMARY_FIELDS),
        "sysparm_display_value": "true",
        "sysparm_limit": str(max(1, min(limit, 500))),
    }

    async def run(client: httpx.AsyncClient) -> httpx.Response:
        return await client.get(
            f"{settings.snow_base_url}/api/now/table/u_patient",
            params=params,
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )

    if http_client is not None:
        response = await run(http_client)
    else:
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            response = await run(client)

    if not response.is_success:
        _raise_snow_error(response)

    records = response.json().get("result", [])
    return [_map_registration_summary(record) for record in records if isinstance(record, dict)]


def _map_registration_summary(record: dict[str, Any]) -> PatientRegistrationSummary:
    return PatientRegistrationSummary(
        sys_id=_field_best(record.get("sys_id")),
        patient_id=_field_best(record.get("u_patient_id")),
        first_name=_field_best(record.get("u_first_name")),
        last_name=_field_best(record.get("u_last_name")),
        email=_field_best(record.get("u_email")),
        phone=_field_best(record.get("u_phone")),
        health_condition=_field_best(record.get("u_health_condition")),
        registration_status=_field_best(record.get("u_registration_status")),
        account_status=_field_best(record.get("u_account_status")),
        confidence_score=_field_best(record.get("u_confidence_score")),
        profile_complete=_truthy_snow(record.get("u_profile_complete")),
        created_on=_date_value(record.get("sys_created_on")),
    )


async def fetch_ai_decision_log(
    settings: Settings,
    limit: int = 25,
    http_client: httpx.AsyncClient | None = None,
) -> list[AiDecisionLogEntry]:
    """Return u_ai_decision_log entries, newest first, for the governance audit board."""
    params = {
        "sysparm_query": "ORDERBYDESCu_timestamp",
        "sysparm_fields": ",".join(DECISION_LOG_FIELDS),
        "sysparm_display_value": "all",
        "sysparm_limit": str(max(1, min(limit, 200))),
    }

    async def run(client: httpx.AsyncClient) -> httpx.Response:
        return await client.get(
            f"{settings.snow_base_url}/api/now/table/u_ai_decision_log",
            params=params,
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )

    if http_client is not None:
        response = await run(http_client)
    else:
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            response = await run(client)

    if not response.is_success:
        _raise_snow_error(response)

    records = response.json().get("result", [])
    return [_map_decision_log_entry(record) for record in records if isinstance(record, dict)]


def _map_decision_log_entry(record: dict[str, Any]) -> AiDecisionLogEntry:
    return AiDecisionLogEntry(
        sys_id=_field_best(record.get("sys_id")),
        log_id=_field_best(record.get("u_log_id")),
        timestamp=_field_best(record.get("u_timestamp")),
        confidence_score=_field_best(record.get("u_confidence_score")),
        model_version=_field_best(record.get("u_model_version")),
        patient_anon=_field_best(record.get("u_patient_id_anon")),
        reason_parsed=_field_best(record.get("u_reason_parsed")),
        triage_input=_field_best(record.get("u_triage_input")),
        slots_considered=_field_best(record.get("u_slots_considered")),
        slots_returned=_field_best(record.get("u_slots_returned")),
        appointment=_field_display(record.get("u_appointment")) or _field_value(record.get("u_appointment")),
    )


async def fetch_patient_booking_availability(
    settings: Settings,
    start_date: date | None = None,
    days: int = 14,
    http_client: httpx.AsyncClient | None = None,
) -> BookingAvailabilityResponse:
    """Return normalized booking availability for the patient booking page."""
    first_day = start_date or date.today()
    day_count = max(1, min(days, BOOKING_AVAILABILITY_MAX_DAYS))
    last_day = first_day + timedelta(days=day_count - 1)

    async def get_table(
        client: httpx.AsyncClient,
        table: str,
        fields: list[str],
        query: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        response = await client.get(
            f"{settings.snow_base_url}/api/now/table/{table}",
            params={
                "sysparm_query": query,
                "sysparm_fields": ",".join(fields),
                "sysparm_display_value": "all",
                "sysparm_limit": str(limit),
            },
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if not response.is_success:
            _raise_snow_error(response)
        try:
            body = response.json()
        except ValueError as exc:
            raise ServiceNowError(f"ServiceNow {table} response was invalid JSON") from exc
        records = body.get("result") if isinstance(body, dict) else None
        if not isinstance(records, list):
            raise ServiceNowError(f"ServiceNow {table} response did not include a result list")
        return [record for record in records if isinstance(record, dict)]

    async def run(client: httpx.AsyncClient) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        doctors = await get_table(
            client,
            "u_doctor",
            DOCTOR_FIELDS,
            "u_active=true^ORDERBYu_last_name^ORDERBYu_first_name",
            200,
        )
        appointments = await get_table(
            client,
            "u_appointment",
            APPOINTMENT_FIELDS,
            (
                f"u_appointment_date>={first_day.isoformat()}"
                f"^u_appointment_date<={last_day.isoformat()}"
                "^ORDERBYu_appointment_date^ORDERBYu_appointment_time"
            ),
            500,
        )
        return doctors, appointments

    if http_client is not None:
        doctor_records, appointment_records = await run(http_client)
    else:
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            doctor_records, appointment_records = await run(client)

    doctors = [_map_booking_doctor(record) for record in doctor_records]
    doctor_by_record_id = {doctor.doctor_record_id: doctor for doctor in doctors}
    appointments = [_map_booking_appointment(record, doctor_by_record_id) for record in appointment_records]
    appointments.sort(key=lambda appointment: (appointment.date, appointment.start_time, appointment.doctor_name))
    appointments_by_date: dict[str, list[BookingAppointment]] = {}
    for appointment in appointments:
        appointments_by_date.setdefault(appointment.date, []).append(appointment)

    calendar_days = [
        BookingCalendarDay(
            date=(first_day + timedelta(days=offset)).isoformat(),
            label=_calendar_label(first_day + timedelta(days=offset)),
            appointments=appointments_by_date.get((first_day + timedelta(days=offset)).isoformat(), []),
        )
        for offset in range(day_count)
    ]

    return BookingAvailabilityResponse(
        start_date=first_day.isoformat(),
        end_date=last_day.isoformat(),
        days=calendar_days,
        doctors=doctors,
        appointments=appointments,
    )


def _map_booking_doctor(record: dict[str, Any]) -> BookingDoctor:
    doctor_record_id = _field_best(record.get("sys_id"))
    first_name = _field_best(record.get("u_first_name"))
    last_name = _field_best(record.get("u_last_name"))
    return BookingDoctor(
        doctor_id=_field_best(record.get("u_doctor_id")) or doctor_record_id,
        doctor_record_id=doctor_record_id,
        name=_doctor_name(record),
        first_name=first_name,
        last_name=last_name,
        department=_field_best(record.get("u_department")),
        speciality=_field_best(record.get("u_speciality")),
        email=_field_best(record.get("u_email")),
        active=_truthy_snow(record.get("u_active")),
    )


def _map_booking_appointment(
    record: dict[str, Any],
    doctor_by_record_id: dict[str, BookingDoctor],
) -> BookingAppointment:
    doctor_record_id = _field_value(record.get("u_doctor")) or _field_display(record.get("u_doctor"))
    doctor = doctor_by_record_id.get(doctor_record_id)
    date_value = _date_value(record.get("u_appointment_date"))
    start_time = _time_value(record.get("u_appointment_time"))
    status = (_field_value(record.get("u_status")) or _field_display(record.get("u_status"))).lower()
    status_label = _field_display(record.get("u_status")) or status.title() or "Unknown"

    return BookingAppointment(
        appointment_id=_field_best(record.get("u_appointment_id")) or _field_best(record.get("sys_id")),
        appointment_record_id=_field_best(record.get("sys_id")),
        doctor_id=doctor.doctor_id if doctor else doctor_record_id,
        doctor_record_id=doctor.doctor_record_id if doctor else doctor_record_id,
        doctor_name=doctor.name if doctor else _field_display(record.get("u_doctor")) or "Unknown doctor",
        department=doctor.department if doctor else "",
        speciality=doctor.speciality if doctor else "",
        date=date_value,
        start_time=start_time,
        status=status,
        status_label=status_label,
        reason_category=_field_best(record.get("u_reason_category")),
        reason_text=_field_best(record.get("u_reason_text")),
        patient_id=_field_value(record.get("u_patient")),
        patient_display=_field_display(record.get("u_patient")),
    )


async def create_patient_booking_appointment(
    settings: Settings,
    booking: BookingAppointmentRequest,
    http_client: httpx.AsyncClient | None = None,
) -> BookingAppointment:
    """Create a confirmed u_appointment using the UI schedule and appointment conflicts only."""

    async def run(client: httpx.AsyncClient) -> BookingAppointment:
        profile = await fetch_patient_profile(
            settings,
            email=booking.email,
            username=booking.username,
            name=booking.name,
            http_client=client,
        )
        if profile is None or not profile.sys_id:
            raise BookingPatientNotFoundError("Patient profile not found for this booking.")

        doctor_record = await _fetch_doctor_record(settings, client, booking.doctor_record_id)
        doctor = _map_booking_doctor(doctor_record)
        if not doctor.active:
            raise BookingConflictError("Selected doctor is no longer active.")

        conflicts = await _fetch_doctor_appointments_for_date(
            settings,
            client,
            booking.doctor_record_id,
            booking.date,
        )
        if any(
            _time_key(appointment.start_time) == _time_key(booking.start_time)
            and not is_cancelled_booking_status(appointment.status)
            for appointment in conflicts
        ):
            raise BookingConflictError("Selected appointment time is no longer available.")

        payload = _booking_payload(booking, profile.sys_id)
        create_response = await client.post(
            f"{settings.snow_base_url}/api/now/table/u_appointment",
            params={
                "sysparm_fields": ",".join(APPOINTMENT_FIELDS),
                "sysparm_display_value": "all",
            },
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if not create_response.is_success:
            _raise_snow_error(create_response)

        try:
            record = create_response.json().get("result", {})
        except ValueError as exc:
            raise ServiceNowError("ServiceNow appointment create response was invalid JSON") from exc
        if not isinstance(record, dict):
            raise ServiceNowError("ServiceNow appointment create response did not include a result object")

        appointment = _map_booking_appointment(record, {doctor.doctor_record_id: doctor})
        if appointment.doctor_name == "Unknown doctor":
            appointment.doctor_name = doctor.name
        return appointment

    if http_client is not None:
        return await run(http_client)

    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def _fetch_doctor_record(
    settings: Settings,
    client: httpx.AsyncClient,
    doctor_record_id: str,
) -> dict[str, Any]:
    response = await client.get(
        f"{settings.snow_base_url}/api/now/table/u_doctor",
        params={
            "sysparm_query": f"sys_id={_service_now_query_value(doctor_record_id)}",
            "sysparm_fields": ",".join(DOCTOR_FIELDS),
            "sysparm_display_value": "all",
            "sysparm_limit": "1",
        },
        headers={"Accept": "application/json"},
        auth=(settings.snow_username, settings.snow_password),
    )
    if not response.is_success:
        _raise_snow_error(response)
    try:
        records = response.json().get("result", [])
    except ValueError as exc:
        raise ServiceNowError("ServiceNow doctor response was invalid JSON") from exc
    if not isinstance(records, list):
        raise ServiceNowError("ServiceNow doctor response did not include a result list")
    if not records:
        raise BookingConflictError("Selected doctor is no longer available.")
    record = records[0]
    if not isinstance(record, dict):
        raise ServiceNowError("ServiceNow doctor response included an invalid record")
    return record


async def _fetch_doctor_appointments_for_date(
    settings: Settings,
    client: httpx.AsyncClient,
    doctor_record_id: str,
    appointment_date: str,
) -> list[BookingAppointment]:
    response = await client.get(
        f"{settings.snow_base_url}/api/now/table/u_appointment",
        params={
            "sysparm_query": (
                f"u_doctor={_service_now_query_value(doctor_record_id)}"
                f"^u_appointment_date={_service_now_query_value(appointment_date)}"
            ),
            "sysparm_fields": ",".join(APPOINTMENT_FIELDS),
            "sysparm_display_value": "all",
            "sysparm_limit": "100",
        },
        headers={"Accept": "application/json"},
        auth=(settings.snow_username, settings.snow_password),
    )
    if not response.is_success:
        _raise_snow_error(response)
    try:
        records = response.json().get("result", [])
    except ValueError as exc:
        raise ServiceNowError("ServiceNow appointment conflict response was invalid JSON") from exc
    if not isinstance(records, list):
        raise ServiceNowError("ServiceNow appointment conflict response did not include a result list")
    return [_map_booking_appointment(record, {}) for record in records if isinstance(record, dict)]


def is_cancelled_booking_status(status: str) -> bool:
    return status.strip().lower() in {"cancelled", "canceled"}


def _booking_payload(booking: BookingAppointmentRequest, patient_sys_id: str) -> dict[str, str]:
    return {
        "u_appointment_id": f"APT-{uuid4().hex[:12].upper()}",
        "u_doctor": booking.doctor_record_id,
        "u_patient": patient_sys_id,
        "u_appointment_date": booking.date,
        "u_appointment_time": booking.start_time,
        "u_status": "confirmed",
        "u_triage_priority": _booking_triage_priority(booking.reason_category),
        "u_reason_category": _booking_reason_category(booking.reason_category),
        "u_reason_text": _booking_reason_text(booking),
        "u_created_by_agent": "careatlas-patient-portal",
    }


def _booking_reason_category(value: str) -> str:
    normalized = value.strip().lower().replace("_", " ")
    aliases = {
        "general check-up": "general-checkup",
        "general checkup": "general-checkup",
        "follow-up": "follow-up",
        "follow up": "follow-up",
        "urgent concern": "urgent",
        "urgent": "urgent",
        "specialist referral": "specialist",
        "specialist": "specialist",
        "mental health": "mental-health",
        "chronic condition management": "chronic",
        "chronic": "chronic",
    }
    return aliases.get(normalized, normalized.replace(" ", "-"))


def _booking_triage_priority(reason_category: str) -> str:
    return "urgent" if _booking_reason_category(reason_category) == "urgent" else "routine"


def _booking_reason_text(booking: BookingAppointmentRequest) -> str:
    parts = [
        ("Concern", booking.concern),
        ("Visit type", booking.visit_type),
        ("Specialty", booking.specialty),
        ("Insurance provider", booking.insurance_provider),
        ("Member ID", booking.member_id),
        ("Accessibility", booking.accessibility),
        ("Interpreter", booking.interpreter),
    ]
    text = " | ".join(f"{label}: {value}" for label, value in parts if value)
    return text[:500]


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
    system_context: str | None = None,
    http_client: httpx.AsyncClient | None = None,
) -> AgentExecutionResult:
    """Submit a ServiceNow AI agent through synchronous (blocking) A2A.

    Sends ``message/send`` with ``configuration: {"blocking": true}`` and reads the agent
    reply out of the same HTTP response. This needs no publicly reachable callback URL.
    """
    logger.info("Executing ServiceNow A2A agent %s", agent_sys_id)

    request_id = str(uuid4())
    message_id = str(uuid4())
    message_text = _agent_message_text(user_input, system_context)
    message = {
        "kind": "message",
        "role": "user",
        "messageId": message_id,
        "parts": [{"kind": "text", "text": message_text}],
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
            "configuration": {"blocking": True},
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
        async with httpx.AsyncClient(timeout=settings.agent_execute_timeout) as client:
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


def _agent_message_text(user_input: str, system_context: str | None = None) -> str:
    context = (system_context or "").strip()
    if not context:
        return user_input
    return f"{context}\n\nUser message: {user_input}"


def _part_texts(node: Any) -> list[str]:
    if not isinstance(node, dict):
        return []

    parts = node.get("parts")
    if not isinstance(parts, list):
        return []

    texts = []
    for part in parts:
        if not isinstance(part, dict):
            continue
        # A2A spec uses "kind", some ServiceNow responses use "type"
        kind = part.get("kind") or part.get("type")
        if kind == "text":
            text = str(part.get("text") or "").strip()
            if text:
                texts.append(text)
    return texts


def _extract_a2a_text(body: Any) -> str:
    """Extract the human-visible text from all known ServiceNow A2A response shapes."""
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

        # result.status.message.parts
        status = result.get("status")
        if isinstance(status, dict):
            texts.extend(_part_texts(status.get("message")))

        # result.message.parts
        texts.extend(_part_texts(result.get("message")))

        # result.parts (direct parts on result)
        texts.extend(_part_texts(result))

        # result.artifacts[].parts
        artifacts = result.get("artifacts")
        if isinstance(artifacts, list):
            for artifact in artifacts:
                texts.extend(_part_texts(artifact))

        # result.history[role="agent"].parts — present in many ServiceNow agents
        history = result.get("history")
        if isinstance(history, list):
            for msg in history:
                if isinstance(msg, dict) and msg.get("role") == "agent":
                    texts.extend(_part_texts(msg))

    return "\n\n".join(t for t in texts if t)


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
