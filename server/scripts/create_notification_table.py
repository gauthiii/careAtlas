"""Create the `u_notification_reminders` ServiceNow table and its columns via the
metadata API (`sys_db_object` + `sys_dictionary`).

Requires the service account in server/.env to hold the `admin` role. Idempotent:
re-running skips the table if it already exists and skips columns already present.

Usage:
    cd CareAtlas/server
    python scripts/create_notification_table.py
"""

import sys
from pathlib import Path

import httpx

# Make `app` importable when run from anywhere.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402

TABLE_NAME = "u_notification_reminders"
TABLE_LABEL = "Notification Reminders"

# (element, internal_type, column_label, extra dictionary attrs)
COLUMNS = [
    ("u_notification_id", "string", "Notification ID", {"max_length": 60}),
    ("u_audience", "string", "Audience", {"max_length": 40}),
    ("u_notification_type", "string", "Notification Type", {"max_length": 60}),
    ("u_message", "string", "Message", {"max_length": 1000}),
    ("u_patient", "reference", "Patient", {"reference": "u_patient"}),
    ("u_doctor", "reference", "Doctor", {"reference": "u_doctor"}),
    ("u_appointment", "reference", "Appointment", {"reference": "u_appointment"}),
    ("u_summary_note", "reference", "Summary Note", {"reference": "u_summary_notes"}),
    ("u_patient_read", "boolean", "Patient Read", {"default_value": "false"}),
    ("u_staff_read", "boolean", "Staff Read", {"default_value": "false"}),
    ("u_event_time", "glide_date_time", "Event Time", {}),
]


def main() -> None:
    settings = get_settings()
    base = settings.snow_base_url
    auth = (settings.snow_username, settings.snow_password)
    headers = {"Accept": "application/json", "Content-Type": "application/json"}

    with httpx.Client(timeout=60.0, auth=auth, headers=headers) as client:
        # 1. Create the table if missing.
        existing = client.get(
            f"{base}/api/now/table/sys_db_object",
            params={"sysparm_query": f"name={TABLE_NAME}", "sysparm_fields": "name,sys_id", "sysparm_limit": 1},
        )
        existing.raise_for_status()
        if existing.json().get("result"):
            print(f"[skip] table {TABLE_NAME} already exists")
        else:
            resp = client.post(
                f"{base}/api/now/table/sys_db_object",
                json={"name": TABLE_NAME, "label": TABLE_LABEL, "sys_scope": "global"},
            )
            if not resp.is_success:
                raise SystemExit(f"Failed to create table: {resp.status_code} {resp.text}")
            print(f"[ok] created table {TABLE_NAME}")

        # 2. Read existing columns so we can skip ones already present.
        dict_resp = client.get(
            f"{base}/api/now/table/sys_dictionary",
            params={
                "sysparm_query": f"name={TABLE_NAME}^elementISNOTEMPTY",
                "sysparm_fields": "element",
                "sysparm_limit": 1000,
            },
        )
        dict_resp.raise_for_status()
        present = {row.get("element") for row in dict_resp.json().get("result", [])}

        # 3. Create each column if missing.
        for element, internal_type, label, extra in COLUMNS:
            if element in present:
                print(f"[skip] column {element} already exists")
                continue
            payload = {
                "name": TABLE_NAME,
                "element": element,
                "internal_type": internal_type,
                "column_label": label,
                "active": "true",
            }
            payload.update({k: str(v) for k, v in extra.items()})
            resp = client.post(f"{base}/api/now/table/sys_dictionary", json=payload)
            if not resp.is_success:
                raise SystemExit(f"Failed to create column {element}: {resp.status_code} {resp.text}")
            print(f"[ok] created column {element} ({internal_type})")

    print("\nDone. Verify with:")
    print(
        f'  curl -u USER:PASS "{base}/api/now/table/{TABLE_NAME}?sysparm_limit=1"'
    )


if __name__ == "__main__":
    main()
