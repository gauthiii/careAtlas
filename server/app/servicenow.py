"""ServiceNow AI Control Tower client.

Owns every call out to ServiceNow: the AI agent inventory (`sn_aia_agent`) and
user-credential validation (`sys_user`). This is the server-side home of the
logic that used to live in the frontend `serviceNow.ts` plus the Vite proxy.
"""

from typing import Any

import httpx

from .config import Settings
from .models import AISystem

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


class ServiceNowError(RuntimeError):
    """Raised when ServiceNow returns a non-OK response we can't recover from."""


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
        raise ServiceNowError(_error_detail(response))

    result = response.json().get("result", [])
    return [_map_agent(record) for record in result]


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
        raise ServiceNowError(_error_detail(response))

    return len(response.json().get("result", [])) > 0
