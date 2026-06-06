"""In-memory storage for asynchronous ServiceNow A2A callbacks."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from .servicenow import (
    _extract_a2a_context_id,
    _extract_a2a_state,
    _extract_a2a_task_id,
    _extract_a2a_text,
)

PENDING_STATES = {"accepted", "submitted", "working", "running", "pending"}


@dataclass
class AgentExecutionRecord:
    request_id: str
    agent_sys_id: str
    output: str = ""
    context_id: str | None = None
    task_id: str | None = None
    state: str | None = None
    status: str = "pending"
    error: str | None = None
    updated_at: float = 0.0
    raw: Any = None


_BY_REQUEST_ID: dict[str, AgentExecutionRecord] = {}
_BY_TASK_ID: dict[str, AgentExecutionRecord] = {}
_LATEST_BY_AGENT_SYS_ID: dict[str, str] = {}


def reset_callback_store() -> None:
    _BY_REQUEST_ID.clear()
    _BY_TASK_ID.clear()
    _LATEST_BY_AGENT_SYS_ID.clear()


def create_pending_execution(
    *,
    request_id: str,
    agent_sys_id: str,
    output: str = "",
    context_id: str | None = None,
    task_id: str | None = None,
    state: str | None = None,
    status: str = "pending",
    error: str | None = None,
) -> AgentExecutionRecord:
    existing = _BY_REQUEST_ID.get(request_id)
    if existing and existing.status != "pending":
        _LATEST_BY_AGENT_SYS_ID[agent_sys_id] = request_id
        return existing

    record = existing or AgentExecutionRecord(request_id=request_id, agent_sys_id=agent_sys_id)
    record.output = output or record.output
    record.context_id = context_id or record.context_id
    record.task_id = task_id or record.task_id
    record.state = state or record.state or "submitted"
    record.status = status
    record.error = error
    record.updated_at = time.time()

    _BY_REQUEST_ID[request_id] = record
    _LATEST_BY_AGENT_SYS_ID[agent_sys_id] = request_id
    if record.task_id:
        _BY_TASK_ID[record.task_id] = record
    return record


def get_execution(request_id: str) -> AgentExecutionRecord | None:
    return _BY_REQUEST_ID.get(request_id)


def store_callback(agent_sys_id: str, body: Any) -> AgentExecutionRecord:
    request_id = _extract_request_id(body)
    task_id = _extract_a2a_task_id(body)
    record = _find_record(agent_sys_id, request_id, task_id)

    if record is None:
        request_id = request_id or str(uuid4())
        record = AgentExecutionRecord(request_id=request_id, agent_sys_id=agent_sys_id)

    output = _extract_a2a_text(body)
    context_id = _extract_a2a_context_id(body)
    state = _extract_a2a_state(body)
    error = _extract_json_rpc_error(body)

    record.output = output or (json.dumps(body, separators=(",", ":"), default=str) if error else record.output)
    record.context_id = context_id or record.context_id
    record.task_id = task_id or record.task_id
    record.state = state or record.state
    record.error = error
    record.status = _status_for_callback(record)
    record.raw = body
    record.updated_at = time.time()

    _BY_REQUEST_ID[record.request_id] = record
    _LATEST_BY_AGENT_SYS_ID[agent_sys_id] = record.request_id
    if record.task_id:
        _BY_TASK_ID[record.task_id] = record
    return record


def _find_record(
    agent_sys_id: str,
    request_id: str | None,
    task_id: str | None,
) -> AgentExecutionRecord | None:
    if request_id and request_id in _BY_REQUEST_ID:
        return _BY_REQUEST_ID[request_id]
    if task_id and task_id in _BY_TASK_ID:
        return _BY_TASK_ID[task_id]
    latest_request_id = _LATEST_BY_AGENT_SYS_ID.get(agent_sys_id)
    if latest_request_id:
        return _BY_REQUEST_ID.get(latest_request_id)
    return None


def _extract_request_id(body: Any) -> str | None:
    if not isinstance(body, dict):
        return None
    for key in ("id", "requestId", "request_id"):
        value = body.get(key)
        if value:
            return str(value)
    content = body.get("content")
    if isinstance(content, dict):
        return _extract_request_id(content)
    return None


def _extract_json_rpc_error(body: Any) -> str | None:
    if not isinstance(body, dict):
        return None
    error = body.get("error")
    if isinstance(error, dict):
        message = error.get("message") or "Unknown JSON-RPC error"
        code = error.get("code")
        return f"JSON-RPC error {code}: {message}" if code is not None else str(message)
    content = body.get("content")
    if isinstance(content, dict):
        return _extract_json_rpc_error(content)
    return None


def _status_for_callback(record: AgentExecutionRecord) -> str:
    if record.error:
        return "error"
    if record.state and record.state.lower() in PENDING_STATES and not record.output:
        return "pending"
    return "completed"
