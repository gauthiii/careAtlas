"""Backfill `u_notification_reminders` from existing CareAtlas data so that
patients and clinicians see a populated notification history on first login.

For every existing record it creates audience="both" rows linked to the right
patient / doctor / appointment / summary note, with `u_event_time` set from the
record's own timestamps (so the feed is chronologically realistic):

  appointment  -> appointment_created (+ appointment_confirmed / _completed by status)
  summary note -> summary_note_added
  patient      -> registration_complete (+ registration_approved / _rejected by status)

Idempotent: re-running skips any (type, linked-record) notification that already exists.

Usage:
    cd CareAtlas/server
    .venv/bin/python scripts/backfill_notifications.py
"""

import sys
from pathlib import Path
from uuid import uuid4

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402

TABLE = "u_notification_reminders"


def _v(field):
    return str(field.get("value") if isinstance(field, dict) else (field or "")).strip()


def _d(field):
    return str(field.get("display_value") if isinstance(field, dict) else (field or "")).strip()


def _get_all(client, base, table, fields):
    resp = client.get(
        f"{base}/api/now/table/{table}",
        params={"sysparm_fields": ",".join(fields), "sysparm_display_value": "all", "sysparm_limit": "10000"},
    )
    resp.raise_for_status()
    return resp.json().get("result", [])


def main() -> None:
    settings = get_settings()
    base = settings.snow_base_url
    auth = (settings.snow_username, settings.snow_password)
    headers = {"Accept": "application/json", "Content-Type": "application/json"}

    with httpx.Client(timeout=60.0, auth=auth, headers=headers) as client:
        # Lookups.
        doctors = {_v(d.get("sys_id")): (_d(d.get("u_first_name")) + " " + _d(d.get("u_last_name"))).strip()
                   for d in _get_all(client, base, "u_doctor", ["sys_id", "u_first_name", "u_last_name"])}
        patients_rows = _get_all(
            client, base, "u_patient",
            ["sys_id", "u_first_name", "u_last_name", "u_registration_status", "sys_created_on", "sys_updated_on"],
        )
        patients = {_v(p.get("sys_id")): (_d(p.get("u_first_name")) + " " + _d(p.get("u_last_name"))).strip()
                    for p in patients_rows}
        appts = _get_all(
            client, base, "u_appointment",
            ["sys_id", "u_doctor", "u_patient", "u_appointment_date", "u_appointment_time", "u_status",
             "sys_created_on", "sys_updated_on"],
        )
        notes = _get_all(
            client, base, "u_summary_notes",
            ["sys_id", "u_appointment", "u_doctor", "u_patient", "u_appointment_date", "u_appointment_time",
             "sys_created_on"],
        )

        # Existing notifications -> dedup keys.
        existing = _get_all(
            client, base, TABLE,
            ["u_notification_type", "u_appointment", "u_summary_note", "u_patient"],
        )
        seen = set()
        for n in existing:
            ntype = _v(n.get("u_notification_type"))
            ref = _v(n.get("u_appointment")) or _v(n.get("u_summary_note")) or _v(n.get("u_patient"))
            seen.add((ntype, ref))

        planned: list[dict] = []

        def add(ntype, ref, payload):
            if (ntype, ref) in seen:
                return
            seen.add((ntype, ref))
            planned.append(payload)

        def base_row(ntype, message, when, *, patient="", doctor="", appointment="", note=""):
            row = {
                "u_notification_id": f"NTF-{uuid4().hex[:12].upper()}",
                "u_audience": "both",
                "u_notification_type": ntype,
                "u_message": message[:1000],
                "u_event_time": when,
                "u_patient_read": "false",
                "u_staff_read": "false",
            }
            if patient:
                row["u_patient"] = patient
            if doctor:
                row["u_doctor"] = doctor
            if appointment:
                row["u_appointment"] = appointment
            if note:
                row["u_summary_note"] = note
            return row

        # Appointments.
        for a in appts:
            sid = _v(a.get("sys_id"))
            doc = _v(a.get("u_doctor"))
            pat = _v(a.get("u_patient"))
            dname = doctors.get(doc, _d(a.get("u_doctor")) or "your doctor")
            date = _d(a.get("u_appointment_date"))
            time = _d(a.get("u_appointment_time"))
            status = _v(a.get("u_status")).lower()
            created = _v(a.get("sys_created_on"))
            updated = _v(a.get("sys_updated_on")) or created

            add("appointment_created", sid, base_row(
                "appointment_created",
                f"Appointment booked with Dr. {dname} on {date} at {time}.",
                created, patient=pat, doctor=doc, appointment=sid,
            ))
            if status == "confirmed":
                add("appointment_confirmed", sid, base_row(
                    "appointment_confirmed",
                    f"Appointment with Dr. {dname} on {date} at {time} is confirmed.",
                    updated, patient=pat, doctor=doc, appointment=sid,
                ))
            elif status == "completed":
                add("appointment_completed", sid, base_row(
                    "appointment_completed",
                    f"Appointment with Dr. {dname} on {date} at {time} was completed.",
                    updated, patient=pat, doctor=doc, appointment=sid,
                ))
            elif status == "cancelled":
                add("appointment_cancelled", sid, base_row(
                    "appointment_cancelled",
                    f"Appointment with Dr. {dname} on {date} at {time} was cancelled.",
                    updated, patient=pat, doctor=doc, appointment=sid,
                ))

        # Summary notes.
        for note in notes:
            nid = _v(note.get("sys_id"))
            doc = _v(note.get("u_doctor"))
            pat = _v(note.get("u_patient"))
            appt = _v(note.get("u_appointment"))
            date = _d(note.get("u_appointment_date"))
            time = _d(note.get("u_appointment_time"))
            created = _v(note.get("sys_created_on"))
            add("summary_note_added", nid, base_row(
                "summary_note_added",
                f"A summary note was added for the appointment on {date} at {time}.",
                created, patient=pat, doctor=doc, appointment=appt, note=nid,
            ))

        # Patient registrations.
        for p in patients_rows:
            pid = _v(p.get("sys_id"))
            name = patients.get(pid, "").strip()
            status = _v(p.get("u_registration_status")).lower()
            created = _v(p.get("sys_created_on"))
            updated = _v(p.get("sys_updated_on")) or created
            who = name or "the patient"
            add("registration_complete", pid, base_row(
                "registration_complete",
                f"Registration completed for {who}.",
                created, patient=pid,
            ))
            if status in ("approved", "active"):
                add("registration_approved", pid, base_row(
                    "registration_approved",
                    f"Registration for {who} was approved.",
                    updated, patient=pid,
                ))
            elif status in ("rejected", "denied"):
                add("registration_rejected", pid, base_row(
                    "registration_rejected",
                    f"Registration for {who} was rejected.",
                    updated, patient=pid,
                ))

        print(f"Planned {len(planned)} new notifications (existing skipped).")
        ok = 0
        for row in planned:
            resp = client.post(f"{base}/api/now/table/{TABLE}", json=row)
            if resp.is_success:
                ok += 1
            else:
                print(f"  [fail] {row['u_notification_type']}: {resp.status_code} {resp.text[:200]}")
        print(f"Inserted {ok}/{len(planned)} notifications.")


if __name__ == "__main__":
    main()
