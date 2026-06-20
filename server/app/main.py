"""FastAPI entrypoint for the CareAtlas backend.

All ServiceNow communication lives behind this service; the frontend only ever
calls `/api/*` here. Run locally with:

    uvicorn app.main:app --reload --port 8000
"""

import logging
from datetime import date
from secrets import compare_digest, token_hex
from typing import Any

import httpx
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import Settings, get_settings
from .aws_auth import (
    DEFAULT_DOCTOR_TEMP_PASSWORD,
    create_force_change_user,
    router as aws_auth_router,
    _client as _cognito_client,
    _require_cognito,
)
from .a2a_callbacks import (
    AgentExecutionRecord,
    create_pending_execution,
    get_execution,
    store_callback,
)

from .models import (
    AclTestRequest,
    AclTestResponse,
    AiDecisionLogEntry,
    AIAsset,
    AISystem,
    BookingAppointment,
    BookingAppointmentRequest,
    BookingAvailabilityResponse,
    ExecuteAgentRequest,
    ExecuteAgentResponse,
    NotificationListResponse,
    NotificationReadRequest,
    PatientProfileResponse,
    AppointmentUpdateRequest,
    ClinicianAppointmentCreateRequest,
    DoctorAppointmentOption,
    PatientProfileResponse,
    PatientProfileUpdateRequest,
    PatientRegistrationRequest,
    PatientRegistrationResponse,
    PatientRegistrationSummary,
    PasswordPwnedCheckRequest,
    PasswordPwnedCheckResponse,
    RegisterAgentRequest,
    RegisterAgentResponse,
    RegistrationStatusUpdateRequest,
    SummaryNoteRequest,
    SummaryNoteResponse,
    SummaryNoteUpdateRequest,
    ValidateRequest,
    ValidateResponse,
)
from .notifications import fetch_notifications, mark_notification_read
from .pwned_passwords import PwnedPasswordsError, check_pwned_password
from .servicenow import (
    BookingConflictError,
    BookingPatientNotFoundError,
    ServiceNowError,
    SummaryNoteAppointmentNotFoundError,
    create_agent,
    create_clinician_appointment,
    create_doctor,
    create_guardrail_audit_log,
    create_patient_booking_appointment,
    create_patient_registration,
    create_summary_note,
    delete_summary_note,
    execute_agent,
    fetch_agents,
    fetch_ai_decision_log,
    fetch_appointment_option,
    fetch_doctor_appointment_options,
    fetch_guardrail_audit_logs,
    fetch_managed_ai_assets,
    fetch_patient_booking_availability,
    fetch_patient_profile,
    fetch_patient_registrations,
    fetch_summary_notes,
    fetch_unmanaged_ai_assets,
    test_service_account_acl,
    update_appointment,
    update_patient_profile,
    update_registration_status,
    update_summary_note,
    validate_user,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger("careatlas")

api = APIRouter(prefix="/api")



@api.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@api.get("/agents", response_model=list[AISystem])
async def get_agents(settings: Settings = Depends(get_settings)) -> list[AISystem]:
    try:
        return await fetch_agents(settings)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.post("/agents/register", response_model=RegisterAgentResponse)
async def post_register_agent(
    body: RegisterAgentRequest,
    settings: Settings = Depends(get_settings),
) -> RegisterAgentResponse:
    try:
        sys_id, name = await create_agent(
            settings,
            name=body.name,
            description=body.description,
            instructions=body.instructions,
            active=body.active,
        )
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return RegisterAgentResponse(sys_id=sys_id, name=name)


@api.get("/agents/managed", response_model=list[AIAsset])
async def get_managed_ai_assets(settings: Settings = Depends(get_settings)) -> list[AIAsset]:
    try:
        return await fetch_managed_ai_assets(settings)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.get("/agents/unmanaged", response_model=list[AIAsset])
async def get_unmanaged_ai_assets(settings: Settings = Depends(get_settings)) -> list[AIAsset]:
    try:
        return await fetch_unmanaged_ai_assets(settings)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.post("/agents/execute", response_model=ExecuteAgentResponse)
async def post_execute_agent(
    body: ExecuteAgentRequest,
    settings: Settings = Depends(get_settings),
) -> ExecuteAgentResponse:
    try:
        output = await execute_agent(
            settings,
            body.agent_sys_id,
            body.user_input,
            context_id=body.context_id,
            task_id=body.task_id,
            system_context=body.system_context,
        )
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    create_pending_execution(
        request_id=output.request_id,
        agent_sys_id=body.agent_sys_id,
        output=output.output,
        context_id=output.context_id,
        task_id=output.task_id,
        state=output.state,
        status=output.status,
    )
    return ExecuteAgentResponse(
        request_id=output.request_id,
        output=output.output,
        context_id=output.context_id,
        task_id=output.task_id,
        state=output.state,
        status=output.status,
    )


@api.get("/agents/execute/{request_id}", response_model=ExecuteAgentResponse)
async def get_agent_execution(request_id: str) -> ExecuteAgentResponse:
    record = get_execution(request_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Agent execution request not found")
    return _record_response(record)


@api.post("/a2a/callback/{agent_sys_id}")
async def post_a2a_callback(
    agent_sys_id: str,
    request: Request,
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    body = await _read_json_body(request)
    if not _valid_callback_auth(request, body, settings):
        raise HTTPException(status_code=401, detail="Invalid A2A callback token")

    record = store_callback(agent_sys_id, body)
    logger.info(
        "Stored ServiceNow A2A callback for agent %s request %s status %s",
        agent_sys_id,
        record.request_id,
        record.status,
    )
    return {"status": "accepted", "request_id": record.request_id}


@api.post("/auth/validate", response_model=ValidateResponse)
async def post_validate(
    body: ValidateRequest,
    settings: Settings = Depends(get_settings),
) -> ValidateResponse:
    try:
        valid = await validate_user(settings, body.username, body.password)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return ValidateResponse(valid=valid)


@api.post("/passwords/pwned-check", response_model=PasswordPwnedCheckResponse)
async def post_password_pwned_check(
    body: PasswordPwnedCheckRequest,
    settings: Settings = Depends(get_settings),
) -> PasswordPwnedCheckResponse:
    try:
        return await check_pwned_password(settings, body.password)
    except PwnedPasswordsError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.post("/patients/register", response_model=PatientRegistrationResponse)
async def post_patient_registration(
    body: PatientRegistrationRequest,
    settings: Settings = Depends(get_settings),
) -> PatientRegistrationResponse:
    try:
        return await create_patient_registration(settings, body)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


_SAMPLE_DOCTORS = [
    ("Maya", "Okonkwo", "Cardiology", "Interventional Cardiology"),
    ("Daniel", "Asante", "Neurology", "Stroke Medicine"),
    ("Priya", "Mensah", "Paediatrics", "Neonatology"),
    ("Samuel", "Boateng", "Orthopaedics", "Sports Medicine"),
    ("Aisha", "Adjei", "Oncology", "Medical Oncology"),
]

DOCTOR_EMAIL_DOMAIN = "northstargh.com"


@api.post("/doctors/provision-sample")
async def post_provision_sample_doctor(
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    """Provision a sample clinician end-to-end for the doctor sign-in assistant.

    Creates a u_doctor record in ServiceNow and a force-change Cognito credential
    (temporary password ``WelcomeToNGH@123``), then returns the email + temporary
    password so the assistant can show the new sign-in details.
    """
    _require_cognito(settings)

    first_name, last_name, department, speciality = _SAMPLE_DOCTORS[
        int(token_hex(2), 16) % len(_SAMPLE_DOCTORS)
    ]
    # Unique each call so repeated provisioning never collides in Cognito.
    suffix = token_hex(3)
    email = f"dr.{first_name}.{last_name}.{suffix}@{DOCTOR_EMAIL_DOMAIN}".lower()
    full_name = f"Dr. {first_name} {last_name}"

    cognito = _cognito_client(settings.cognito_region)
    try:
        create_force_change_user(
            cognito,
            settings,
            name=full_name,
            email=email,
            temporary_password=DEFAULT_DOCTOR_TEMP_PASSWORD,
        )
    except cognito.exceptions.UsernameExistsException:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Cognito provisioning failed: {exc}")

    try:
        doctor = await create_doctor(
            settings,
            first_name=first_name,
            last_name=last_name,
            email=email,
            department=department,
            speciality=speciality,
        )
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "status": "DOCTOR_PROVISIONED",
        "name": full_name,
        "email": email,
        "temporary_password": DEFAULT_DOCTOR_TEMP_PASSWORD,
        "department": department,
        "speciality": speciality,
        "doctor_sys_id": doctor.get("sys_id", ""),
    }


@api.post("/governance/llm02/flag")
async def post_flag_llm02_event(
    body: dict[str, Any] | None = None,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Log an LLM02 sensitive-information-disclosure block to u_ai_action_audit_log."""
    request_text = ""
    if isinstance(body, dict):
        request_text = str(body.get("request_text") or "")
    try:
        return await create_guardrail_audit_log(settings, request_text=request_text)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.get("/governance/llm02/audit-log")
async def get_llm02_audit_log(
    settings: Settings = Depends(get_settings),
) -> list[dict[str, Any]]:
    """Return the LLM02 guardrail audit-log entries, newest first."""
    try:
        return await fetch_guardrail_audit_logs(settings)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.get("/patients/profile", response_model=PatientProfileResponse)
async def get_patient_profile(
    email: str | None = None,
    username: str | None = None,
    name: str | None = None,
    settings: Settings = Depends(get_settings),
) -> PatientProfileResponse:
    try:
        profile = await fetch_patient_profile(settings, email=email, username=username, name=name)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if profile is None:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return profile


@api.get("/patients/booking/availability", response_model=BookingAvailabilityResponse)
async def get_patient_booking_availability(
    start_date: date | None = None,
    days: int = 14,
    settings: Settings = Depends(get_settings),
) -> BookingAvailabilityResponse:
    try:
        return await fetch_patient_booking_availability(settings, start_date=start_date, days=days)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.post("/patients/booking/appointments", response_model=BookingAppointment)
async def post_patient_booking_appointment(
    body: BookingAppointmentRequest,
    settings: Settings = Depends(get_settings),
) -> BookingAppointment:
    try:
        return await create_patient_booking_appointment(settings, body)
    except BookingPatientNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except BookingConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.get("/staff/registrations", response_model=list[PatientRegistrationSummary])
async def get_patient_registrations(
    status: str | None = None,
    limit: int = 100,
    settings: Settings = Depends(get_settings),
) -> list[PatientRegistrationSummary]:
    try:
        return await fetch_patient_registrations(settings, status=status, limit=limit)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.get("/staff/appointment-options", response_model=list[DoctorAppointmentOption])
async def get_doctor_appointment_options(
    doctor_sys_id: str,
    settings: Settings = Depends(get_settings),
) -> list[DoctorAppointmentOption]:
    try:
        return await fetch_doctor_appointment_options(settings, doctor_sys_id=doctor_sys_id)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.get("/staff/appointment", response_model=DoctorAppointmentOption)
async def get_appointment(
    record_id: str,
    settings: Settings = Depends(get_settings),
) -> DoctorAppointmentOption:
    try:
        appointment = await fetch_appointment_option(settings, appointment_record_id=record_id)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    if appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


@api.get("/staff/summary-notes", response_model=list[SummaryNoteResponse])
async def get_summary_notes(
    doctor_sys_id: str | None = None,
    appointment_record_id: str | None = None,
    patient_sys_id: str | None = None,
    limit: int = 200,
    settings: Settings = Depends(get_settings),
) -> list[SummaryNoteResponse]:
    try:
        return await fetch_summary_notes(
            settings,
            doctor_sys_id=doctor_sys_id,
            appointment_record_id=appointment_record_id,
            patient_sys_id=patient_sys_id,
            limit=limit,
        )
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.post("/staff/summary-notes", response_model=SummaryNoteResponse)
async def post_summary_note(
    body: SummaryNoteRequest,
    settings: Settings = Depends(get_settings),
) -> SummaryNoteResponse:
    try:
        return await create_summary_note(settings, body)
    except SummaryNoteAppointmentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.patch("/staff/summary-notes", response_model=SummaryNoteResponse)
async def patch_summary_note(
    body: SummaryNoteUpdateRequest,
    settings: Settings = Depends(get_settings),
) -> SummaryNoteResponse:
    try:
        return await update_summary_note(settings, body.sys_id, body.notes)
    except SummaryNoteAppointmentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.delete("/staff/summary-notes/{sys_id}")
async def remove_summary_note(
    sys_id: str,
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    try:
        await delete_summary_note(settings, sys_id)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"status": "deleted", "sys_id": sys_id}


@api.get("/notifications", response_model=NotificationListResponse)
async def get_notifications(
    audience: str,
    patient_id: str | None = None,
    doctor_id: str | None = None,
    settings: Settings = Depends(get_settings),
) -> NotificationListResponse:
    if audience not in ("patient", "staff"):
        raise HTTPException(status_code=400, detail="audience must be 'patient' or 'staff'")
    try:
        items = await fetch_notifications(
            settings,
            audience=audience,  # type: ignore[arg-type]
            patient_sys_id=patient_id,
            doctor_sys_id=doctor_id,
        )
    except (ServiceNowError, httpx.HTTPError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return NotificationListResponse(items=items)


@api.patch("/notifications/{sys_id}/read")
async def patch_notification_read(
    sys_id: str,
    body: NotificationReadRequest,
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    try:
        await mark_notification_read(settings, sys_id, body.audience)
    except (ServiceNowError, httpx.HTTPError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"status": "read", "sys_id": sys_id}


@api.post("/staff/appointments", response_model=DoctorAppointmentOption)
async def post_clinician_appointment(
    body: ClinicianAppointmentCreateRequest,
    settings: Settings = Depends(get_settings),
) -> DoctorAppointmentOption:
    try:
        return await create_clinician_appointment(settings, body)
    except BookingConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.patch("/staff/appointments", response_model=DoctorAppointmentOption)
async def patch_appointment(
    body: AppointmentUpdateRequest,
    settings: Settings = Depends(get_settings),
) -> DoctorAppointmentOption:
    try:
        return await update_appointment(
            settings,
            body.record_id,
            status=body.status,
            date=body.date,
            start_time=body.start_time,
        )
    except SummaryNoteAppointmentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except BookingConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.patch("/staff/registrations", response_model=PatientRegistrationSummary)
async def patch_registration_status(
    body: RegistrationStatusUpdateRequest,
    settings: Settings = Depends(get_settings),
) -> PatientRegistrationSummary:
    try:
        return await update_registration_status(settings, body.sys_id, body.registration_status)
    except BookingPatientNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.patch("/patients/profile", response_model=PatientProfileResponse)
async def patch_patient_profile(
    body: PatientProfileUpdateRequest,
    settings: Settings = Depends(get_settings),
) -> PatientProfileResponse:
    try:
        return await update_patient_profile(settings, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except BookingPatientNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.get("/governance/decision-log", response_model=list[AiDecisionLogEntry])
async def get_governance_decision_log(
    limit: int = 25,
    settings: Settings = Depends(get_settings),
) -> list[AiDecisionLogEntry]:
    try:
        return await fetch_ai_decision_log(settings, limit=limit)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@api.post("/acl/test", response_model=AclTestResponse)
async def post_acl_test(
    body: AclTestRequest,
    settings: Settings = Depends(get_settings),
) -> AclTestResponse:
    try:
        return await test_service_account_acl(settings, body.service_account)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


async def _read_json_body(request: Request) -> Any:
    try:
        return await request.json()
    except Exception:  # noqa: BLE001 - callback verification probes may send no body
        return {}


def _record_response(record: AgentExecutionRecord) -> ExecuteAgentResponse:
    return ExecuteAgentResponse(
        request_id=record.request_id,
        output=record.output,
        context_id=record.context_id,
        task_id=record.task_id,
        state=record.state,
        status=record.status,
        error=record.error,
    )


def _valid_callback_auth(request: Request, body: Any, settings: Settings) -> bool:
    expected = settings.a2a_callback_token
    if not expected:
        return False

    for token in _callback_token_candidates(request, body):
        if compare_digest(token, expected):
            return True
    return False


def _callback_token_candidates(request: Request, body: Any) -> list[str]:
    candidates: list[str] = []
    authorization = request.headers.get("authorization")
    if authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer" and value:
            candidates.append(value.strip())
        candidates.append(authorization.strip())

    for header in ("x-a2a-callback-token", "x-servicenow-callback-token", "x-callback-token"):
        value = request.headers.get(header)
        if value:
            candidates.append(value.strip())

    for key in ("token", "callback_token", "callbackToken"):
        value = request.query_params.get(key)
        if value:
            candidates.append(value.strip())

    if isinstance(body, dict):
        for key in ("token", "callback_token", "callbackToken"):
            value = body.get(key)
            if value:
                candidates.append(str(value).strip())
        params = body.get("params")
        configuration = params.get("configuration") if isinstance(params, dict) else None
        config = (
            configuration.get("pushNotificationConfig")
            if isinstance(configuration, dict)
            else None
        )
        if isinstance(config, dict) and config.get("token"):
            candidates.append(str(config["token"]).strip())

    return [token for token in candidates if token]


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="CareAtlas API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["*"],
    )

    @app.exception_handler(StarletteHTTPException)
    async def on_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        # Log every HTTP error response so failures on any endpoint are tracked.
        # 5xx (e.g. upstream 502s) as errors, 4xx as warnings.
        log = logger.error if exc.status_code >= 500 else logger.warning
        log("%s %s -> %s: %s", request.method, request.url.path, exc.status_code, exc.detail)
        return await http_exception_handler(request, exc)

    @app.exception_handler(Exception)
    async def on_unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
        # Catch-all for anything an endpoint didn't handle; log with traceback.
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    app.include_router(api)
    app.include_router(aws_auth_router)
    return app


app = create_app()
