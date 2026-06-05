"""Pydantic models for the API surface.

`AISystem` mirrors the frontend `SnowAISystem` interface field-for-field so the
React client can consume responses without any remapping.
"""

from pydantic import BaseModel


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
