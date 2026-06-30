# Completed — UC1 Privacy: Sensitive Information Disclosure (OWASP LLM02)

**Instance:** `ven04690.service-now.com`
**App:** CareAtlas (React/Vite frontend + FastAPI backend in `server/`)
**Status date:** 2026-06-25
**What this use case proves:** No AI agent can leak a patient's PII (name, DOB, email,
phone, gender, ethnicity, insurance ID); the audit log itself can't re-identify a
patient; and access is governed by *role*, demonstrated live by toggling between two
agents that differ only by one role.

> **Honesty note (read first).** This use case is enforced by three layers. Two are
> **genuinely live and enforced by ServiceNow**: the field-level **ACLs** (Wall 1) and
> the **anonymized audit log** (Wall 3). The third, the **Gen AI PII filter** (Wall 2),
> is a **real, active record on the instance but is not yet wired into a live runtime
> output path** — see [Section 7](#7-wall-2--gen-ai-pii-filter-configured-not-yet-invoked).
> Nothing in this document overstates what is running.

---

## 0. TL;DR — what was built

| Layer | Mechanism | Enforced live? | Where |
|---|---|---|---|
| **Wall 1 — Field ACLs** | 8 field-level read ACLs on `u_patient` PII columns, each requiring role `role_patient_pii` | ✅ **Yes** (ServiceNow strips the columns) | ServiceNow `sys_security_acl` |
| **Wall 2 — Output guardrail** | `sys_gen_ai_filter` "CareAtlas PII Output Guard" (active) + 5 PII sample phrases | ⚠️ **Record real & active, not invoked at runtime** | ServiceNow `sys_gen_ai_filter` |
| **Wall 3 — Anonymized log** | `u_ai_decision_log` keyed on `u_patient_id_anon` only | ✅ **Yes** | ServiceNow `u_ai_decision_log` |
| **Live proof UI** | Two scoped agents + side-by-side redaction, all read from the live instance | ✅ **Yes** | CareAtlas React app |

---

## 1. ServiceNow objects created/changed (the source of truth)

Every object below currently exists on `ven04690`. `sys_id`s are recorded so anyone can
open the exact record (`https://ven04690.service-now.com/<table>.do?sys_id=<sys_id>`).

### 1.1 Roles

| Role name | Purpose | `sys_id` | Origin |
|---|---|---|---|
| `role_patient_pii` | **The gate.** Required to read any PII field on `u_patient`. | `70e302461b1d0354b72fc9d3604bcbbe` | Pre-existing |
| `u_patients_user` | Grants **table-level read** on `u_patient` (no PII by itself). | `1f6e76e41b518314d7eaea45604bcb2b` | Pre-existing |
| `u_scheduling_agent` | Alternative table-level read role on `u_patient`. | `f6d1ce461bd58b54d7eaea45604bcbb8` | Pre-existing |
| `u_careatlas_ai_agent` | Marker role identifying a CareAtlas non-human AI agent. | `758649cc3b79c71076f13b64c3e45a34` | **Created for UC1** |

### 1.2 Service accounts (non-human agent identities)

| User | Roles held | Holds `role_patient_pii`? | Result | `sys_id` |
|---|---|---|---|---|
| `svc-careatlas-agent` | `u_patients_user`, `u_careatlas_ai_agent` | ❌ **No** | Reads non-PII patient fields; **PII columns stripped** | `4a86c9843b79c7105551369693e45af3` |
| `svc-clinical-agent` | `u_patients_user`, `u_careatlas_ai_agent`, **`role_patient_pii`** | ✅ **Yes** | Reads the **full** patient record incl. PII | `835f094c3bf9c7105551369693e45a91` |

Both are flagged **Web service access only** and **Active**. Passwords are stored only in
`server/.env` (see [Section 4](#4-environment-variables)) — never in this document.

### 1.3 Field-level ACLs on `u_patient` (Wall 1)

There are **8 field-level read ACLs**, each requiring `role_patient_pii`,
`admin_overrides = true`, `active = true`, type `record`:

`u_first_name`, `u_last_name`, `u_email`, `u_phone`, `u_date_of_birth`,
`u_gender`, `u_ethnicity`, `u_insurance_id`

> 7 of these pre-existed. **`u_patient.u_insurance_id`** was the gap created for UC1 —
> `sys_id` `bdf8c1043bb9c7105551369693e45ae7`.

**How the ACL chain works (important to understand):**
1. The **table** read ACL on `u_patient` requires `u_patients_user` **or** `u_scheduling_agent`.
   → an account without either gets a blunt **HTTP 403** (can't see the table at all).
2. Each **field** read ACL additionally requires `role_patient_pii`.
   → an account that *can* read the table but **lacks** `role_patient_pii` gets the row
   back with the PII columns **silently removed** (this is the field-level deny we demo).

### 1.4 Gen AI PII filter (Wall 2)

| Field | Value |
|---|---|
| Record | `sys_gen_ai_filter` → **CareAtlas PII Output Guard** |
| `sys_id` | `06c949483bb9c7105551369693e45a52` |
| `filter_type` | `Sensitive` |
| `active` | `true` |
| `filter_threshold` | `0.78` |
| `is_global` | `true` |
| Sample phrases | **5** PII examples in `sys_gen_ai_filter_sample` |

---

## 2. Recreating the ServiceNow side from scratch

Two ways for each step: **(A) UI click-path** (for someone new to ServiceNow) and
**(B) REST/curl** (for automation). Replace `<INSTANCE>`, `<ADMIN_USER>`, `<ADMIN_PW>`
with your values. The admin user needs the `admin` role; **ACLs require elevating to
`security_admin`** (see note in 2.3).

> **Tip — finding any table:** In ServiceNow, type the table name + `.list` in the
> top-left **filter navigator** (e.g. `sys_user.list`) and press Enter.

### 2.1 Create the marker role `u_careatlas_ai_agent`

**A — UI**
1. Filter navigator → **`sys_user_role.list`** → **New**.
2. **Name:** `u_careatlas_ai_agent` · **Description:** "Non-human CareAtlas AI agent identity."
3. **Submit.**

**B — REST**
```bash
curl -s -u "<ADMIN_USER>:<ADMIN_PW>" -X POST \
  "https://<INSTANCE>/api/now/table/sys_user_role" \
  -H "Content-Type: application/json" \
  -d '{"name":"u_careatlas_ai_agent","description":"Non-human CareAtlas AI agent identity."}'
```

### 2.2 Create the two service accounts and assign roles

**A — UI (per user)**
1. Filter navigator → **`sys_user.list`** → **New**.
2. **User ID:** `svc-careatlas-agent` (or `svc-clinical-agent`) · tick **Active** and
   **Web service access only** · untick **Password needs reset**.
3. **Submit**, then re-open the record.
4. Right-click the header → **Set Password** → set a password → **Save**.
   *(Setting a password is only possible in the UI — see 2.5.)*
5. Scroll to the **Roles** related list → **Edit** → add:
   - `svc-careatlas-agent` → `u_patients_user`, `u_careatlas_ai_agent`
     **(do NOT add `role_patient_pii`)**
   - `svc-clinical-agent` → `u_patients_user`, `u_careatlas_ai_agent`, **`role_patient_pii`**

**B — REST (create user + assign roles; password still set in UI)**
```bash
# Create user (returns sys_id)
curl -s -u "<ADMIN_USER>:<ADMIN_PW>" -X POST \
  "https://<INSTANCE>/api/now/table/sys_user" \
  -H "Content-Type: application/json" \
  -d '{"user_name":"svc-careatlas-agent","first_name":"CareAtlas","last_name":"AI Agent (Non-Human)","web_service_access_only":"true","active":"true","password_needs_reset":"false"}'

# Assign a role (repeat per role; needs the user sys_id and role sys_id)
curl -s -u "<ADMIN_USER>:<ADMIN_PW>" -X POST \
  "https://<INSTANCE>/api/now/table/sys_user_has_role" \
  -H "Content-Type: application/json" \
  -d '{"user":"<USER_SYS_ID>","role":"<ROLE_SYS_ID>"}'
```

### 2.3 Create the missing field ACL `u_patient.u_insurance_id`

> **⚠️ Requires `security_admin` elevation.** In the top-right user menu, click your name
> → **Elevate role** → tick **security_admin** → **OK**. (This is why the ACL **cannot**
> be created over plain REST — the API returns *"ACL Exception Insert Failed due to
> security constraints"*.) Do this step in the **UI**.

**A — UI**
1. Elevate to `security_admin` (above).
2. Filter navigator → **`sys_security_acl.list`** → **New**.
3. **Type:** `record` · **Operation:** `read` · **Name:** select table `Patient [u_patient]`,
   then field `Insurance ID [u_insurance_id]`.
4. Tick **Active** and **Admin overrides**.
5. **Submit**, re-open the record, and in the **Requires role** related list add
   **`role_patient_pii`**.

To mirror an existing one, open `u_patient.u_email` (it's already configured exactly this
way) and copy its settings.

### 2.4 Create the Gen AI PII filter (Wall 2)

**A — UI**
1. Filter navigator → **`sys_gen_ai_filter.list`** → **New**.
2. **Filter name:** `CareAtlas PII Output Guard` · **Filter type:** `Sensitive` ·
   **Active:** true · **Threshold:** `0.78` · **Global:** true · **Submit**.
3. Open it → **Samples** related list (`sys_gen_ai_filter_sample`) → **New** → add PII
   example phrases (e.g. *"Patient Olivia Kumar, DOB 04/12/1986, olivia.kumar@example.com"*).

**B — REST**
```bash
# Create filter (returns sys_id)
curl -s -u "<ADMIN_USER>:<ADMIN_PW>" -X POST \
  "https://<INSTANCE>/api/now/table/sys_gen_ai_filter" \
  -H "Content-Type: application/json" \
  -d '{"filter_name":"CareAtlas PII Output Guard","filter_type":"Sensitive","filter_threshold":"0.78","is_global":"true","active":"true"}'

# Add one sample phrase (repeat)
curl -s -u "<ADMIN_USER>:<ADMIN_PW>" -X POST \
  "https://<INSTANCE>/api/now/table/sys_gen_ai_filter_sample" \
  -H "Content-Type: application/json" \
  -d '{"filter":"<FILTER_SYS_ID>","sample_text":"Patient Olivia Kumar, DOB 04/12/1986, olivia.kumar@example.com","active":"true","language":"en"}'
```

### 2.5 Known constraints on `ven04690` (so nobody wastes time)

- **Passwords cannot be set via REST** on this instance — the Table API silently drops
  `user_password` (the call returns 200 but auth still fails). **Set passwords in the UI.**
- **ACLs cannot be inserted via REST** — needs `security_admin` elevation, a UI-only action.

---

## 3. CareAtlas application changes (React + FastAPI)

### 3.1 Backend (`server/`)

| File | Change |
|---|---|
| `app/config.py` | Added settings `snow_pii_agent_username/password` (restricted agent) and `snow_clinical_agent_username/password` (privileged agent). |
| `app/models.py` | New response models: `PiiFieldAclStatus`, `PrivacyControlsResponse`, `AgentIdentity`, `PatientFieldAccess`, `PatientAccessComparison`. |
| `app/servicenow.py` | New functions: `fetch_privacy_controls()` (live ACL/filter/log posture + agent deny-probe) and `fetch_patient_access_comparison()` (reads one patient as each agent). Plus field-set constants `PII_PATIENT_FIELDS`, `PATIENT_ACCESS_FIELDS`. |
| `app/main.py` | New routes (below). |
| `.env`, `.env.example` | Added the two agent credential pairs. |

**New API endpoints:**

| Method & path | Returns |
|---|---|
| `GET /api/governance/privacy-controls` | Live posture: ACL status per PII field, agent deny-probe PASS/FAIL, active filters, PII pattern count, anonymization rate. |
| `GET /api/governance/privacy/patient-lookup?q=<search>` | One patient read as **both** agents, field-by-field, marking which PII the restricted agent had stripped. `q` is optional (blank = a sample patient with rich PII). |

Both call ServiceNow live using the agent credentials; the **redaction is decided by
ServiceNow**, not by app code. If `svc-clinical-agent` is ever unauthenticated, the
privileged view falls back to the main account and the UI shows a ⚠ note (full
transparency about which identity answered).

### 3.2 Frontend (`src/`)

| File | Change |
|---|---|
| `services/serviceNow.ts` | Added `fetchPrivacyControls()` + `fetchPatientAccessComparison()` and their TypeScript types. |
| `components/governance/PrivacyControlsPanel.tsx` | **Rewired from hardcoded demo data to the live endpoint.** Now shows a green "Live · ServiceNow" badge, per-field deny chips, and a live **agent deny-probe PASS/FAIL** row. |
| `components/governance/RoleBasedRedactionDemo.tsx` | **New.** The agent toggle + patient search + side-by-side redaction view. |
| `pages/governance/demo/PrivacyPage.tsx` | Mounted `RoleBasedRedactionDemo` above the existing client-side filter illustration. |

---

## 4. Environment variables

In `server/.env` (values redacted here — set them to the passwords you created in 2.2):

```env
SNOW_PII_AGENT_USERNAME=svc-careatlas-agent
SNOW_PII_AGENT_PASSWORD=<set-in-env>

SNOW_CLINICAL_AGENT_USERNAME=svc-clinical-agent
SNOW_CLINICAL_AGENT_PASSWORD=<set-in-env>
```

`server/.env.example` documents the same keys with placeholder values.

---

## 5. How to run it

```bash
# Terminal 1 — backend
cd server
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend (repo root)
npm run dev
```

Backend health: `curl http://localhost:8000/api/health` → `{"status":"ok"}`
API docs (every endpoint, clickable): <http://localhost:8000/docs>

---

## 6. How to demonstrate (customer script)

### 6.1 The headline demo — role-based redaction (genuinely live)

**URL:** <http://localhost:5173/governance/demo/privacy>
**Login bypass for local demo:** on the governance sign-in page, **double-click** the
"Sign in" nav link → enter the code **`leavemealone`** → you're in.

Then, in the **"Request patient details as an AI agent"** panel:

1. It auto-loads a sample patient with full PII (incl. insurance ID).
2. **Start on "Scheduling Agent"** (`svc-careatlas-agent`, no `role_patient_pii`).
   Every PII row shows red **🔒 ████ REDACTED**. Footer: *"8 PII fields withheld… the
   response never contained them."*
3. **Click "Clinical Agent"** (`svc-clinical-agent`, has `role_patient_pii`).
   The same record now reveals name, DOB, email, phone, gender, ethnicity, insurance ID.
   Banner turns green: *"Authorized to read patient PII."*
4. Optional: type a name in the search box → **Request record** to pull any patient live.

**The line to say:** *"The only difference between these two agents is one role.
ServiceNow enforces the rest — the restricted agent's response never even contained the
PII."*

### 6.2 Prove it's not UI trickery (optional, for technical buyers)

Run, from `server/` with `.env` loaded:
```bash
# Restricted agent — PII fields come back ABSENT (stripped by the field ACL)
curl -s -u "svc-careatlas-agent:<PW>" \
  "https://ven04690.service-now.com/api/now/table/u_patient?sysparm_fields=sys_id,u_patient_id,u_first_name,u_email,u_insurance_id&sysparm_limit=1"
# → returns sys_id + u_patient_id only; u_first_name/u_email/u_insurance_id are gone.
```

### 6.3 The dashboard posture panel

**URL:** <http://localhost:5173/governance> → **"Data Privacy & PII Protection"** panel.
Shows live: PII ACL **Enforced (8/8)**, the agent **deny-probe PASS**, **100% anonymized**
(17/17 decision-log rows), and the active-filter/pattern counts.

### 6.4 The anonymized audit log (Wall 3)

**URL:** <http://localhost:5173/governance/llm02-audit> — real rows from
`u_ai_action_audit_log`; and the dashboard's audit board reads `u_ai_decision_log`, which
is keyed only on `u_patient_id_anon` (no raw patient identifier is stored).

---

## 7. Wall 2 — Gen AI PII filter: configured, not yet invoked

**What is true:** the filter record **CareAtlas PII Output Guard** exists, is `active`,
and has 5 PII sample phrases. The dashboard's "Redaction: ON / 1 PII filter active"
reflects exactly this — *the control exists and is active*.

**What is NOT yet true:** nothing in the CareAtlas request flow passes agent output
*through* this filter at runtime. A Gen AI content filter only fires when it is **bound
into a Now Assist / agent output pipeline** that evaluates generated text against it. That
binding is **not** configured, so no live text is currently being scrubbed by it.

### Where to see the filter in ServiceNow

| What | Where |
|---|---|
| The filter record | `sys_gen_ai_filter.list` → open **CareAtlas PII Output Guard** (`sys_id 06c949483bb9c7105551369693e45a52`). |
| Its sample phrases | On that record → **Samples** related list (`sys_gen_ai_filter_sample`), 5 rows. |
| Where filters are *managed* | **Now Assist Admin / AI Control Tower → Guardrails / Content filters** (exact menu depends on entitlement). |

> **To honestly claim Wall 2 is "applied,"** one of these must be done first:
> 1. Bind this filter into a Now Assist skill/agent output guardrail so it evaluates
>    generated text, **or**
> 2. Call ServiceNow's filter-evaluation API from the backend with candidate text and
>    surface the real verdict in the UI.
> Until then, present Wall 2 as *"the platform output-guardrail control, configured and
> active"* — not as live runtime redaction.

**Also note:** the *other* box on the privacy page (**"PII leak attempt → redacted"**,
tagged "Demo") is **client-side regex in the browser** — illustrative only, no ServiceNow
and no LLM involved.

---

## 8. What is genuinely live vs. illustrative (summary)

| Item | Genuinely enforced by ServiceNow? |
|---|---|
| Role-toggle redaction (Scheduling vs Clinical agent) | ✅ **Yes — field-level ACL** |
| Dashboard privacy posture + agent deny-probe | ✅ **Yes — live reads/probe** |
| Anonymized decision/audit log | ✅ **Yes** |
| Gen AI PII filter | ⚠️ **Record real & active, not invoked at runtime** |
| "PII leak → redacted" box | ❌ **Client-side regex (illustrative)** |

---

## 9. Open follow-ups for full UC1 completion

1. **Make Wall 2 real:** bind **CareAtlas PII Output Guard** into a live agent output
   pipeline, or add a backend call to a filter-evaluation API and surface the verdict.
2. **Optional:** give the restricted agent a table-read role on more agent-facing tables
   to broaden the least-privilege story into UC2 (Excessive Agency).
3. **Confirm entitlements** for the Now Assist guardrail runtime before claiming live
   output redaction to a customer.
```
