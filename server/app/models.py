"""Pydantic models for the API surface.

`AISystem` mirrors the frontend `SnowAISystem` interface field-for-field so the
React client can consume responses without any remapping.
"""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AISystem(BaseModel):
    sys_id: str
    name: str
    display_name: str
    agent_type: str
    strategy: str
    role: str
    description: str
    proficiency: str
    instructions: str
    condition: str


class AIAsset(BaseModel):
    sys_id: str = ""
    name: str = ""
    display_name: str = ""
    vendor: str = ""
    managed_by: str = ""
    lifecycle_phase: str = ""
    state: str = ""
    lifecycle_status: str = ""


class ValidateRequest(BaseModel):
    username: str
    password: str


class ValidateResponse(BaseModel):
    valid: bool


class PasswordPwnedCheckRequest(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def require_password(cls, value: str) -> str:
        if not value:
            raise ValueError("password is required")
        return value


class PasswordPwnedCheckResponse(BaseModel):
    pwned: bool
    count: int


class PatientRegistrationRequest(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: str
    gender: str
    ethnicity: str
    primary_language: str
    phone: str
    email: str
    address_line1: str
    address_line2: str | None = None
    city: str
    postcode: str
    health_condition: str
    accessibility: str
    insurance_id: str | None = None
    emergency_name: str
    emergency_phone: str
    emergency_relationship: str
    username: str
    consent_accepted: bool

    @field_validator(
        "first_name",
        "last_name",
        "date_of_birth",
        "gender",
        "ethnicity",
        "primary_language",
        "phone",
        "email",
        "address_line1",
        "city",
        "postcode",
        "health_condition",
        "accessibility",
        "emergency_name",
        "emergency_phone",
        "emergency_relationship",
        "username",
    )
    @classmethod
    def require_nonblank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("field is required")
        return value

    @field_validator("address_line2", "insurance_id")
    @classmethod
    def trim_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class PatientRegistrationResponse(BaseModel):
    message: str
    sys_id: str
    patient_id: str
    first_name: str
    last_name: str
    email: str
    registration_status: str


class PatientProfileResponse(BaseModel):
    sys_id: str = ""
    patient_id: str = ""
    first_name: str = ""
    last_name: str = ""
    date_of_birth: str = ""
    gender: str = ""
    ethnicity: str = ""
    primary_language: str = ""
    phone: str = ""
    email: str = ""
    address_line1: str = ""
    address_line2: str = ""
    city: str = ""
    postcode: str = ""
    state_region: str = ""
    health_condition: str = ""
    accessibility: str = ""
    insurance_id: str = ""
    insurance_provider: str = ""
    emergency_name: str = ""
    emergency_phone: str = ""
    emergency_relationship: str = ""
    username: str = ""
    registration_status: str = ""
    account_status: str = ""
    email_verified: bool = False
    profile_complete: bool = False
    blood_type: str = ""
    known_allergies: str = ""
    active_since: str = ""
    confidence_score: str = ""
    consent_accepted: bool = False
    privacy_notice_version: str = ""
    time_preference: str = ""
    last_updated: str = ""


class BookingDoctor(BaseModel):
    doctor_id: str
    doctor_record_id: str
    name: str
    first_name: str = ""
    last_name: str = ""
    department: str = ""
    speciality: str = ""
    email: str = ""
    active: bool = True


class BookingAppointment(BaseModel):
    appointment_id: str
    appointment_record_id: str
    doctor_id: str
    doctor_record_id: str
    doctor_name: str
    department: str = ""
    speciality: str = ""
    date: str
    start_time: str
    status: str
    status_label: str
    reason_category: str = ""
    reason_text: str = ""
    patient_id: str = ""
    patient_display: str = ""


class BookingCalendarDay(BaseModel):
    date: str
    label: str
    appointments: list[BookingAppointment] = Field(default_factory=list)


class BookingAvailabilityResponse(BaseModel):
    start_date: str
    end_date: str
    days: list[BookingCalendarDay]
    doctors: list[BookingDoctor]
    appointments: list[BookingAppointment] = Field(default_factory=list)


class BookingAppointmentRequest(BaseModel):
    email: str | None = None
    username: str | None = None
    name: str | None = None
    doctor_record_id: str
    date: str
    start_time: str
    visit_type: str
    reason_category: str
    specialty: str | None = None
    concern: str | None = None
    insurance_provider: str | None = None
    member_id: str | None = None
    accessibility: str | None = None
    interpreter: str | None = None

    @field_validator("doctor_record_id", "date", "start_time", "visit_type", "reason_category")
    @classmethod
    def require_booking_field(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("field is required")
        return value

    @field_validator(
        "email",
        "username",
        "name",
        "specialty",
        "concern",
        "insurance_provider",
        "member_id",
        "accessibility",
        "interpreter",
    )
    @classmethod
    def trim_optional_booking_field(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class PatientRegistrationSummary(BaseModel):
    sys_id: str = ""
    patient_id: str = ""
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    phone: str = ""
    health_condition: str = ""
    registration_status: str = ""
    account_status: str = ""
    confidence_score: str = ""
    profile_complete: bool = False
    created_on: str = ""


class AiDecisionLogEntry(BaseModel):
    sys_id: str = ""
    log_id: str = ""
    timestamp: str = ""
    confidence_score: str = ""
    model_version: str = ""
    patient_anon: str = ""
    reason_parsed: str = ""
    triage_input: str = ""
    slots_considered: str = ""
    slots_returned: str = ""
    appointment: str = ""


class AclTestRequest(BaseModel):
    service_account: str


class AclTestCheck(BaseModel):
    label: str
    expected: Literal["allowed", "denied"]
    actual: Literal["allowed", "denied", "inconclusive", "error"]
    passed: bool
    table: str
    fields: list[str]
    status_code: int | None = None
    detail: str = ""


class AclTestResponse(BaseModel):
    service_account: str
    overall_status: Literal["passed", "failed", "inconclusive", "error"]
    checks: list[AclTestCheck]


class ExecuteAgentRequest(BaseModel):
    # sys_id of the agent in ServiceNow AI Agent Studio / sn_aia_agent.
    agent_sys_id: str
    user_input: str
    context_id: str | None = None
    task_id: str | None = None
    system_context: str | None = None

    @field_validator("agent_sys_id")
    @classmethod
    def validate_agent_sys_id(cls, value: str) -> str:
        value = value.strip()
        if len(value) != 32 or not all(char in "0123456789abcdefABCDEF" for char in value):
            raise ValueError("agent_sys_id must be a 32-character ServiceNow sys_id")
        return value

    @field_validator("system_context")
    @classmethod
    def trim_system_context(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class ExecuteAgentResponse(BaseModel):
    request_id: str
    output: str = ""
    context_id: str | None = None
    task_id: str | None = None
    state: str | None = None
    status: str = "completed"
    error: str | None = None
