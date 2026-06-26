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
from .notifications import create_notification
from .models import (
    AIAsset,
    AISystem,
    AclSummaryResponse,
    AclTestCheck,
    AclTestResponse,
    AgentIdentity,
    ApprovalLogEntry,
    AiDecisionLogEntry,
    PatientAccessComparison,
    PatientFieldAccess,
    BookingAppointment,
    BookingAppointmentRequest,
    BookingAvailabilityResponse,
    BookingCalendarDay,
    BookingDoctor,
    ClinicianAppointmentCreateRequest,
    DoctorAppointmentOption,
    PatientProfileResponse,
    PatientProfileUpdateRequest,
    PatientRegistrationRequest,
    PatientRegistrationResponse,
    PatientRegistrationSummary,
    PatientSearchResult,
    PiiFieldAclStatus,
    PrivacyControlsResponse,
    ScopedAgentAnswer,
    ScopedFieldValue,
    SummaryNoteRequest,
    SummaryNoteResponse,
)

logger = logging.getLogger("careatlas.servicenow")

_A2A_TOKEN_CACHE: dict[str, tuple[str, float]] = {}

# Fields pulled from alm_ai_system_digital_asset for the managed/unmanaged AI asset tables.
ASSET_FIELDS = [
    "sys_id",
    "display_name",
    "model_category",
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

# Fields for the "Add note" appointment picker (dot-walked patient name for display).
DOCTOR_APPOINTMENT_OPTION_FIELDS = [
    "sys_id",
    "u_appointment_id",
    "u_appointment_date",
    "u_appointment_time",
    "u_status",
    "u_reason_category",
    "u_reason_text",
    "u_triage_priority",
    "u_patient",
    "u_patient.u_first_name",
    "u_patient.u_last_name",
]

# Fields pulled from u_summary_notes for the clinician "My notes" view.
SUMMARY_NOTE_FIELDS = [
    "sys_id",
    "u_summary_note_id",
    "u_appointment",
    "u_appointment.u_appointment_id",
    "u_doctor",
    "u_doctor.u_first_name",
    "u_doctor.u_last_name",
    "u_patient",
    "u_patient.u_first_name",
    "u_patient.u_last_name",
    "u_appointment_date",
    "u_appointment_time",
    "u_notes",
    "u_logged_by",
    "sys_created_on",
]


@dataclass(frozen=True)
class AclProbe:
    label: str
    expected: Literal["allowed", "denied"]
    table: str
    fields: tuple[str, ...]
    inspect_denied_fields: bool = False
    # "read" probes GET the table; "write" probes attempt a POST (create) and expect
    # it to be denied, proving the agent cannot act beyond its job (OWASP LLM06).
    operation: Literal["read", "write"] = "read"
    # Minimal payload for a write probe (kept harmless; the record is deleted if it
    # is unexpectedly created, which would indicate an excessive-agency leak).
    write_payload: tuple[tuple[str, str], ...] = ()


# Reusable PII read-deny probe (the field-level ACL strips these for non-PII agents).
def _pii_deny_probe(fields: tuple[str, ...]) -> AclProbe:
    return AclProbe(
        label="Denied patient PII fields",
        expected="denied",
        table="u_patient",
        fields=fields,
        inspect_denied_fields=True,
    )


_PII_FIELDS = (
    "u_first_name",
    "u_last_name",
    "u_email",
    "u_phone",
    "u_date_of_birth",
    "u_gender",
    "u_ethnicity",
)

ACL_TEST_PROBES: dict[str, tuple[AclProbe, ...]] = {
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
        AclProbe(
            label="Denied write to appointments",
            expected="denied",
            table="u_appointment",
            fields=(),
            operation="write",
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
        _pii_deny_probe(_PII_FIELDS),
        AclProbe(
            label="Denied writing a clinical note",
            expected="denied",
            table="u_summary_notes",
            fields=(),
            operation="write",
            write_payload=(("u_summary_note_id", "ACL_PROBE"),),
        ),
    ),
    "svc-reminder-agent": (
        AclProbe(
            label="Allowed appointment table",
            expected="allowed",
            table="u_appointment",
            fields=("sys_id",),
        ),
        # Reminder reads the patient table (via u_scheduling_agent) but PII is denied.
        _pii_deny_probe(_PII_FIELDS),
        AclProbe(
            label="Denied writing the patient record",
            expected="denied",
            table="u_patient",
            fields=(),
            operation="write",
            write_payload=(("u_first_name", "ACL_PROBE"),),
        ),
    ),
    "svc-notes-agent": (
        AclProbe(
            label="Allowed appointment notes fields",
            expected="allowed",
            table="u_appointment",
            fields=("sys_id", "u_doctor_notes"),
        ),
        _pii_deny_probe(_PII_FIELDS[:5]),
        AclProbe(
            label="Denied writing the patient record",
            expected="denied",
            table="u_patient",
            fields=(),
            operation="write",
            write_payload=(("u_first_name", "ACL_PROBE"),),
        ),
    ),
    "svc-triage-agent": (
        AclProbe(
            label="Allowed patient triage fields",
            expected="allowed",
            table="u_patient",
            fields=("sys_id", "u_reason_text", "u_health_condition"),
        ),
        _pii_deny_probe(_PII_FIELDS[:5]),
        AclProbe(
            label="Denied writing to appointments",
            expected="denied",
            table="u_appointment",
            fields=(),
            operation="write",
        ),
    ),
}


# Security-ops agents hold no patient roles — their blast radius excludes all patient
# data entirely (read and write both denied). They share one "no patient access" matrix.
_SECURITY_AGENT_PROBES: tuple[AclProbe, ...] = (
    AclProbe(
        label="Denied patient table (read)",
        expected="denied",
        table="u_patient",
        fields=("sys_id",),
    ),
    AclProbe(
        label="Denied patient record (write)",
        expected="denied",
        table="u_patient",
        fields=(),
        operation="write",
        write_payload=(("u_first_name", "ACL_PROBE"),),
    ),
)
for _sec_agent in (
    "svc-security-scanner",
    "svc-security-remediation",
    "svc-threat-intel",
    "svc-pipeline-orchestrator",
):
    ACL_TEST_PROBES[_sec_agent] = _SECURITY_AGENT_PROBES


class ServiceNowError(RuntimeError):
    """Raised when ServiceNow returns a non-OK response we can't recover from."""


class BookingPatientNotFoundError(RuntimeError):
    """Raised when a booking request cannot be linked to a u_patient record."""


class BookingConflictError(RuntimeError):
    """Raised when the requested appointment time cannot be booked safely."""


class SummaryNoteAppointmentNotFoundError(RuntimeError):
    """Raised when a summary note references an appointment that no longer exists."""


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


# Governance lifecycle/risk lives on a related record, keyed by the asset sys_id.
GOVERNANCE_TABLE = "sn_ai_governance_asset_governance_details"
GOVERNANCE_FIELDS = ["asset", "status", "risk_score", "lifecycle_phase"]
_GOV_CHUNK = 80


def _map_asset(record: dict[str, Any], gov: dict[str, str] | None = None) -> AIAsset:
    gov = gov or {}
    return AIAsset(
        sys_id=_field_best(record.get("sys_id")),
        name=_field_best(record.get("display_name")),
        display_name=_field_best(record.get("display_name")),
        asset_type=_field_best(record.get("model_category")),
        vendor=_field_best(record.get("vendor")),
        managed_by=_field_best(record.get("managed_by")),
        # Prefer the governance-record values (the ones shown in AI Control Tower);
        # fall back to the asset's own lifecycle fields when no governance record exists.
        lifecycle_phase=gov.get("lifecycle_phase") or _field_best(record.get("life_cycle_stage")),
        state=_field_best(record.get("install_status")),
        lifecycle_status=gov.get("status") or _field_best(record.get("life_cycle_stage_status")),
        risk_classification=gov.get("risk_score", ""),
    )


async def _fetch_governance_details(
    client: httpx.AsyncClient, settings: Settings, asset_sys_ids: list[str]
) -> dict[str, dict[str, str]]:
    """Map asset sys_id -> {status, risk_score, lifecycle_phase} from the governance table."""
    out: dict[str, dict[str, str]] = {}
    for start in range(0, len(asset_sys_ids), _GOV_CHUNK):
        chunk = asset_sys_ids[start : start + _GOV_CHUNK]
        params = {
            "sysparm_query": "assetIN" + ",".join(chunk),
            "sysparm_fields": ",".join(GOVERNANCE_FIELDS),
            # "all" returns both .value (sys_id for the asset reference) and
            # .display_value (human label) for every field.
            "sysparm_display_value": "all",
        }
        response = await client.get(
            f"{settings.snow_base_url}/api/now/table/{GOVERNANCE_TABLE}",
            params=params,
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if not response.is_success:
            _raise_snow_error(response)
        for rec in response.json().get("result", []):
            asset_field = rec.get("asset")
            asset_id = asset_field.get("value") if isinstance(asset_field, dict) else asset_field
            if not asset_id or asset_id in out:
                continue
            out[asset_id] = {
                "status": _field_best(rec.get("status")),
                "risk_score": _field_best(rec.get("risk_score")),
                "lifecycle_phase": _field_best(rec.get("lifecycle_phase")),
            }
    return out


# Display rule: any asset whose name contains this fragment is always shown in the
# Unmanaged AI Assets table on the governance page, regardless of its managed_by owner.
DEMO_AGENT_NAME_FRAGMENT = "demo agent"


def _record_is_managed(record: dict[str, Any]) -> bool:
    """An asset counts as managed when it has an owner (managed_by) — except demo
    agents, which are always surfaced as unmanaged for the governance demo."""
    name = (_field_best(record.get("display_name")) or "").lower()
    if DEMO_AGENT_NAME_FRAGMENT in name:
        return False
    return bool((_field_best(record.get("managed_by")) or "").strip())


async def _fetch_ai_assets(settings: Settings, *, managed: bool) -> list[AIAsset]:
    # Fetch all post-cutoff assets, then bucket managed vs unmanaged in code so the
    # demo-agent override above can move owned demo agents into the unmanaged table.
    params = {
        "sysparm_query": (
            f"sys_created_on>={settings.agents_created_since}"
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
        records = [
            r for r in response.json().get("result", [])
            if _record_is_managed(r) == managed
        ]

        sys_ids = [sid for r in records if (sid := _field_best(r.get("sys_id")))]
        gov_map = await _fetch_governance_details(client, settings, sys_ids)

    return [_map_asset(r, gov_map.get(_field_best(r.get("sys_id")))) for r in records]


async def fetch_managed_ai_assets(settings: Settings) -> list[AIAsset]:
    """Return post-June-2 assets that have an owner (managed_by is set)."""
    return await _fetch_ai_assets(settings, managed=True)


async def fetch_unmanaged_ai_assets(settings: Settings) -> list[AIAsset]:
    """Return post-June-2 assets with no owner assigned (unmanaged/shadow AI)."""
    return await _fetch_ai_assets(settings, managed=False)


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

    patient_sys_id = _field_value(result.get("sys_id"))
    patient_name = " ".join(
        p for p in (_display_val(result.get("u_first_name")), _display_val(result.get("u_last_name"))) if p
    ).strip()
    await create_notification(
        settings,
        audience="both",
        notification_type="registration_complete",
        message=f"Registration completed for {patient_name or 'a new patient'}. Awaiting staff review.",
        patient_sys_id=patient_sys_id,
    )

    return PatientRegistrationResponse(
        message="Patient registration created in ServiceNow.",
        sys_id=_display_val(result.get("sys_id")),
        patient_id=_display_val(result.get("u_patient_id")),
        first_name=_display_val(result.get("u_first_name")),
        last_name=_display_val(result.get("u_last_name")),
        email=_display_val(result.get("u_email")),
        registration_status=_display_val(result.get("u_registration_status")),
    )


async def create_doctor(
    settings: Settings,
    *,
    first_name: str,
    last_name: str,
    email: str,
    department: str,
    speciality: str,
    http_client: httpx.AsyncClient | None = None,
) -> dict[str, str]:
    """Create a clinician record in ServiceNow's u_doctor table."""
    payload = {
        "u_first_name": first_name,
        "u_last_name": last_name,
        "u_email": email,
        "u_department": department,
        "u_speciality": speciality,
        "u_active": "true",
    }

    async def run(client: httpx.AsyncClient) -> httpx.Response:
        return await client.post(
            f"{settings.snow_base_url}/api/now/table/u_doctor",
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
        raise ServiceNowError("ServiceNow doctor creation failed: invalid JSON response") from exc

    result = body.get("result") if isinstance(body, dict) else None
    if not isinstance(result, dict):
        raise ServiceNowError("ServiceNow doctor creation response did not include a result object")

    return {
        "sys_id": _display_val(result.get("sys_id")),
        "doctor_id": _display_val(result.get("u_doctor_id")),
        "first_name": _display_val(result.get("u_first_name")) or first_name,
        "last_name": _display_val(result.get("u_last_name")) or last_name,
        "email": _display_val(result.get("u_email")) or email,
        "department": _display_val(result.get("u_department")) or department,
        "speciality": _display_val(result.get("u_speciality")) or speciality,
    }


# ---------------------------------------------------------------------------
# LLM02 — Sensitive Information Disclosure guardrail audit log
# (table: u_ai_action_audit_log)
# ---------------------------------------------------------------------------

GUARDRAIL_AGENT_IDENTITY = "governance_user_identity"
GUARDRAIL_FINAL_ACTION = "blocked"
GUARDRAIL_REJECTION_REASON = (
    "Blocked under LLM02 — Sensitive Information Disclosure. The request sought "
    "patient PII, which the governance guardrail prohibits. Event flagged for review."
)


def _map_audit_log(record: dict[str, Any]) -> dict[str, str]:
    """Normalize a u_ai_action_audit_log row for the frontend."""
    return {
        "sys_id": _field_value(record.get("sys_id")),
        "log_id": _field_best(record.get("u_log_id")),
        "timestamp": _field_best(record.get("u_timestamp")) or _field_best(record.get("sys_created_on")),
        "agent_identity": _field_best(record.get("u_agent_identity")),
        "action_type": _field_best(record.get("u_action_type")),
        "final_action": _field_best(record.get("u_final_action")),
        "rejection_reason": _field_best(record.get("u_rejection_reason")),
        "patient_id_anon": _field_best(record.get("u_patient_id_anon")),
        "agent_authorised": _truthy_snow(record.get("u_val_agent_auth")),
        "created_by": _field_best(record.get("sys_created_by")),
    }


async def record_approval_decision(
    settings: Settings,
    *,
    intent: str,
    decision: str,
    approver: str,
    reason: str,
    http_client: httpx.AsyncClient | None = None,
) -> dict[str, str]:
    """Record a UC2 human-approval-gate decision in u_ai_action_audit_log.

    Captures the approver identity and whether the high-impact agent action was
    approved or denied, so the audit trail shows a human was in the loop.
    """
    final_action = "approved" if decision == "approve" else "denied"
    payload = {
        "u_agent_identity": "human_approval_gate",
        "u_final_action": final_action,
        "u_rejection_reason": (
            f"UC2 Excessive-Agency gate — high-impact intent '{intent}' ({reason}) "
            f"{final_action} by governance officer '{approver}'."
        ),
        "u_patient_id_anon": "N/A",
        "u_val_agent_auth": "true" if decision == "approve" else "false",
    }

    async def run(client: httpx.AsyncClient) -> httpx.Response:
        return await client.post(
            f"{settings.snow_base_url}/api/now/table/u_ai_action_audit_log",
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )

    if http_client is not None:
        response = await run(http_client)
    else:
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            response = await run(client)

    if not response.is_success:
        _raise_snow_error(response)
    body = response.json() if response.content else {}
    result = body.get("result") if isinstance(body, dict) else None
    return _map_audit_log(result) if isinstance(result, dict) else {}


def _map_approval_log_entry(record: dict[str, Any]) -> ApprovalLogEntry:
    # u_final_action is a restricted choice list that can blank our value, so the
    # authoritative approved/denied signal is u_val_agent_auth (true = approved).
    raw_action = _field_value(record.get("u_final_action")).lower()
    if raw_action in ("approved", "denied"):
        decision = raw_action
    elif _truthy_snow(record.get("u_val_agent_auth")):
        decision = "approved"
    elif _field_value(record.get("u_val_agent_auth")):
        decision = "denied"
    else:
        decision = "unknown"
    return ApprovalLogEntry(
        sys_id=_field_value(record.get("sys_id")),
        timestamp=_field_best(record.get("sys_created_on")),
        decision=decision,  # type: ignore[arg-type]
        detail=_field_best(record.get("u_rejection_reason")),
        created_by=_field_best(record.get("sys_created_by")),
    )


async def fetch_approval_log(
    settings: Settings,
    limit: int = 50,
    http_client: httpx.AsyncClient | None = None,
) -> list[ApprovalLogEntry]:
    """Return UC2 human-approval-gate decisions (newest first) from the audit table."""
    params = {
        "sysparm_query": "u_agent_identity=human_approval_gate^ORDERBYDESCsys_created_on",
        "sysparm_fields": (
            "sys_id,sys_created_on,u_final_action,u_rejection_reason,"
            "u_val_agent_auth,sys_created_by"
        ),
        "sysparm_display_value": "all",
        "sysparm_limit": str(max(1, min(limit, 200))),
    }

    async def run(client: httpx.AsyncClient) -> httpx.Response:
        return await client.get(
            f"{settings.snow_base_url}/api/now/table/u_ai_action_audit_log",
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
    return [_map_approval_log_entry(r) for r in records if isinstance(r, dict)]


async def create_guardrail_audit_log(
    settings: Settings,
    *,
    request_text: str,
    http_client: httpx.AsyncClient | None = None,
) -> dict[str, str]:
    """Record an LLM02 sensitive-information-disclosure block in the audit table."""
    # Note: u_action_type is a restricted choice list with no PII-read value, so we
    # intentionally don't set it (it would be rejected/blanked). The LLM02 page shows
    # a meaningful action label, and u_rejection_reason carries the full context.
    payload = {
        "u_agent_identity": GUARDRAIL_AGENT_IDENTITY,
        "u_final_action": GUARDRAIL_FINAL_ACTION,
        "u_rejection_reason": GUARDRAIL_REJECTION_REASON,
        "u_patient_id_anon": "REDACTED",
        "u_val_agent_auth": "false",
        "u_val_patient_ok": "false",
        "u_val_slot_avail": "false",
        "u_val_specialty": "false",
        "u_val_no_dup": "false",
    }

    async def run(client: httpx.AsyncClient) -> httpx.Response:
        return await client.post(
            f"{settings.snow_base_url}/api/now/table/u_ai_action_audit_log",
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
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
        raise ServiceNowError("ServiceNow audit-log creation failed: invalid JSON response") from exc

    result = body.get("result") if isinstance(body, dict) else None
    if not isinstance(result, dict):
        raise ServiceNowError("ServiceNow audit-log creation response did not include a result object")

    return _map_audit_log(result)


async def fetch_guardrail_audit_logs(
    settings: Settings,
    *,
    limit: int = 200,
    http_client: httpx.AsyncClient | None = None,
) -> list[dict[str, str]]:
    """Return the LLM02 guardrail rows (blocked, governance_user_identity), newest first."""
    params = {
        "sysparm_query": (
            f"u_agent_identity={GUARDRAIL_AGENT_IDENTITY}"
            f"^u_final_action={GUARDRAIL_FINAL_ACTION}"
            "^ORDERBYDESCsys_created_on"
        ),
        "sysparm_display_value": "all",
        "sysparm_limit": str(limit),
    }

    async def run(client: httpx.AsyncClient) -> httpx.Response:
        return await client.get(
            f"{settings.snow_base_url}/api/now/table/u_ai_action_audit_log",
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

    body = response.json()
    result = body.get("result") if isinstance(body, dict) else None
    if not isinstance(result, list):
        return []
    return [_map_audit_log(row) for row in result if isinstance(row, dict)]


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


async def search_patients(
    settings: Settings,
    query: str,
    limit: int = 8,
    http_client: httpx.AsyncClient | None = None,
) -> list[PatientSearchResult]:
    """Typeahead search across patient first/last name and email (LIKE)."""
    q = _service_now_query_value(query or "")
    if len(q) < 2:
        return []

    clauses = [
        f"u_first_nameLIKE{q}",
        f"u_last_nameLIKE{q}",
        f"u_emailLIKE{q}",
    ]
    # If the user typed two words, also match "first AND last" as a strong clause.
    first, last = (_service_now_query_value(p) for p in _first_last_from_name(query))
    if first and last:
        clauses.append(f"u_first_nameLIKE{first}^u_last_nameLIKE{last}")
    snow_query = "^NQ".join(clauses) + "^ORDERBYu_first_name"

    params = {
        "sysparm_query": snow_query,
        "sysparm_fields": "sys_id,u_patient_id,u_first_name,u_last_name,u_email",
        "sysparm_display_value": "true",
        "sysparm_limit": str(max(1, min(limit, 25))),
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

    results: list[PatientSearchResult] = []
    seen: set[str] = set()
    for record in response.json().get("result", []):
        if not isinstance(record, dict):
            continue
        sys_id = _field_best(record.get("sys_id"))
        if not sys_id:
            continue
        name = " ".join(
            part
            for part in (
                _field_best(record.get("u_first_name")),
                _field_best(record.get("u_last_name")),
            )
            if part
        ).strip()
        email = _field_best(record.get("u_email"))
        # Collapse duplicate test records that share the same name + email.
        dedupe_key = f"{name.lower()}|{email.lower()}" if (name or email) else sys_id
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        results.append(
            PatientSearchResult(
                sys_id=sys_id,
                patient_id=_field_best(record.get("u_patient_id")),
                name=name,
                email=email,
            )
        )
    return results


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
        triage_priority=_field_best(record.get("u_triage_priority")),
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

        await create_notification(
            settings,
            audience="both",
            notification_type="appointment_created",
            message=(
                f"Appointment booked with {appointment.doctor_name} on "
                f"{appointment.date} at {appointment.start_time}."
            ),
            patient_sys_id=profile.sys_id,
            doctor_sys_id=booking.doctor_record_id,
            appointment_sys_id=_field_value(record.get("sys_id")),
            http_client=client,
        )
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


# ---------------------------------------------------------------------------
# Summary notes (u_summary_notes) — clinician "My notes"
# ---------------------------------------------------------------------------

def _dotwalk_full_name(record: dict[str, Any], prefix: str) -> str:
    """Build "First Last" from dot-walked name fields, falling back to the
    reference display value (which is just the first name on these tables)."""
    first = _field_best(record.get(f"{prefix}.u_first_name"))
    last = _field_best(record.get(f"{prefix}.u_last_name"))
    name = " ".join(part for part in (first, last) if part).strip()
    return name or _field_display(record.get(prefix))


def _map_doctor_appointment_option(record: dict[str, Any]) -> DoctorAppointmentOption:
    return DoctorAppointmentOption(
        appointment_record_id=_field_best(record.get("sys_id")),
        appointment_id=_field_best(record.get("u_appointment_id")),
        date=_date_value(record.get("u_appointment_date")),
        start_time=_time_value(record.get("u_appointment_time")),
        status=_field_value(record.get("u_status")),
        status_label=_field_display(record.get("u_status")),
        reason_category=_field_best(record.get("u_reason_category")),
        reason_text=_field_best(record.get("u_reason_text")),
        triage_priority=_field_best(record.get("u_triage_priority")),
        patient_sys_id=_field_value(record.get("u_patient")),
        patient_name=_dotwalk_full_name(record, "u_patient"),
    )


def _map_summary_note(record: dict[str, Any]) -> SummaryNoteResponse:
    return SummaryNoteResponse(
        sys_id=_field_best(record.get("sys_id")),
        summary_note_id=_field_best(record.get("u_summary_note_id")),
        appointment_record_id=_field_value(record.get("u_appointment")),
        appointment_id=_field_best(record.get("u_appointment.u_appointment_id")),
        doctor_record_id=_field_value(record.get("u_doctor")),
        doctor_name=_dotwalk_full_name(record, "u_doctor"),
        patient_sys_id=_field_value(record.get("u_patient")),
        patient_name=_dotwalk_full_name(record, "u_patient"),
        date=_date_value(record.get("u_appointment_date")),
        start_time=_time_value(record.get("u_appointment_time")),
        notes=_field_best(record.get("u_notes")),
        logged_by=_field_best(record.get("u_logged_by")),
        created_on=_field_best(record.get("sys_created_on")),
    )


async def fetch_doctor_appointment_options(
    settings: Settings,
    doctor_sys_id: str,
    http_client: httpx.AsyncClient | None = None,
) -> list[DoctorAppointmentOption]:
    """Return every appointment for a doctor (no date bound) for the note picker."""

    async def run(client: httpx.AsyncClient) -> list[DoctorAppointmentOption]:
        response = await client.get(
            f"{settings.snow_base_url}/api/now/table/u_appointment",
            params={
                "sysparm_query": (
                    f"u_doctor={_service_now_query_value(doctor_sys_id)}"
                    "^ORDERBYDESCu_appointment_date^ORDERBYu_appointment_time"
                ),
                "sysparm_fields": ",".join(DOCTOR_APPOINTMENT_OPTION_FIELDS),
                "sysparm_display_value": "all",
                "sysparm_limit": "1000",
            },
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if not response.is_success:
            _raise_snow_error(response)
        records = response.json().get("result", [])
        if not isinstance(records, list):
            raise ServiceNowError("ServiceNow appointment options response did not include a result list")
        return [_map_doctor_appointment_option(r) for r in records if isinstance(r, dict)]

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def fetch_appointment_option(
    settings: Settings,
    appointment_record_id: str,
    http_client: httpx.AsyncClient | None = None,
) -> DoctorAppointmentOption | None:
    """Return a single appointment (for the appointment detail page)."""

    async def run(client: httpx.AsyncClient) -> DoctorAppointmentOption | None:
        response = await client.get(
            f"{settings.snow_base_url}/api/now/table/u_appointment",
            params={
                "sysparm_query": f"sys_id={_service_now_query_value(appointment_record_id)}",
                "sysparm_fields": ",".join(DOCTOR_APPOINTMENT_OPTION_FIELDS),
                "sysparm_display_value": "all",
                "sysparm_limit": "1",
            },
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if not response.is_success:
            _raise_snow_error(response)
        records = response.json().get("result", [])
        if not isinstance(records, list) or not records or not isinstance(records[0], dict):
            return None
        return _map_doctor_appointment_option(records[0])

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def fetch_summary_notes(
    settings: Settings,
    doctor_sys_id: str | None = None,
    appointment_record_id: str | None = None,
    patient_sys_id: str | None = None,
    limit: int = 200,
    http_client: httpx.AsyncClient | None = None,
) -> list[SummaryNoteResponse]:
    """Return u_summary_notes, newest first, optionally scoped to a doctor, appointment and/or patient."""
    parts = []
    if doctor_sys_id:
        parts.append(f"u_doctor={_service_now_query_value(doctor_sys_id)}")
    if appointment_record_id:
        parts.append(f"u_appointment={_service_now_query_value(appointment_record_id)}")
    if patient_sys_id:
        parts.append(f"u_patient={_service_now_query_value(patient_sys_id)}")
    parts.append("ORDERBYDESCsys_created_on")
    query = "^".join(parts)

    async def run(client: httpx.AsyncClient) -> list[SummaryNoteResponse]:
        response = await client.get(
            f"{settings.snow_base_url}/api/now/table/u_summary_notes",
            params={
                "sysparm_query": query,
                "sysparm_fields": ",".join(SUMMARY_NOTE_FIELDS),
                "sysparm_display_value": "all",
                "sysparm_limit": str(max(1, min(limit, 1000))),
            },
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if not response.is_success:
            _raise_snow_error(response)
        records = response.json().get("result", [])
        if not isinstance(records, list):
            raise ServiceNowError("ServiceNow summary notes response did not include a result list")
        return [_map_summary_note(r) for r in records if isinstance(r, dict)]

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def create_summary_note(
    settings: Settings,
    note: SummaryNoteRequest,
    http_client: httpx.AsyncClient | None = None,
) -> SummaryNoteResponse:
    """Create a u_summary_notes record, deriving doctor/patient/date/time from
    the linked appointment so the stored record can never be inconsistent."""

    async def run(client: httpx.AsyncClient) -> SummaryNoteResponse:
        appt_response = await client.get(
            f"{settings.snow_base_url}/api/now/table/u_appointment",
            params={
                "sysparm_query": f"sys_id={_service_now_query_value(note.appointment_record_id)}",
                "sysparm_fields": "sys_id,u_doctor,u_patient,u_appointment_date,u_appointment_time",
                "sysparm_display_value": "all",
                "sysparm_limit": "1",
            },
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if not appt_response.is_success:
            _raise_snow_error(appt_response)
        appts = appt_response.json().get("result", [])
        if not isinstance(appts, list) or not appts or not isinstance(appts[0], dict):
            raise SummaryNoteAppointmentNotFoundError("Appointment not found for this note.")
        appt = appts[0]

        # glide_time value comes back as "1970-01-01 HH:MM:SS"; store just the
        # time portion so the new note round-trips to the same displayed time.
        time_raw = _field_value(appt.get("u_appointment_time"))
        time_portion = time_raw.split(" ")[-1] if time_raw else ""

        payload = {
            "u_summary_note_id": f"SN-{uuid4().hex[:12].upper()}",
            "u_appointment": _field_value(appt.get("sys_id")) or note.appointment_record_id,
            "u_doctor": _field_value(appt.get("u_doctor")),
            "u_patient": _field_value(appt.get("u_patient")),
            "u_appointment_date": _field_value(appt.get("u_appointment_date")),
            "u_appointment_time": time_portion,
            "u_notes": note.notes,
            "u_logged_by": note.logged_by or "",
        }

        create_response = await client.post(
            f"{settings.snow_base_url}/api/now/table/u_summary_notes",
            params={
                "sysparm_fields": ",".join(SUMMARY_NOTE_FIELDS),
                "sysparm_display_value": "all",
            },
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if not create_response.is_success:
            _raise_snow_error(create_response)
        record = create_response.json().get("result", {})
        if not isinstance(record, dict):
            raise ServiceNowError("ServiceNow summary note create response did not include a result object")
        summary = _map_summary_note(record)
        await create_notification(
            settings,
            audience="both",
            notification_type="summary_note_added",
            message=(
                f"A summary note was added for the appointment on "
                f"{summary.date or '—'} at {summary.start_time or '—'}."
            ),
            patient_sys_id=_field_value(appt.get("u_patient")),
            doctor_sys_id=_field_value(appt.get("u_doctor")),
            appointment_sys_id=_field_value(appt.get("sys_id")) or note.appointment_record_id,
            summary_note_sys_id=_field_value(record.get("sys_id")),
            http_client=client,
        )
        return summary

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


# ---------------------------------------------------------------------------
# Mutations across the 4 core tables (appointment / patient / summary notes)
# ---------------------------------------------------------------------------

async def update_appointment(
    settings: Settings,
    record_id: str,
    *,
    status: str | None = None,
    date: str | None = None,
    start_time: str | None = None,
    check_conflict: bool = True,
    http_client: httpx.AsyncClient | None = None,
) -> DoctorAppointmentOption:
    """Update an appointment's status and/or date/time (cancel, complete, reschedule)."""

    async def run(client: httpx.AsyncClient) -> DoctorAppointmentOption:
        # Load the current record so we know the doctor + can validate a reschedule.
        existing = await client.get(
            f"{settings.snow_base_url}/api/now/table/u_appointment/{_service_now_query_value(record_id)}",
            params={"sysparm_fields": "sys_id,u_doctor", "sysparm_display_value": "all"},
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if existing.status_code == 404:
            raise SummaryNoteAppointmentNotFoundError("Appointment not found.")
        if not existing.is_success:
            _raise_snow_error(existing)
        current = existing.json().get("result", {})
        doctor_record_id = _field_value(current.get("u_doctor"))

        payload: dict[str, str] = {}
        if status is not None:
            payload["u_status"] = status
        if date is not None:
            payload["u_appointment_date"] = date
        if start_time is not None:
            payload["u_appointment_time"] = start_time

        # Conflict check when rescheduling to a new date/time.
        if check_conflict and (date is not None or start_time is not None) and doctor_record_id:
            new_date = date
            if new_date is None:
                # No date change — need the existing date to check conflicts.
                full = await client.get(
                    f"{settings.snow_base_url}/api/now/table/u_appointment/{_service_now_query_value(record_id)}",
                    params={"sysparm_fields": "u_appointment_date", "sysparm_display_value": "false"},
                    headers={"Accept": "application/json"},
                    auth=(settings.snow_username, settings.snow_password),
                )
                new_date = _field_value(full.json().get("result", {}).get("u_appointment_date"))
            if new_date and start_time is not None:
                conflicts = await _fetch_doctor_appointments_for_date(
                    settings, client, doctor_record_id, new_date
                )
                for appt in conflicts:
                    if (
                        appt.appointment_record_id != record_id
                        and _time_key(appt.start_time) == _time_key(start_time)
                        and not is_cancelled_booking_status(appt.status)
                    ):
                        raise BookingConflictError("That time is already booked for this doctor.")

        response = await client.patch(
            f"{settings.snow_base_url}/api/now/table/u_appointment/{_service_now_query_value(record_id)}",
            params={
                "sysparm_fields": ",".join(DOCTOR_APPOINTMENT_OPTION_FIELDS),
                "sysparm_display_value": "all",
            },
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if not response.is_success:
            _raise_snow_error(response)
        record = response.json().get("result", {})
        option = _map_doctor_appointment_option(record)

        if status is not None:
            type_map = {
                "confirmed": "appointment_confirmed",
                "cancelled": "appointment_cancelled",
                "completed": "appointment_completed",
            }
            notif_type = type_map.get(status.strip().lower())
            if notif_type:
                verb = {
                    "appointment_confirmed": "confirmed",
                    "appointment_cancelled": "cancelled",
                    "appointment_completed": "marked complete",
                }[notif_type]
                await create_notification(
                    settings,
                    audience="both",
                    notification_type=notif_type,
                    message=(
                        f"Appointment on {option.date or '—'} at {option.start_time or '—'} "
                        f"was {verb}."
                    ),
                    patient_sys_id=_field_value(record.get("u_patient")) or option.patient_sys_id,
                    doctor_sys_id=doctor_record_id,
                    appointment_sys_id=record_id,
                    http_client=client,
                )
        return option

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def create_clinician_appointment(
    settings: Settings,
    req: ClinicianAppointmentCreateRequest,
    http_client: httpx.AsyncClient | None = None,
) -> DoctorAppointmentOption:
    """Create an appointment from the clinician portal (patient sys_id already known)."""

    async def run(client: httpx.AsyncClient) -> DoctorAppointmentOption:
        conflicts = await _fetch_doctor_appointments_for_date(
            settings, client, req.doctor_record_id, req.date
        )
        for appt in conflicts:
            if _time_key(appt.start_time) == _time_key(req.start_time) and not is_cancelled_booking_status(appt.status):
                raise BookingConflictError("That time is already booked for this doctor.")

        payload = {
            "u_appointment_id": f"APT-{uuid4().hex[:12].upper()}",
            "u_doctor": req.doctor_record_id,
            "u_patient": req.patient_sys_id,
            "u_appointment_date": req.date,
            "u_appointment_time": req.start_time,
            "u_status": "confirmed",
            "u_reason_category": _booking_reason_category(req.reason_category),
            "u_reason_text": req.reason_text or "Booked via clinician portal",
            "u_triage_priority": _booking_triage_priority(req.reason_category),
            "u_created_by_agent": "careatlas-clinician-portal",
        }
        response = await client.post(
            f"{settings.snow_base_url}/api/now/table/u_appointment",
            params={
                "sysparm_fields": ",".join(DOCTOR_APPOINTMENT_OPTION_FIELDS),
                "sysparm_display_value": "all",
            },
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if not response.is_success:
            _raise_snow_error(response)
        record = response.json().get("result", {})
        option = _map_doctor_appointment_option(record)
        await create_notification(
            settings,
            audience="both",
            notification_type="appointment_created",
            message=(
                f"Appointment scheduled on {option.date or req.date} at "
                f"{option.start_time or req.start_time}."
            ),
            patient_sys_id=req.patient_sys_id,
            doctor_sys_id=req.doctor_record_id,
            appointment_sys_id=_field_value(record.get("sys_id")),
            http_client=client,
        )
        return option

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def update_summary_note(
    settings: Settings,
    sys_id: str,
    notes: str,
    http_client: httpx.AsyncClient | None = None,
) -> SummaryNoteResponse:
    """Edit the text of an existing summary note."""

    async def run(client: httpx.AsyncClient) -> SummaryNoteResponse:
        response = await client.patch(
            f"{settings.snow_base_url}/api/now/table/u_summary_notes/{_service_now_query_value(sys_id)}",
            params={"sysparm_fields": ",".join(SUMMARY_NOTE_FIELDS), "sysparm_display_value": "all"},
            json={"u_notes": notes},
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if response.status_code == 404:
            raise SummaryNoteAppointmentNotFoundError("Summary note not found.")
        if not response.is_success:
            _raise_snow_error(response)
        record = response.json().get("result", {})
        summary = _map_summary_note(record)
        await create_notification(
            settings,
            audience="both",
            notification_type="summary_note_updated",
            message=(
                f"A summary note was updated for the appointment on "
                f"{summary.date or '—'} at {summary.start_time or '—'}."
            ),
            patient_sys_id=_field_value(record.get("u_patient")) or summary.patient_sys_id,
            doctor_sys_id=_field_value(record.get("u_doctor")) or summary.doctor_record_id,
            appointment_sys_id=_field_value(record.get("u_appointment")) or summary.appointment_record_id,
            summary_note_sys_id=sys_id,
            http_client=client,
        )
        return summary

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def delete_summary_note(
    settings: Settings,
    sys_id: str,
    http_client: httpx.AsyncClient | None = None,
) -> None:
    """Delete a summary note."""

    async def run(client: httpx.AsyncClient) -> None:
        response = await client.delete(
            f"{settings.snow_base_url}/api/now/table/u_summary_notes/{_service_now_query_value(sys_id)}",
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if response.status_code not in (200, 204, 404):
            _raise_snow_error(response)

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def update_registration_status(
    settings: Settings,
    sys_id: str,
    registration_status: str,
    http_client: httpx.AsyncClient | None = None,
) -> PatientRegistrationSummary:
    """Approve / reject a patient registration (u_patient.u_registration_status)."""

    async def run(client: httpx.AsyncClient) -> PatientRegistrationSummary:
        response = await client.patch(
            f"{settings.snow_base_url}/api/now/table/u_patient/{_service_now_query_value(sys_id)}",
            params={"sysparm_fields": ",".join(REGISTRATION_SUMMARY_FIELDS), "sysparm_display_value": "all"},
            json={"u_registration_status": registration_status},
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if response.status_code == 404:
            raise BookingPatientNotFoundError("Patient registration not found.")
        if not response.is_success:
            _raise_snow_error(response)
        summary = _map_registration_summary(response.json().get("result", {}))

        status_norm = (registration_status or "").strip().lower()
        notif_type = (
            "registration_approved"
            if status_norm in {"approved", "active"}
            else "registration_rejected"
            if status_norm in {"rejected", "denied"}
            else None
        )
        if notif_type:
            name = " ".join(p for p in (summary.first_name, summary.last_name) if p).strip()
            verb = "approved" if notif_type == "registration_approved" else "rejected"
            await create_notification(
                settings,
                audience="patient",
                notification_type=notif_type,
                message=f"Your registration{f' for {name}' if name else ''} was {verb}.",
                patient_sys_id=summary.sys_id or sys_id,
                http_client=client,
            )
        return summary

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


# Patient self-editable fields → ServiceNow columns.
_PATIENT_EDITABLE_FIELDS = {
    "phone": "u_phone",
    "address_line1": "u_address_line1",
    "address_line2": "u_address_line2",
    "city": "u_city",
    "postcode": "u_postcode",
    "emergency_name": "u_emergency_name",
    "emergency_phone": "u_emergency_phone",
    "emergency_relationship": "u_emergency_relationship",
    "time_preference": "u_time_preference",
    "primary_language": "u_primary_language",
}


async def update_patient_profile(
    settings: Settings,
    req: PatientProfileUpdateRequest,
    http_client: httpx.AsyncClient | None = None,
) -> PatientProfileResponse:
    """Update the patient-editable subset of a u_patient record."""
    payload: dict[str, str] = {}
    for field, column in _PATIENT_EDITABLE_FIELDS.items():
        value = getattr(req, field)
        if value is not None:
            payload[column] = value
    if not payload:
        raise ValueError("No editable fields provided.")

    async def run(client: httpx.AsyncClient) -> PatientProfileResponse:
        response = await client.patch(
            f"{settings.snow_base_url}/api/now/table/u_patient/{_service_now_query_value(req.sys_id)}",
            params={"sysparm_fields": ",".join(PATIENT_PROFILE_FIELDS), "sysparm_display_value": "all"},
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if response.status_code == 404:
            raise BookingPatientNotFoundError("Patient not found.")
        if not response.is_success:
            _raise_snow_error(response)
        return _map_patient_profile(response.json().get("result", {}))

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


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


async def summarize_acl_posture(
    settings: Settings,
    http_client: httpx.AsyncClient | None = None,
) -> "AclSummaryResponse":
    """Run every governed agent's ACL probes and aggregate the least-privilege posture."""
    import asyncio

    agents = list(ACL_TEST_PROBES.keys())

    async def run(client: httpx.AsyncClient) -> AclSummaryResponse:
        results = await asyncio.gather(
            *(test_service_account_acl(settings, a, http_client=client) for a in agents),
            return_exceptions=True,
        )
        summary = AclSummaryResponse(agents_tested=0)
        for result in results:
            if isinstance(result, Exception) or not isinstance(result, AclTestResponse):
                continue
            summary.agents_tested += 1
            if result.overall_status == "passed":
                summary.agents_passed += 1
            for check in result.checks:
                summary.checks_total += 1
                if check.expected == "denied":
                    if check.actual == "denied":
                        summary.access_blocked += 1
                        if check.operation == "write":
                            summary.write_denials += 1
                    elif check.actual == "allowed":
                        summary.leaks += 1
        return summary

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def _run_acl_probe(
    settings: Settings,
    client: httpx.AsyncClient,
    username: str,
    probe: AclProbe,
) -> AclTestCheck:
    if probe.operation == "write":
        return await _run_acl_write_probe(settings, client, username, probe)

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


async def _run_acl_write_probe(
    settings: Settings,
    client: httpx.AsyncClient,
    username: str,
    probe: AclProbe,
) -> AclTestCheck:
    """Attempt a create as the agent; a denial (401/403) proves least-privilege.

    If the create unexpectedly succeeds it is an excessive-agency leak — the record
    is immediately deleted (cleanup) and the probe reports "allowed".
    """
    payload = {key: value for key, value in probe.write_payload} or {"u_active": "false"}
    response = await client.post(
        f"{settings.snow_base_url}/api/now/table/{probe.table}",
        json=payload,
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        auth=(username, settings.snow_password),
    )

    if response.status_code in (401, 403):
        return _acl_check(
            probe,
            actual="denied",
            status_code=response.status_code,
            detail=f"Write denied (HTTP {response.status_code}).",
        )

    if response.status_code in (201, 200):
        # Leak: the agent could create the record. Clean it up so the probe is
        # non-destructive, then report the violation.
        created = response.json().get("result", {}) if response.content else {}
        created_id = _field_value(created.get("sys_id")) if isinstance(created, dict) else ""
        if created_id:
            await client.delete(
                f"{settings.snow_base_url}/api/now/table/{probe.table}/{created_id}",
                headers={"Accept": "application/json"},
                auth=(settings.snow_username, settings.snow_password),
            )
        return _acl_check(
            probe,
            actual="allowed",
            status_code=response.status_code,
            detail="Write succeeded — excessive-agency leak (test record removed).",
        )

    # A 400/other usually means the write got past the ACL but failed validation,
    # which still indicates the operation was not blocked by least-privilege.
    return _acl_check(
        probe,
        actual="error",
        status_code=response.status_code,
        detail=_error_detail(response),
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
        operation=probe.operation,
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


# ---------------------------------------------------------------------------
# UC1 Privacy — Sensitive Information Disclosure (OWASP LLM02)
# Live evidence for the "Data Privacy & PII Protection" panel: field-level PII
# ACLs (Wall 1), the PII output guardrail (Wall 2), and the anonymized audit
# log (Wall 3). Every value below is read live from ServiceNow — no demo data.
# ---------------------------------------------------------------------------

# PII columns on u_patient that must be denied to non-human agent identities.
PII_PATIENT_FIELDS: tuple[tuple[str, str], ...] = (
    ("u_first_name", "First name"),
    ("u_last_name", "Last name"),
    ("u_email", "Email"),
    ("u_phone", "Phone"),
    ("u_date_of_birth", "Date of birth"),
    ("u_insurance_id", "Insurance ID"),
)

# Non-PII control field the deny-probe should always be able to read, proving the
# agent can reach the table (so an absent PII field means field-deny, not table-deny).
_PII_PROBE_CONTROL_FIELDS = ("sys_id", "u_patient_id")


async def fetch_privacy_controls(
    settings: Settings,
    http_client: httpx.AsyncClient | None = None,
) -> PrivacyControlsResponse:
    """Assemble the live UC1 privacy posture from ServiceNow."""

    async def run(client: httpx.AsyncClient) -> PrivacyControlsResponse:
        pii_fields = await _privacy_acl_status(settings, client)
        protected = [f for f in pii_fields if f.protected]
        if not protected:
            acl_status: Literal["enforced", "partial", "off"] = "off"
        elif len(protected) == len(pii_fields):
            acl_status = "enforced"
        else:
            acl_status = "partial"

        probe = await _privacy_deny_probe(settings, client)
        filters = await _privacy_filter_status(settings, client)
        patterns = await _privacy_pii_pattern_count(settings, client)
        log = await _privacy_anonymization(settings, client)

        return PrivacyControlsResponse(
            pii_acl_status=acl_status,
            protected_field_count=len(protected),
            pii_fields=pii_fields,
            deny_probe_ran=probe["ran"],
            deny_probe_passed=probe["passed"],
            deny_probe_detail=probe["detail"],
            visible_pii_fields=probe["visible"],
            redaction_on=filters["active_pii"] > 0,
            active_pii_filters=filters["active_pii"],
            active_filter_total=filters["active_total"],
            pii_pattern_count=patterns,
            anonymization_rate=log["rate"],
            decision_log_rows=log["total"],
            anonymized_rows=log["anonymized"],
        )

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def _privacy_acl_status(
    settings: Settings, client: httpx.AsyncClient
) -> list[PiiFieldAclStatus]:
    """Which u_patient PII fields have an active field-level read ACL guarding them."""
    names = ",".join(f"u_patient.{field}" for field, _ in PII_PATIENT_FIELDS)
    response = await client.get(
        f"{settings.snow_base_url}/api/now/table/sys_security_acl",
        params={
            "sysparm_query": f"operation=read^active=true^nameIN{names}",
            "sysparm_fields": "name",
            "sysparm_limit": "200",
        },
        headers={"Accept": "application/json"},
        auth=(settings.snow_username, settings.snow_password),
    )
    guarded: set[str] = set()
    if response.is_success:
        for record in response.json().get("result", []):
            guarded.add(_field_value(record.get("name")))
    return [
        PiiFieldAclStatus(
            field=field,
            label=label,
            protected=f"u_patient.{field}" in guarded,
        )
        for field, label in PII_PATIENT_FIELDS
    ]


async def _privacy_deny_probe(
    settings: Settings, client: httpx.AsyncClient
) -> dict[str, Any]:
    """Read u_patient as the non-human agent identity; PII columns should be stripped."""
    username = settings.snow_pii_agent_username
    password = settings.snow_pii_agent_password
    if not username or not password:
        return {
            "ran": False,
            "passed": False,
            "detail": "No agent identity configured (SNOW_PII_AGENT_USERNAME).",
            "visible": [],
        }

    pii_field_names = [field for field, _ in PII_PATIENT_FIELDS]
    fields = list(_PII_PROBE_CONTROL_FIELDS) + pii_field_names
    response = await client.get(
        f"{settings.snow_base_url}/api/now/table/u_patient",
        params={"sysparm_fields": ",".join(fields), "sysparm_limit": "1"},
        headers={"Accept": "application/json"},
        auth=(username, password),
    )

    if response.status_code in (401, 403):
        # Whole table denied — still a deny, but not the field-level story we want.
        return {
            "ran": True,
            "passed": True,
            "detail": f"Agent denied at the table level (HTTP {response.status_code}).",
            "visible": [],
        }
    if not response.is_success:
        return {
            "ran": True,
            "passed": False,
            "detail": _error_detail(response),
            "visible": [],
        }

    records = response.json().get("result", [])
    if not records:
        return {
            "ran": True,
            "passed": False,
            "detail": "No patient records returned to probe.",
            "visible": [],
        }

    record = records[0] if isinstance(records[0], dict) else {}
    visible = [name for name in pii_field_names if name in record]
    reached_table = any(name in record for name in _PII_PROBE_CONTROL_FIELDS)
    passed = reached_table and not visible
    if passed:
        detail = "Agent read non-PII columns; all PII columns stripped by field-level ACL."
    elif visible:
        detail = f"Leak — agent could read PII columns: {', '.join(visible)}."
    else:
        detail = "Agent could not reach the patient table to prove field-level denial."
    return {"ran": True, "passed": passed, "detail": detail, "visible": visible}


async def _privacy_filter_status(
    settings: Settings, client: httpx.AsyncClient
) -> dict[str, int]:
    """Count active Gen AI content filters, and those scoped to PII redaction."""
    response = await client.get(
        f"{settings.snow_base_url}/api/now/table/sys_gen_ai_filter",
        params={
            "sysparm_query": "active=true",
            "sysparm_fields": "filter_name,filter_type",
            "sysparm_limit": "200",
        },
        headers={"Accept": "application/json"},
        auth=(settings.snow_username, settings.snow_password),
    )
    active_total = 0
    active_pii = 0
    if response.is_success:
        for record in response.json().get("result", []):
            active_total += 1
            name = _field_value(record.get("filter_name")).lower()
            if "pii" in name or "privacy" in name:
                active_pii += 1
    return {"active_total": active_total, "active_pii": active_pii}


async def _privacy_pii_pattern_count(settings: Settings, client: httpx.AsyncClient) -> int:
    """Count deterministic PII data patterns (SSN, DOB, email, phone, card)."""
    query = (
        "nameLIKEsocial^ORnameLIKEbirth^ORnameLIKEemail"
        "^ORnameLIKEphone^ORnameLIKEcredit card"
    )
    response = await client.get(
        f"{settings.snow_base_url}/api/now/stats/sn_data_discovery_data_pattern",
        params={"sysparm_query": query, "sysparm_count": "true"},
        headers={"Accept": "application/json"},
        auth=(settings.snow_username, settings.snow_password),
    )
    if not response.is_success:
        return 0
    try:
        return int(response.json()["result"]["stats"]["count"])
    except (KeyError, TypeError, ValueError):
        return 0


async def _privacy_anonymization(settings: Settings, client: httpx.AsyncClient) -> dict[str, int]:
    """Share of u_ai_decision_log rows keyed on an anonymized token, not a raw id."""
    response = await client.get(
        f"{settings.snow_base_url}/api/now/table/u_ai_decision_log",
        params={"sysparm_fields": "u_patient_id_anon", "sysparm_limit": "1000"},
        headers={"Accept": "application/json"},
        auth=(settings.snow_username, settings.snow_password),
    )
    if not response.is_success:
        return {"total": 0, "anonymized": 0, "rate": 0}
    rows = response.json().get("result", [])
    total = len(rows)
    anonymized = sum(1 for r in rows if _field_value(r.get("u_patient_id_anon")))
    rate = round(anonymized / total * 100) if total else 0
    return {"total": total, "anonymized": anonymized, "rate": rate}


# ---------------------------------------------------------------------------
# UC1 Privacy — live role-based redaction demo
# Read ONE patient record as two differently-scoped non-human agents and show,
# side by side, exactly which PII the field-level ACL strips for the agent that
# lacks role_patient_pii. The redaction happens in ServiceNow, not here.
# ---------------------------------------------------------------------------

# (key, label, category) for the fields shown in the comparison.
PATIENT_ACCESS_FIELDS: tuple[tuple[str, str, str], ...] = (
    ("u_patient_id", "Patient ref ID", "safe"),
    ("u_health_condition", "Health condition", "safe"),
    ("u_account_status", "Account status", "safe"),
    ("u_first_name", "First name", "pii"),
    ("u_last_name", "Last name", "pii"),
    ("u_date_of_birth", "Date of birth", "pii"),
    ("u_email", "Email", "pii"),
    ("u_phone", "Phone", "pii"),
    ("u_gender", "Gender", "pii"),
    ("u_ethnicity", "Ethnicity", "pii"),
    ("u_insurance_id", "Insurance ID", "pii"),
)

_ACCESS_QUERY_FIELDS = ["sys_id"] + [key for key, _, _ in PATIENT_ACCESS_FIELDS]


# ---------------------------------------------------------------------------
# UC2 (portal continuation) — page-scoped AI agents bounded by their ACL identity.
# Each portal page's "Ask AI" assistant runs as a named svc-* identity; when asked
# about a patient it reads the record live AS that identity, so PII / out-of-scope
# fields are stripped by ServiceNow (not by the app), proving least privilege.
# ---------------------------------------------------------------------------

# agent_key -> (username, label, scope sentence, allowed (field,label) pairs)
SCOPED_AGENTS: dict[str, dict[str, Any]] = {
    "scheduling": {
        "username": "svc-scheduling-agent",
        "label": "Scheduling Agent",
        "scope": "rank appointment slots from non-PII scheduling signals",
        "allowed": (
            ("u_health_condition", "Health condition"),
            ("u_accessibility", "Accessibility need"),
            ("u_time_preference", "Time preference"),
            ("u_account_status", "Account status"),
        ),
    },
    "triage": {
        "username": "svc-triage-agent",
        "label": "Triage Agent",
        "scope": "assign a triage priority from the visit reason and health condition",
        "allowed": (
            ("u_reason_text", "Reason for visit"),
            ("u_health_condition", "Health condition"),
        ),
    },
    "notes": {
        "username": "svc-notes-agent",
        "label": "Clinical Notes Agent",
        "scope": "read and write appointment notes (it is denied the patient record's PII)",
        "allowed": (
            ("u_health_condition", "Health condition"),
            ("u_account_status", "Account status"),
        ),
    },
    "reminder": {
        "username": "svc-reminder-agent",
        "label": "Reminder Agent",
        "scope": "read appointment timing to send reminders",
        "allowed": (
            ("u_time_preference", "Time preference"),
            ("u_account_status", "Account status"),
        ),
    },
    "identity": {
        "username": "svc-identity-verification-agent",
        "label": "Identity Verification Agent",
        "scope": "verify identity from registration status and confidence score",
        "allowed": (
            ("u_registration_status", "Registration status"),
            ("u_confidence_score", "Identity confidence"),
        ),
    },
}

# PII fields every scoped agent is denied (stripped by the field-level ACL).
_SCOPED_PII = (
    ("u_first_name", "First name"),
    ("u_last_name", "Last name"),
    ("u_email", "Email"),
    ("u_phone", "Phone"),
    ("u_date_of_birth", "Date of birth"),
    ("u_gender", "Gender"),
    ("u_ethnicity", "Ethnicity"),
    ("u_insurance_id", "Insurance ID"),
)


async def ask_scoped_agent(
    settings: Settings,
    *,
    agent_key: str,
    question: str,
    patient_email: str = "",
    patient_sys_id: str = "",
    http_client: httpx.AsyncClient | None = None,
) -> "ScopedAgentAnswer":
    """Answer as a page-scoped agent, reading the patient live under its ACL identity."""
    from .approvals import classify_intent, create_request

    config = SCOPED_AGENTS.get(agent_key)
    if config is None:
        raise ServiceNowError(f"Unknown scoped agent: {agent_key}")
    label = config["label"]
    username = config["username"]
    scope = config["scope"]

    # 1) High-impact intent → stop for a human (reuse the UC2 approval gate).
    high_impact, reason = classify_intent(question)
    if high_impact:
        record = create_request(question)
        return ScopedAgentAnswer(
            kind="approval",
            agent_key=agent_key,
            agent_label=label,
            agent_username=username,
            scope=scope,
            request_id=record.request_id,
            intent=record.intent,
            reason=reason,
            reply=(
                f"I'm the {label}. That's a high-impact action ({reason}). I can't do it on "
                f"my own — it's stopped at status: pending_approval for a human to approve."
            ),
        )

    async def run(client: httpx.AsyncClient) -> ScopedAgentAnswer:
        # 2) Resolve which patient to read.
        sys_id, patient_ref = await _resolve_demo_patient(
            settings, client, patient_email or None, sys_id=patient_sys_id or None
        )
        if not sys_id:
            return ScopedAgentAnswer(
                kind="info",
                agent_key=agent_key,
                agent_label=label,
                agent_username=username,
                scope=scope,
                reply=f"I'm the {label} ({username}). My job is to {scope}. No patient record was in context.",
            )

        # 3) Read the record AS this agent identity (PII is stripped by the ACL).
        fields = [f for f, _ in config["allowed"]] + [f for f, _ in _SCOPED_PII]
        response = await client.get(
            f"{settings.snow_base_url}/api/now/table/u_patient/{sys_id}",
            params={"sysparm_fields": ",".join(fields), "sysparm_display_value": "true"},
            headers={"Accept": "application/json"},
            auth=(username, settings.snow_password),
        )
        record = response.json().get("result", {}) if response.is_success else {}
        record = record if isinstance(record, dict) else {}

        allowed = [
            ScopedFieldValue(label=lbl, value=_field_best(record.get(f)))
            for f, lbl in config["allowed"]
            if f in record and _field_best(record.get(f))
        ]
        denied = [lbl for f, lbl in _SCOPED_PII if f not in record]

        allowed_text = (
            "\n".join(f"• {fv.label}: {fv.value}" for fv in allowed) or "• (no in-scope values set)"
        )
        denied_text = ", ".join(denied) or "none"

        reply = (
            f"I'm the {label} ({username}). For patient {patient_ref} I'm authorized to see:\n"
            f"{allowed_text}\n\n"
            f"🔒 Denied by ServiceNow ACL — my identity lacks role_patient_pii, so these were "
            f"stripped from my response and I literally cannot read them: {denied_text}."
        )
        return ScopedAgentAnswer(
            kind="scoped_data",
            agent_key=agent_key,
            agent_label=label,
            agent_username=username,
            scope=scope,
            patient_ref=patient_ref,
            allowed=allowed,
            denied=denied,
            reply=reply,
        )

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def fetch_patient_access_comparison(
    settings: Settings,
    query: str | None = None,
    sys_id: str | None = None,
    http_client: httpx.AsyncClient | None = None,
) -> PatientAccessComparison:
    """Read one patient as the restricted and privileged agents; diff what each sees."""

    async def run(client: httpx.AsyncClient) -> PatientAccessComparison:
        sys_id_resolved, patient_ref = await _resolve_demo_patient(
            settings, client, query, sys_id=sys_id
        )
        if not sys_id_resolved:
            raise ServiceNowError("No patient record found to compare.")

        restricted_record, restricted_meta = await _read_patient_as_agent(
            settings,
            client,
            sys_id_resolved,
            username=settings.snow_pii_agent_username,
            password=settings.snow_pii_agent_password,
            allow_main_fallback=False,
        )
        privileged_record, privileged_meta = await _read_patient_as_agent(
            settings,
            client,
            sys_id_resolved,
            username=settings.snow_clinical_agent_username,
            password=settings.snow_clinical_agent_password,
            allow_main_fallback=True,
        )

        fields: list[PatientFieldAccess] = []
        redacted_count = 0
        for key, label, category in PATIENT_ACCESS_FIELDS:
            priv_val = _field_best(privileged_record.get(key)) if key in privileged_record else ""
            present_for_restricted = key in restricted_record
            rest_val = _field_best(restricted_record.get(key)) if present_for_restricted else ""
            # PII fields are stripped from the restricted agent's response by the ACL.
            redacted = category == "pii" and not present_for_restricted
            if redacted:
                redacted_count += 1
            fields.append(
                PatientFieldAccess(
                    key=key,
                    label=label,
                    category=category,  # type: ignore[arg-type]
                    privileged_value=priv_val,
                    restricted_value=rest_val,
                    redacted_for_restricted=redacted,
                )
            )

        restricted_identity = AgentIdentity(
            key="restricted",
            label="Scheduling Agent",
            username=settings.snow_pii_agent_username or "—",
            role="u_patients_user (no role_patient_pii)",
            has_pii_role=False,
            served_by=restricted_meta["served_by"],
            reachable=restricted_meta["reachable"],
            note=restricted_meta["note"],
        )
        privileged_identity = AgentIdentity(
            key="privileged",
            label="Clinical Agent",
            username=settings.snow_clinical_agent_username or settings.snow_username,
            role="u_patients_user + role_patient_pii",
            has_pii_role=True,
            served_by=privileged_meta["served_by"],
            reachable=privileged_meta["reachable"],
            note=privileged_meta["note"],
        )

        return PatientAccessComparison(
            patient_sys_id=sys_id_resolved,
            patient_ref=patient_ref,
            restricted=restricted_identity,
            privileged=privileged_identity,
            fields=fields,
            redacted_count=redacted_count,
        )

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def _resolve_demo_patient(
    settings: Settings,
    client: httpx.AsyncClient,
    query: str | None,
    sys_id: str | None = None,
) -> tuple[str, str]:
    """Find the patient to demo with, using the main account (always sees the record)."""
    if sys_id and sys_id.strip():
        # Caller already knows the exact record (e.g. the logged-in patient or the
        # record a clinician is viewing) — look it up directly by sys_id.
        snow_query = f"sys_id={sys_id.strip()}"
    elif query and query.strip():
        q = query.strip().replace("^", " ")
        snow_query = (
            f"u_first_nameLIKE{q}^ORu_last_nameLIKE{q}"
            f"^ORu_patient_id={q}^ORu_emailLIKE{q}"
        )
    else:
        # Default: a record with rich PII (incl. insurance) so the contrast is obvious.
        snow_query = (
            "u_first_nameISNOTEMPTY^u_emailISNOTEMPTY^u_phoneISNOTEMPTY"
            "^u_date_of_birthISNOTEMPTY^u_insurance_idISNOTEMPTY"
        )
    response = await client.get(
        f"{settings.snow_base_url}/api/now/table/u_patient",
        params={
            "sysparm_query": snow_query,
            "sysparm_fields": "sys_id,u_patient_id",
            "sysparm_limit": "1",
        },
        headers={"Accept": "application/json"},
        auth=(settings.snow_username, settings.snow_password),
    )
    if not response.is_success:
        _raise_snow_error(response)
    records = response.json().get("result", [])
    if not records:
        return "", ""
    record = records[0]
    return _field_value(record.get("sys_id")), _field_best(record.get("u_patient_id"))


async def _read_patient_as_agent(
    settings: Settings,
    client: httpx.AsyncClient,
    sys_id: str,
    *,
    username: str | None,
    password: str | None,
    allow_main_fallback: bool,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Read the patient as the given agent; optionally fall back to the main account."""
    meta = {"served_by": "", "reachable": True, "note": ""}

    async def read(user: str, pw: str) -> httpx.Response:
        return await client.get(
            f"{settings.snow_base_url}/api/now/table/u_patient/{sys_id}",
            params={
                "sysparm_fields": ",".join(_ACCESS_QUERY_FIELDS),
                "sysparm_display_value": "true",
            },
            headers={"Accept": "application/json"},
            auth=(user, pw),
        )

    if username and password:
        response = await read(username, password)
        if response.is_success:
            meta["served_by"] = username
            record = response.json().get("result", {})
            return (record if isinstance(record, dict) else {}), meta
        if response.status_code in (401, 403):
            meta["reachable"] = False
            meta["note"] = f"{username} could not authenticate/authorize (HTTP {response.status_code})."
        else:
            meta["note"] = _error_detail(response)
    else:
        meta["reachable"] = False
        meta["note"] = "Agent credentials not configured."

    if allow_main_fallback:
        response = await read(settings.snow_username, settings.snow_password)
        if response.is_success:
            meta["served_by"] = f"{settings.snow_username} (fallback)"
            meta["reachable"] = True
            record = response.json().get("result", {})
            return (record if isinstance(record, dict) else {}), meta
        _raise_snow_error(response)

    return {}, meta
