"""Pydantic models for the API surface.

`AISystem` mirrors the frontend `SnowAISystem` interface field-for-field so the
React client can consume responses without any remapping.
"""

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
    output: str
    context_id: str | None = None
    task_id: str | None = None
    state: str | None = None
