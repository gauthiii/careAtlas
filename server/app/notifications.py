"""Notification reminders: write an activity record to ServiceNow's
`u_notification_reminders` table for every key operation, and read them back
for the patient / clinician notification UIs.

Writing a notification must NEVER break the primary operation, so
`create_notification` swallows and logs all errors. Reads and read-state
updates raise `ServiceNowError` like the rest of the ServiceNow client.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

import httpx

from .config import Settings
from .models import NotificationItem

logger = logging.getLogger("careatlas.notifications")

TABLE = "u_notification_reminders"

Audience = Literal["patient", "staff", "both"]

_FIELDS = [
    "sys_id",
    "u_notification_id",
    "u_audience",
    "u_notification_type",
    "u_message",
    "u_patient",
    "u_doctor",
    "u_appointment",
    "u_summary_note",
    "u_patient_read",
    "u_staff_read",
    "u_event_time",
    "sys_created_on",
]


def _val(field: Any) -> str:
    if isinstance(field, dict):
        return str(field.get("value") or "").strip()
    return str(field or "").strip()


def _display(field: Any) -> str:
    if isinstance(field, dict):
        return str(field.get("display_value") or "").strip()
    return str(field or "").strip()


def _bool(field: Any) -> bool:
    return _val(field).lower() in {"true", "1", "yes"}


async def create_notification(
    settings: Settings,
    *,
    audience: Audience,
    notification_type: str,
    message: str,
    patient_sys_id: str | None = None,
    doctor_sys_id: str | None = None,
    appointment_sys_id: str | None = None,
    summary_note_sys_id: str | None = None,
    http_client: httpx.AsyncClient | None = None,
) -> None:
    """Insert a notification row. Best-effort: any failure is logged, never raised."""
    payload: dict[str, Any] = {
        "u_notification_id": f"NTF-{uuid4().hex[:12].upper()}",
        "u_audience": audience,
        "u_notification_type": notification_type,
        "u_message": message[:1000],
        "u_event_time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "u_patient_read": "false",
        "u_staff_read": "false",
    }
    if patient_sys_id:
        payload["u_patient"] = patient_sys_id
    if doctor_sys_id:
        payload["u_doctor"] = doctor_sys_id
    if appointment_sys_id:
        payload["u_appointment"] = appointment_sys_id
    if summary_note_sys_id:
        payload["u_summary_note"] = summary_note_sys_id

    async def run(client: httpx.AsyncClient) -> None:
        response = await client.post(
            f"{settings.snow_base_url}/api/now/table/{TABLE}",
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        if not response.is_success:
            logger.warning(
                "Failed to write notification (%s/%s): %s %s",
                audience,
                notification_type,
                response.status_code,
                response.text[:300],
            )

    try:
        if http_client is not None:
            await run(http_client)
        else:
            async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
                await run(client)
    except Exception:  # noqa: BLE001 - notifications must never break the operation
        logger.exception("Notification write raised (%s/%s)", audience, notification_type)


def _map_notification(record: dict[str, Any]) -> NotificationItem:
    return NotificationItem(
        sys_id=_val(record.get("sys_id")),
        notification_id=_val(record.get("u_notification_id")),
        audience=_val(record.get("u_audience")),
        notification_type=_val(record.get("u_notification_type")),
        message=_display(record.get("u_message")) or _val(record.get("u_message")),
        patient_sys_id=_val(record.get("u_patient")),
        patient_name=_display(record.get("u_patient")),
        doctor_sys_id=_val(record.get("u_doctor")),
        doctor_name=_display(record.get("u_doctor")),
        appointment_sys_id=_val(record.get("u_appointment")),
        summary_note_sys_id=_val(record.get("u_summary_note")),
        patient_read=_bool(record.get("u_patient_read")),
        staff_read=_bool(record.get("u_staff_read")),
        event_time=_display(record.get("u_event_time")) or _display(record.get("sys_created_on")),
        created_on=_display(record.get("sys_created_on")),
    )


async def fetch_notifications(
    settings: Settings,
    *,
    audience: Literal["patient", "staff"],
    patient_sys_id: str | None = None,
    doctor_sys_id: str | None = None,
    limit: int = 100,
    http_client: httpx.AsyncClient | None = None,
) -> list[NotificationItem]:
    """List notifications for a patient or a doctor.

    - patient: rows where audience is patient/both AND linked to this patient.
    - staff:   rows where audience is staff/both AND (linked to this doctor OR no doctor).
    """
    if audience == "patient":
        if not patient_sys_id:
            return []
        query = f"u_audienceINpatient,both^u_patient={patient_sys_id}"
    else:
        if not doctor_sys_id:
            return []
        query = f"u_audienceINstaff,both^u_doctor={doctor_sys_id}^ORu_doctorISEMPTY"
    query += "^ORDERBYDESCsys_created_on"

    async def run(client: httpx.AsyncClient) -> list[NotificationItem]:
        response = await client.get(
            f"{settings.snow_base_url}/api/now/table/{TABLE}",
            params={
                "sysparm_query": query,
                "sysparm_fields": ",".join(_FIELDS),
                "sysparm_display_value": "all",
                "sysparm_limit": str(limit),
            },
            headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        response.raise_for_status()
        result = response.json().get("result", [])
        return [_map_notification(row) for row in result if isinstance(row, dict)]

    if http_client is not None:
        return await run(http_client)
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        return await run(client)


async def mark_notification_read(
    settings: Settings,
    sys_id: str,
    audience: Literal["patient", "staff"],
    http_client: httpx.AsyncClient | None = None,
) -> None:
    """Flip the per-audience read flag for a single notification."""
    field = "u_patient_read" if audience == "patient" else "u_staff_read"

    async def run(client: httpx.AsyncClient) -> None:
        response = await client.patch(
            f"{settings.snow_base_url}/api/now/table/{TABLE}/{sys_id}",
            json={field: "true"},
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password),
        )
        response.raise_for_status()

    if http_client is not None:
        await run(http_client)
        return
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        await run(client)
