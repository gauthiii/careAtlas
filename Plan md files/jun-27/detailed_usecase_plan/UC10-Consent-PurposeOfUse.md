# Use Case 10 — Consent & Purpose-of-Use Enforcement: The AI Only Sees What You Said It Could

**Category:** Consent & Purpose · **Reg:** GDPR (purpose limitation) / EU AI Act · **Demo date:** 2026-06-26
**Instance:** `ven04690.service-now.com` · **App:** CareAtlas (`server/app/*`, `src/*`)
**Code identifier:** implemented under `UC11` / `ConsentGate` in code; **10th use case** in the business plan sequence.
**Live-verified:** 2026-06-26 (read-only curl with `server/.env`, user `interface_gautham`)

---

## 1. Talk to me like a baby — what is this?

Imagine a hospital full of helpful robots. Today, if a robot is *allowed to open the patient drawer* (it has table access), it will help **any** patient, for **any** job, any time.

But a patient might say: *"You can use AI to book my appointments, but do NOT let an AI summarise my medical notes."*

Right now nothing stops the notes robot from summarising that patient's record anyway. That's the problem.

**Consent & Purpose-of-Use Enforcement** fixes it: every patient ticks the boxes for the AI jobs they're OK with — **scheduling, notes summarisation, reminders, triage**. Then, before *any* robot touches a patient, a gate called **ConsentGate** checks: *"Did this patient say yes to my job?"* If not → the robot is blocked and never sees the data.

> Table access asks *"can this robot open the drawer?"*. **Consent asks *"did this patient agree to THIS robot's job?"*** — that's purpose-level, and it's stronger than ACLs alone.

---

## 2. What problem we are solving

Agents processing a patient's data for a **purpose the patient never consented to**. Field-level and table-level ACLs (UC1/UC2) bound *which identity can read what columns* — they do **not** capture *per-patient, per-purpose consent*. An agent can be perfectly least-privileged and still run on a patient who opted out. UC10 closes that gap.

---

## 3. The real things on the instance (verified live, 2026-06-26)

| Table / field | Live state | Why it matters |
|---|---|---|
| `u_patient.u_consent_flags` | **Live, populated** (e.g. `scheduling,notes_summarisation,reminders,triage`) | The per-patient list of allowed AI purposes |
| `u_patient.u_consent_accepted` | **Live** (`true`/`false`) | Whether the patient has accepted consent |
| `u_patient.u_consent_accepted_on` | **Live** (timestamp) | When consent was last recorded |
| `u_patient.u_username` / `u_email` | Live | Used to look the patient up from the app |
| `sn_si_incident` (`category=consent_purpose_violation`) | **0 today** | SecOps incident raised when a purpose is breached |

**Purpose vocabulary (canonical):** `scheduling`, `notes_summarisation`, `reminders`, `triage`.
**Agent → purpose mapping:** Scheduling Agent → `scheduling`; Clinical Notes Agent → `notes_summarisation`; Reminder Agent → `reminders`; Triage Agent → `triage`.

---

## 4. Steps on the ServiceNow instance

1. **Confirm the consent fields exist on `u_patient`** (live): `u_consent_flags` (string, comma-separated), `u_consent_accepted` (true/false), `u_consent_accepted_on` (date/time). If recreating: add these custom fields to `u_patient`.
2. **Seed consent on demo patients** so the demo has both consented and opted-out cases — e.g. set one patient's `u_consent_flags` to `scheduling` only (so the notes/triage agents are blocked for them).
3. **Confirm the SecOps incident category** `consent_purpose_violation` is selectable on `sn_si_incident` (Security Incident). This is where a breach is logged.
4. **(Net-new — see §7) wire the runtime gate** so an agent read of a patient checks `u_consent_flags` for its purpose and, on a miss, refuses and opens an `sn_si_incident`.

> **No-assumption note:** the consent **data** is live and populated today; the **runtime block** (ConsentGate inside the agent read path) is the one net-new piece — see the honest scope in the completed doc.

---

## 5. Steps on the CareAtlas app

### 5.1 Backend (`server/app/`)
- **Models** (`models.py`):
  - `ConsentFlagsResponse { flags: list[str], consent_accepted: bool, flags_set: bool }`
  - `ConsentFlagsRequest { flags: list[str] }`
  - `ConsentViolationEntry { opened_at, short_description, priority, state }`
  - `ConsentViolationsResponse { count_30_days: int, recent: list[ConsentViolationEntry] }`
- **ServiceNow functions** (`servicenow.py`):
  - `fetch_consent_flags(username, settings)` — look the patient up by `u_username` (fallback `u_email`), parse `u_consent_flags` into a list.
  - `update_consent_flags(username, flags, settings)` — write the CSV flags + set `u_consent_accepted=true` + `u_consent_accepted_on=now`.
  - `fetch_consent_violations(settings)` — count `sn_si_incident` rows with `category=consent_purpose_violation` in the last 30 days + return recent rows.
- **Endpoints** (`main.py`):
  - `GET /api/patient/consent-flags` (header `X-Username`) → `ConsentFlagsResponse`
  - `POST /api/patient/consent-flags` (`{flags}`, header `X-Username`) → writes flags
  - `GET /api/governance/consent-violations` → `ConsentViolationsResponse`

### 5.2 Frontend (`src/`)
- **Patient** — `pages/patient/ProfilePage.tsx`: the patient views (`fetchConsentFlags`) and toggles (`updateConsentFlags`) which AI purposes they allow.
- **Governance** — `pages/governance/GovernanceDashboardPage.tsx`: the **"Patient Consent Enforcement"** panel ("ConsentGate active") lists the gated agents (Scheduling/Notes/Reminder/Triage) and explains how the gate works.
- **Service** — `services/serviceNow.ts`: `fetchConsentFlags`, `updateConsentFlags`, (and `fetchConsentCoverage` — currently points at an unimplemented `/api/governance/consent-coverage`, track as a loose end).
- **Workflow modal** — `components/governance/UseCaseWorkflowsModal.tsx`: the `uc10` tab (`FLOW_UC10`) animates Intake → Assess → Enforce → Monitor.
- **Demo hub** — `pages/governance/GovernanceDemoPage.tsx`: the **"Consent & Purpose"** card opens the workflow modal inline (it does **not** navigate to a new page).

---

## 6. Curl proof (run live before the demo)

```bash
set -a; . ./server/.env; set +a
SNOW="$SNOW_INSTANCE"; U="$SNOW_USERNAME"; P="$SNOW_PASSWORD"

# Per-patient consent flags exist and are populated
curl -s -u "$U:$P" "https://$SNOW/api/now/table/u_patient?sysparm_fields=u_patient_id,u_consent_flags,u_consent_accepted&sysparm_limit=5"

# Consent-violation incidents (purpose breaches)
curl -s -u "$U:$P" "https://$SNOW/api/now/stats/sn_si_incident?sysparm_count=true&sysparm_query=category=consent_purpose_violation"

# CareAtlas API — read one patient's consent flags
curl -s "http://127.0.0.1:8000/api/patient/consent-flags" -H "X-Username: <patient_username>"
```

---

## 7. The net-new piece (how to make ConsentGate truly enforce)

To turn the dashboard's "ConsentGate active" claim into runtime truth:
1. In the scoped-agent read path (`ask_scoped_agent` in `servicenow.py`), before reading the patient, fetch `u_consent_flags` and check the agent's required purpose is present.
2. If absent → return a "blocked by consent" answer and **do not** read the record.
3. Write an `sn_si_incident` with `category=consent_purpose_violation` describing the agent, patient, and purpose.
4. Surface the live 30-day violation count on the governance panel (replace the static text), via `GET /api/governance/consent-violations`.

---

## 8. The demo moment

A patient opens their profile and **un-ticks "notes summarisation"**. The Clinical Notes Agent then tries to summarise that patient → **ConsentGate blocks it**, no data is read, and a `consent_purpose_violation` incident appears on the governance dashboard. We prove the AI only ever processed data the patient agreed to — purpose by purpose.
</content>
