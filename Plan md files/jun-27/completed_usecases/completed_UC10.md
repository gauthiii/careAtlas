# Completed — UC10 Consent & Purpose-of-Use Enforcement: The AI Only Sees What You Said It Could

**Instance:** `ven04690.service-now.com`
**App:** CareAtlas (React/Vite frontend + FastAPI backend in `server/`)
**Status date:** 2026-06-26
**Code identifier:** built under `UC11` / `ConsentGate` in code; documented as **UC10** (10th use case in the business plan).
**What this use case proves:** every patient declares which AI *purposes* they allow (scheduling, notes summarisation, reminders, triage), and the platform is built to let agents process a patient's data **only** for consented purposes — purpose-level consent, beyond table/field ACLs.

> **Update 2026-06-26 — runtime ConsentGate is now wired and verified live.** The enforcing
> block was added to the scoped-agent read path (`ask_scoped_agent`): a gated agent now refuses
> to read a patient who has not consented to its purpose, accesses **no** data, and opens a real
> `sn_si_incident` (`category=consent_purpose_violation`). Verified end-to-end (see §6.1): the
> Clinical Notes Agent was blocked for a scheduling-only patient → incident **SIR0010002** opened;
> the Scheduling Agent was allowed for the same patient. A dedicated demo page
> (`/governance/demo/consent`) now hosts the workflow modal, the consent panel, and a live
> **incidents table**. The remaining loose ends are minor (see §6.2).

---

## 0. TL;DR — what was built

| Layer | Mechanism | Live & working? | Where |
|---|---|---|---|
| **Consent data model** | `u_patient.u_consent_flags` (CSV of purposes) + `u_consent_accepted` + `u_consent_accepted_on` | ✅ **Yes** (fields exist & populated) | ServiceNow `u_patient` |
| **Patient self-service consent** | Toggle the 4 AI purposes in the profile; saved live | ✅ **Yes** | React `ProfilePage.tsx` → `POST /api/patient/consent-flags` |
| **Read consent** | App reads a patient's allowed purposes | ✅ **Yes** | `GET /api/patient/consent-flags` |
| **Violation reporting** | 30-day count + recent `consent_purpose_violation` incidents | ✅ **Yes** (query works; 0 rows today) | `GET /api/governance/consent-violations` → `sn_si_incident` |
| **Governance panel** | "Patient Consent Enforcement" / "ConsentGate active" + gated-agent list | ✅ **Yes** (panel renders; content is static) | React `GovernanceDashboardPage.tsx` |
| **Workflow modal** | `uc10` tab | ✅ **Yes** | `UseCaseWorkflowsModal.tsx` |
| **Dedicated demo page** | Demo-hub card → `/governance/demo/consent` (workflow modal + panel + incidents table) | ✅ **Yes** | `pages/governance/demo/ConsentPage.tsx` |
| **Incidents table** | Live `consent_purpose_violation` incidents in a table | ✅ **Yes** | `GET /api/governance/consent-violations` |
| **Runtime ConsentGate (block at read-time)** | Agent refuses + logs incident when purpose not consented | ✅ **Yes (wired + verified)** | `ask_scoped_agent` in `servicenow.py` |

**Purpose vocabulary (canonical):** `scheduling`, `notes_summarisation`, `reminders`, `triage`.
**Agent → required purpose:** Scheduling Agent → `scheduling` · Clinical Notes Agent → `notes_summarisation` · Reminder Agent → `reminders` · Triage Agent → `triage`.

---

## 1. ServiceNow objects (source of truth on `ven04690`)

Open any record at `https://ven04690.service-now.com/<table>.do?sys_id=<sys_id>`.

### 1.1 Consent fields on `u_patient` (verified live, populated)
| Field | Type | Purpose |
|---|---|---|
| `u_consent_flags` | String (comma-separated) | The patient's allowed AI purposes, e.g. `scheduling,notes_summarisation,reminders,triage` |
| `u_consent_accepted` | True/False | Whether the patient has accepted consent |
| `u_consent_accepted_on` | Date/Time | When consent was last recorded |
| `u_username` / `u_email` | String | Used to look the patient up from the app |

> **Live sample (2026-06-26):** patients carry values such as `u_consent_flags="scheduling"` (opted out of everything else) and `u_consent_flags="scheduling,notes_summarisation,reminders,triage"` (fully consented), with `u_consent_accepted=true`.

### 1.2 Violation incidents
| Table | Query | Live count (2026-06-26) |
|---|---|---|
| `sn_si_incident` | `category=consent_purpose_violation` | **0** (none raised yet — see the gap in §6) |

---

## 2. Backend — what was built (`server/app/`)

### 2.1 Models (`models.py`)
```python
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
```

### 2.2 ServiceNow functions (`servicenow.py`)
- **`fetch_consent_flags(username, settings)`** — looks the patient up by `u_username` (falls back to `u_email`), reads `u_consent_flags`, and returns `{flags: [...], consent_accepted: bool, flags_set: bool}`. Returns empty/false when no patient matches.
- **`update_consent_flags(username, flags, settings)`** — finds the patient by `u_username`, then PATCHes `u_consent_flags` (CSV), sets `u_consent_accepted=true` and `u_consent_accepted_on=<now UTC>`. Returns `False` if no patient matched.
- **`fetch_consent_violations(settings)`** — counts `sn_si_incident` rows with `category=consent_purpose_violation` opened in the last 30 days, and returns up to 20 recent rows (`opened_at, short_description, priority, state`).

**Runtime ConsentGate (added 2026-06-26, `servicenow.py`):**
- **`AGENT_CONSENT_PURPOSE`** — maps each scoped agent to its required purpose: `scheduling→scheduling`, `notes→notes_summarisation`, `reminder→reminders`, `triage→triage`, `identity→None` (**exempt**).
- **`_patient_consents_to(settings, client, sys_id, purpose)`** — reads the patient's `u_consent_flags` (main account, by sys_id); returns whether `purpose` is present. **Fail-closed:** any read error → `False` → blocked.
- **`_open_consent_violation_incident(...)`** — POSTs an `sn_si_incident` (`category=consent_purpose_violation`) describing agent/purpose/patient; returns the incident number.
- **In `ask_scoped_agent`** (after resolving the patient, before reading it): if the agent has a required purpose and the patient has not consented → returns a `kind="info"` "🔒 Blocked by ConsentGate" answer, **reads no patient data**, and opens the incident. `identity` is exempt and proceeds.

### 2.3 Endpoints (`main.py`)
| Method | Path | Auth/Input | Returns |
|---|---|---|---|
| GET | `/api/patient/consent-flags` | header `X-Username` (400 if missing) | `ConsentFlagsResponse` |
| POST | `/api/patient/consent-flags` | header `X-Username` + body `{flags}` (404 if patient not found) | `{success: true}` |
| GET | `/api/governance/consent-violations` | — | `ConsentViolationsResponse` |

---

## 3. Frontend — what was built (`src/`)

### 3.1 Patient consent UI (`pages/patient/ProfilePage.tsx`)
- On load, calls `fetchConsentFlags(username)` and shows the patient's current allowed purposes.
- Renders 4 toggles (value → label):
  - `scheduling` → "Appointment scheduling"
  - `notes_summarisation` → "Clinical notes"
  - `reminders` → "Appointment reminders"
  - `triage` → "Triage assessment"
- `handleConsentToggle(value)` adds/removes the purpose and immediately saves via `updateConsentFlags(username, updated)` (with a saving state + error handling).

### 3.2 Governance panel (`pages/governance/GovernanceDashboardPage.tsx`)
- "Patient Consent Enforcement" panel with a green **"ConsentGate active"** banner.
- Lists the gated agents and their bound purpose: Scheduling Agent (`svc-scheduling-agent` · `scheduling`), Clinical Notes Agent (`svc-notes-agent` · `notes_summarisation`), Reminder Agent (`svc-reminder-agent` · `reminders`), Triage Agent (`svc-triage-agent` · `triage`).
- "How enforcement works" explainer. **Note:** this panel is currently **static copy** — it does not yet read a live coverage/violation count (see §6).

### 3.3 Service client (`services/serviceNow.ts`)
- `fetchConsentFlags(username)` → `GET /api/patient/consent-flags` (sends `X-Username`).
- `updateConsentFlags(username, flags)` → `POST /api/patient/consent-flags`.
- `fetchConsentCoverage()` → `GET /api/governance/consent-coverage` — **dangling**: this endpoint is **not implemented** on the backend (the backend exposes `/governance/consent-violations`). Track as a loose end (§6).

### 3.4 Workflow modal, dedicated page, shared panel & incidents table (added 2026-06-26)
- **`components/governance/UseCaseWorkflowsModal.tsx`** — new `FLOW_UC10` + a **`uc10` tab** ("Consent — Purpose-of-Use Enforcement") animating **Intake → Assess → Enforce → Monitor**:
  1. Patient declares consent (`u_patient.u_consent_flags`) → 2. Map agent → purpose → 3. ConsentGate checks purpose → 4. Block if not consented → 5. Violation logged (`sn_si_incident`) → 6. Patient can revoke anytime.
- **`components/governance/ConsentEnforcementPanel.tsx`** — the "Patient Consent Enforcement" panel **extracted into a shared component**, used in BOTH the governance dashboard (`GovernanceDashboardPage.tsx`) and the new consent page (replicated, single source of truth).
- **`pages/governance/demo/ConsentPage.tsx`** (route `/governance/demo/consent`, registered in `App.tsx`) — the dedicated page: a **"View Consent Workflow"** launcher that opens `UseCaseWorkflowsModal` with `initialTab="uc10"`, the **`ConsentEnforcementPanel`**, and a live **Consent Violation Incidents table** fed by `GET /api/governance/consent-violations` (columns: Opened / Short description / Priority / State, with the 30-day count and a Refresh button).
- **`pages/governance/GovernanceDemoPage.tsx`** — the **"Consent & Purpose"** card now **navigates to `/governance/demo/consent`** (a `Link`, like the other use-case cards) instead of opening a modal inline. Section heading updated to "Governance Use Cases".
- **`services/serviceNow.ts`** — added `fetchConsentViolations()` + `ConsentViolationsResponse`/`ConsentViolationEntry` types.

---

## 4. Recreating it from scratch

**ServiceNow:**
1. Add `u_consent_flags` (string), `u_consent_accepted` (true/false), `u_consent_accepted_on` (date/time) to `u_patient`.
2. Populate consent on demo patients (include at least one partially-consented patient so a block can be demonstrated).
3. Ensure `consent_purpose_violation` is a valid `category` on `sn_si_incident`.

**Backend:** add the 3 models, 3 servicenow functions, and 3 endpoints above.

**Frontend:** add the consent toggles to `ProfilePage.tsx`, the consent panel to `GovernanceDashboardPage.tsx`, the `uc10` flow+tab to `UseCaseWorkflowsModal.tsx`, and the Consent card to `GovernanceDemoPage.tsx`.

---

## 5. Curl verification (run live)

```bash
set -a; . ./server/.env; set +a
SNOW="$SNOW_INSTANCE"; U="$SNOW_USERNAME"; P="$SNOW_PASSWORD"

# Consent fields exist & are populated
curl -s -u "$U:$P" "https://$SNOW/api/now/table/u_patient?sysparm_fields=u_patient_id,u_consent_flags,u_consent_accepted&sysparm_limit=5"

# Violation incidents (0 today)
curl -s -u "$U:$P" "https://$SNOW/api/now/stats/sn_si_incident?sysparm_count=true&sysparm_query=category=consent_purpose_violation"

# App: read a patient's consent flags (start the backend first)
curl -s "http://127.0.0.1:8000/api/patient/consent-flags" -H "X-Username: <patient_username>"

# App: governance violation summary
curl -s "http://127.0.0.1:8000/api/governance/consent-violations"
```

---

## 6. Status & remaining loose ends

### 6.1 Live verification of the runtime gate (2026-06-26)
Tested against a patient consented to `scheduling` only (`u_patient` sys_id `517e27201b9d8314d7eaea45604bcb08`):
- **Clinical Notes Agent** (purpose `notes_summarisation`) → **blocked**, no data read, incident **SIR0010002** opened (`category=consent_purpose_violation`).
- **Scheduling Agent** (purpose `scheduling`) → **allowed** (returned scoped, PII-stripped data).
- `GET /api/governance/consent-violations` → `count_30_days: 1`, the incident in `recent[]` (drives the page table).

### 6.2 Remaining loose ends (minor)
1. **Governance *dashboard* panel copy is still static.** The shared `ConsentEnforcementPanel` shows the gated agents and "ConsentGate active" as descriptive copy; the **live 30-day count + incidents table** live on the dedicated **`/governance/demo/consent`** page. (The dashboard could embed the same table if desired.)
2. **`fetchConsentCoverage` is dangling.** The frontend service still calls `GET /api/governance/consent-coverage`, which the backend does not implement, and nothing renders it. Implement a coverage endpoint (total / fully-consented / partial / none) or remove the helper.
3. **Incident detail depth.** Incidents are created with `short_description`, `description`, and `category` only; impact/urgency/priority are left to platform defaults. Enrich if the demo needs a specific priority.

---

## 7. The demo moment

A patient opens their profile and un-ticks **"Clinical notes"**. The Clinical Notes Agent then tries to summarise that patient → **ConsentGate blocks it**, no data is read, and a `consent_purpose_violation` incident appears in the **Consent Violation Incidents** table on `/governance/demo/consent` — proving the AI only ever processed data for purposes the patient explicitly agreed to.
</content>
