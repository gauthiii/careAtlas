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
    asset_type: str = ""
    vendor: str = ""
    managed_by: str = ""
    lifecycle_phase: str = ""
    state: str = ""
    lifecycle_status: str = ""
    risk_classification: str = ""


class RegulatoryEvidenceCandidate(BaseModel):
    sys_id: str = ""
    name: str = ""
    state: str = ""
    risk_classification: str = ""
    updated_on: str = ""
    evidence_url: str = ""


class RegulatoryEvidenceResponse(BaseModel):
    query: str
    target_sys_id: str = ""
    target_name: str = ""
    state: str = ""
    risk_classification: str = ""
    evidence_url: str = ""
    candidates: list[RegulatoryEvidenceCandidate] = Field(default_factory=list)
    assessment_tasks_count: int = 0
    risk_assessment_results_count: int = 0
    entity_maps_count: int = 0
    post_assessment_actions_count: int = 0
    fria_actions_active_count: int = 0
    fria_actions_inactive_count: int = 0
    has_ai_system_record: bool = False
    has_completed_classification: bool = False
    has_assessment_task: bool = False
    has_risk_assessment_result: bool = False
    has_entity_mapping: bool = False
    has_post_assessment_actions: bool = False
    fria_attached: bool = False
    demo_ready: bool = False


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
    triage_priority: str = ""
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


class DoctorAppointmentOption(BaseModel):
    """An appointment shown in the "Add note" appointment picker / detail page."""

    appointment_record_id: str
    appointment_id: str = ""
    date: str = ""
    start_time: str = ""
    status: str = ""
    status_label: str = ""
    reason_category: str = ""
    reason_text: str = ""
    triage_priority: str = ""
    patient_sys_id: str = ""
    patient_name: str = ""


class AppointmentUpdateRequest(BaseModel):
    """Update an appointment's status and/or date/time (cancel, complete, reschedule)."""

    record_id: str
    status: str | None = None
    date: str | None = None
    start_time: str | None = None

    @field_validator("record_id")
    @classmethod
    def require_record_id(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("record_id is required")
        return value

    @field_validator("status", "date", "start_time")
    @classmethod
    def trim_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class ClinicianAppointmentCreateRequest(BaseModel):
    """Create an appointment directly from the clinician portal (patient sys_id known)."""

    doctor_record_id: str
    patient_sys_id: str
    date: str
    start_time: str
    reason_category: str = "general-checkup"
    reason_text: str | None = None

    @field_validator("doctor_record_id", "patient_sys_id", "date", "start_time")
    @classmethod
    def require_field(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("field is required")
        return value


class SummaryNoteUpdateRequest(BaseModel):
    sys_id: str
    notes: str

    @field_validator("sys_id", "notes")
    @classmethod
    def require_nonblank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("field is required")
        return value


class RegistrationStatusUpdateRequest(BaseModel):
    sys_id: str
    registration_status: str

    @field_validator("sys_id", "registration_status")
    @classmethod
    def require_nonblank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("field is required")
        return value


class PatientProfileUpdateRequest(BaseModel):
    """Patient-editable profile fields (self-owned contact info only)."""

    sys_id: str
    phone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    postcode: str | None = None
    emergency_name: str | None = None
    emergency_phone: str | None = None
    emergency_relationship: str | None = None
    time_preference: str | None = None
    primary_language: str | None = None

    @field_validator("sys_id")
    @classmethod
    def require_sys_id(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("sys_id is required")
        return value


class SummaryNoteRequest(BaseModel):
    # The note is linked to an appointment; the doctor, patient, date and time
    # are derived server-side from that appointment so the record stays consistent.
    appointment_record_id: str
    notes: str
    logged_by: str | None = None

    @field_validator("appointment_record_id", "notes")
    @classmethod
    def require_nonblank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("field is required")
        return value

    @field_validator("logged_by")
    @classmethod
    def trim_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class SummaryNoteResponse(BaseModel):
    sys_id: str = ""
    summary_note_id: str = ""
    appointment_record_id: str = ""
    appointment_id: str = ""
    doctor_record_id: str = ""
    doctor_name: str = ""
    patient_sys_id: str = ""
    patient_name: str = ""
    date: str = ""
    start_time: str = ""
    notes: str = ""
    logged_by: str = ""
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


class PiiFieldAclStatus(BaseModel):
    """One PII field on u_patient and whether a field-level read ACL guards it."""

    field: str
    label: str
    protected: bool


class PrivacyControlsResponse(BaseModel):
    """UC1 Privacy — live evidence for the 'Data Privacy & PII Protection' panel."""

    # Wall 1 — field-level ACL denial on u_patient PII columns.
    pii_acl_status: Literal["enforced", "partial", "off"] = "off"
    protected_field_count: int = 0
    pii_fields: list[PiiFieldAclStatus] = []
    # Live deny-probe: a non-human agent identity (lacks role_patient_pii) reading
    # u_patient — proves PII columns are stripped while non-PII columns remain.
    deny_probe_ran: bool = False
    deny_probe_passed: bool = False
    deny_probe_detail: str = ""
    visible_pii_fields: list[str] = []
    # Wall 2 — PII data-privacy guardrail on the agent output path.
    redaction_on: bool = False
    active_pii_filters: int = 0
    active_filter_total: int = 0
    pii_pattern_count: int = 0
    # Wall 3 — anonymized audit log.
    anonymization_rate: int = 0
    decision_log_rows: int = 0
    anonymized_rows: int = 0


class FairnessGroupItem(BaseModel):
    """One demographic group's appointment-outcome allocation (no PII — grouped aggregates)."""

    group: str
    pct: float
    expected: float
    count: int
    skewed: bool


class FairnessResponse(BaseModel):
    """UC6 Fairness — live outcome distribution by demographic group."""

    by_gender: list[FairnessGroupItem] = []
    by_ethnicity: list[FairnessGroupItem] = []
    by_age: list[FairnessGroupItem] = []
    total_appointments: int = 0
    bias_risk_statements: list[str] = []
    fairness_metric_count: int = 0
    max_skew_pp: float = 0.0
    skew_alert: bool = False


class ScopedFieldValue(BaseModel):
    label: str
    value: str = ""


class ScopedAgentAskRequest(BaseModel):
    agent_key: str
    question: str
    patient_email: str = ""
    patient_sys_id: str = ""


class ScopedAgentAnswer(BaseModel):
    """A page-scoped AI agent's response, bounded by its ServiceNow ACL identity (UC2)."""

    kind: Literal["scoped_data", "approval", "info"]
    agent_key: str
    agent_label: str
    agent_username: str
    scope: str
    patient_ref: str = ""
    allowed: list[ScopedFieldValue] = []
    denied: list[str] = []
    reply: str = ""
    # Present when kind == "approval" (high-impact intent stopped for a human).
    request_id: str = ""
    intent: str = ""
    reason: str = ""


class ApprovalSubmitRequest(BaseModel):
    intent: str


class ApprovalDecisionRequest(BaseModel):
    decision: Literal["approve", "deny"]
    approver: str = ""


class ApprovalLogEntry(BaseModel):
    """A persisted UC2 human-approval-gate decision from u_ai_action_audit_log."""

    sys_id: str = ""
    timestamp: str = ""
    decision: Literal["approved", "denied", "unknown"] = "unknown"
    detail: str = ""
    created_by: str = ""


class ApprovalRecordResponse(BaseModel):
    request_id: str
    intent: str
    high_impact: bool
    reason: str
    status: Literal["pending_approval", "auto_completed", "approved", "denied"]
    approver: str = ""
    audit_logged: bool = False


class PatientSearchResult(BaseModel):
    """Lightweight typeahead suggestion for the clinician patient search."""

    sys_id: str = ""
    patient_id: str = ""
    name: str = ""
    email: str = ""


class AgentIdentity(BaseModel):
    """One non-human agent identity used in the role-based redaction demo."""

    key: Literal["restricted", "privileged"]
    label: str
    username: str
    role: str
    has_pii_role: bool
    served_by: str = ""  # actual account that answered (fallback transparency)
    reachable: bool = True
    note: str = ""


class PatientFieldAccess(BaseModel):
    """One u_patient field and how each agent sees it."""

    key: str
    label: str
    category: Literal["pii", "safe"]
    # Value the privileged (authorized) agent sees.
    privileged_value: str = ""
    # Value the restricted agent sees ("" when redacted by the field-level ACL).
    restricted_value: str = ""
    redacted_for_restricted: bool = False


class PatientAccessComparison(BaseModel):
    """Live side-by-side of one patient record read by two differently-scoped agents."""

    patient_sys_id: str = ""
    patient_ref: str = ""  # non-PII u_patient_id, always safe to show
    restricted: AgentIdentity
    privileged: AgentIdentity
    fields: list[PatientFieldAccess] = []
    redacted_count: int = 0


class NotificationItem(BaseModel):
    sys_id: str = ""
    notification_id: str = ""
    audience: str = ""
    notification_type: str = ""
    message: str = ""
    patient_sys_id: str = ""
    patient_name: str = ""
    doctor_sys_id: str = ""
    doctor_name: str = ""
    appointment_sys_id: str = ""
    summary_note_sys_id: str = ""
    patient_read: bool = False
    staff_read: bool = False
    event_time: str = ""
    created_on: str = ""


class NotificationListResponse(BaseModel):
    items: list[NotificationItem] = []


class NotificationReadRequest(BaseModel):
    audience: Literal["patient", "staff"]


class AclTestRequest(BaseModel):
    service_account: str


class AclTestCheck(BaseModel):
    label: str
    expected: Literal["allowed", "denied"]
    actual: Literal["allowed", "denied", "inconclusive", "error"]
    passed: bool
    table: str
    fields: list[str]
    operation: Literal["read", "write"] = "read"
    status_code: int | None = None
    detail: str = ""


class AclTestResponse(BaseModel):
    service_account: str
    overall_status: Literal["passed", "failed", "inconclusive", "error"]
    checks: list[AclTestCheck]


class AclSummaryResponse(BaseModel):
    """Aggregate least-privilege posture across every governed service account (UC2)."""

    agents_tested: int = 0
    agents_passed: int = 0
    checks_total: int = 0
    access_blocked: int = 0  # denied checks that were correctly blocked
    write_denials: int = 0  # blocked write attempts (excessive-agency guardrails)
    leaks: int = 0  # expected-denied checks that were actually allowed


class RegisterAgentRequest(BaseModel):
    name: str
    description: str
    instructions: str
    active: bool = True

    @field_validator("name", "description", "instructions")
    @classmethod
    def require_nonblank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("field is required")
        return value


class RegisterAgentResponse(BaseModel):
    sys_id: str
    name: str


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


class GuardrailScanRequest(BaseModel):
    text: str


class MatchedPattern(BaseModel):
    name: str
    surface: str  # "input" | "output"


class GuardrailScanResponse(BaseModel):
    verdict: str  # "blocked" | "flagged" | "clean"
    matched_patterns: list[MatchedPattern]
    action: str
    ai_case_number: str | None = None
    ai_case_sys_id: str | None = None


class SecurityKpisResponse(BaseModel):
    ai_cases_open: int
    active_injection_filters: int
    injection_output_patterns: int
    automation_rules_active: int
    recent_cases: list[dict]
class ConsentFlagsResponse(BaseModel):
    flags: list[str] = []
    consent_accepted: bool = False
    flags_set: bool = False


class ConsentFlagsRequest(BaseModel):
    flags: list[str] = []


class ConsentViolationEntry(BaseModel):
    opened_at: str = ""
    short_description: str = ""
    priority: str = ""
    state: str = ""


class ConsentViolationsResponse(BaseModel):
    count_30_days: int = 0
    recent: list[ConsentViolationEntry] = []
