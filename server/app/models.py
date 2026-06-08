"""Pydantic models for the API surface.

`AISystem` mirrors the frontend `SnowAISystem` interface field-for-field so the
React client can consume responses without any remapping.
"""

from typing import Literal

from pydantic import BaseModel, field_validator


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

    @field_validator("agent_sys_id")
    @classmethod
    def validate_agent_sys_id(cls, value: str) -> str:
        value = value.strip()
        if len(value) != 32 or not all(char in "0123456789abcdefABCDEF" for char in value):
            raise ValueError("agent_sys_id must be a 32-character ServiceNow sys_id")
        return value


class ExecuteAgentResponse(BaseModel):
    request_id: str
    output: str = ""
    context_id: str | None = None
    task_id: str | None = None
    state: str | None = None
    status: str = "completed"
    error: str | None = None
