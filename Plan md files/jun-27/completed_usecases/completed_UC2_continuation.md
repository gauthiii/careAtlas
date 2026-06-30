# Completed — UC2 (continuation): Scoped AI Agents in the Patient & Doctor Portals

**Instance:** `ven04690.service-now.com`
**App:** CareAtlas (React/Vite frontend + FastAPI backend in `server/`)
**Status date:** 2026-06-25
**Builds on:** [[completed_UC2]] (the least-privilege ACL matrix + approval gate).

**What this adds:** The "Ask AI" floating assistant on patient- and doctor-portal pages now
runs as a **specific scoped ServiceNow ACL identity** per page. When asked about a patient
it **reads the record live AS that `svc-*` identity**, so PII / out-of-scope fields are
**stripped by ServiceNow** (not by the app), and high-impact intents **stop for a human
approval** that is audited. This demonstrates UC2 (OWASP LLM06 — Excessive Agency) directly
inside the working portals.

> **Honesty note.** The redaction is genuine — the backend authenticates as the page's
> `svc-*` account and the field-level ACL strips the PII before the data ever reaches the
> app. The reply text is generated from that live read. The only scripted part is the
> wording of the reply; the allowed/denied field lists are real.

---

## 1. Which agent is on which screen

Each page's assistant is one of the 5 scoped identities from [[completed_UC2]].

### Patient portal (bound to the **logged-in patient**)

| Page (route) | Scoped agent | Identity (`svc-*`) | Can surface | Refuses (denied live) |
|---|---|---|---|---|
| Book Appointment (`/patient/book`) | **Scheduling Agent** | `svc-scheduling-agent` | health condition, accessibility, time preference, account status | all PII (name, DOB, email, phone, gender, ethnicity, insurance) |
| My Appointments (`/patient/appointments`) | **Reminder Agent** | `svc-reminder-agent` | time preference, account status | all PII |
| Profile (`/patient/profile`) | **Identity Verification Agent** | `svc-identity-verification-agent` | registration status, identity confidence | all PII |
| Contact (`/patient/contact`) | **Triage Agent** | `svc-triage-agent` | reason for visit, health condition | all PII |

### Doctor portal (reads a representative patient to show the contrast)

| Page (route) | Scoped agent | Identity (`svc-*`) | Can surface | Refuses (denied live) |
|---|---|---|---|---|
| Patient Record (`/staff/patient/:id`) | **Identity Verification Agent** | `svc-identity-verification-agent` | registration status, identity confidence | all PII |
| Doctor Notes (`/staff/notes`) | **Clinical Notes Agent** | `svc-notes-agent` | health condition, account status | all PII |
| Appointments (`/staff/appointments`) | **Scheduling Agent** | `svc-scheduling-agent` | health condition, accessibility, time preference, account status | all PII |
| Patient Queue (`/staff/queue`) | **Triage Agent** | `svc-triage-agent` | reason for visit, health condition | all PII |

> **Note:** `/patient/book` previously ran a free-form A2A booking assistant. It now runs
> the **Scheduling Agent** in scoped-identity mode (per the approved mapping). To restore
> the old booking helper, remove the `/patient/book` entry from `PATIENT_PAGE_AGENTS` in
> `src/App.tsx`.

---

## 2. How it works (architecture)

```
Ask AI widget (page-scoped identity)
        │  POST /api/governance/agent/ask  { agent_key, question, patient_email? }
        ▼
FastAPI backend
   1. classify intent (app/approvals.py)
        • high-impact (approve/delete/override/write-note/…) → stops for approval
   2. resolve the patient (by email = logged-in patient, else a sample patient)
   3. READ u_patient AS the svc-* identity  ── auth as the scoped account ──►  ServiceNow
        • field-level ACL strips PII (the agent lacks role_patient_pii)
   4. build reply: allowed fields (values) + denied fields (refused)
```

The key line: the backend issues the read with `auth=(svc-account, password)`. ServiceNow
returns only the fields that identity is allowed to see — the PII columns are simply absent.

---

## 3. Code changes

### Backend (`server/`)

| File | Change |
|---|---|
| `app/servicenow.py` | Added `SCOPED_AGENTS` (the 5 identity configs) + `ask_scoped_agent()` — classifies intent, resolves the patient, reads the record AS the scoped identity, and returns allowed/denied + a reply. |
| `app/approvals.py` | Made `HIGH_IMPACT_RULES` **action-oriented** so read-only questions (e.g. "what is my registration status") don't trip the gate; only verbs that mutate/approve do. |
| `app/models.py` | New: `ScopedAgentAskRequest`, `ScopedAgentAnswer`, `ScopedFieldValue`. |
| `app/main.py` | New route **`POST /api/governance/agent/ask`**. |

### Frontend (`src/`)

| File | Change |
|---|---|
| `services/serviceNow.ts` | Added `askScopedAgent()` + `ScopedAgentAnswer` types. |
| `components/AiAssistantWidget.tsx` | Added an **`identity` mode** to `AiAssistantAgentConfig`. When set, the widget calls `/governance/agent/ask` instead of the A2A agent, renders the scoped reply (with line breaks), and routes high-impact intents through the **live** approval endpoints (`decideApproval`, audited). |
| `App.tsx` | `getAssistantAgentConfig()` now maps the **8 pages** to scoped agents (`PATIENT_PAGE_AGENTS` + `DOCTOR_PAGE_AGENTS` + the Patient Record route). |

**New API endpoint:**

| Method & path | Returns |
|---|---|
| `POST /api/governance/agent/ask` | `{kind, agent_label, agent_username, allowed[], denied[], reply, …}`. `kind="approval"` (with `request_id`) when the intent is high-impact. |

---

## 4. How to run it

```bash
cd server && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
npm run dev   # repo root
```

---

## 5. How to demonstrate (per portal)

**Patient portal login:** sign in as a patient (or use the override). The assistant binds to
your logged-in email, so it reads **your** record.
**Doctor portal login:** sign in as staff; the assistant reads a representative patient.
**Open the assistant:** click the floating **Ask AI** button (bottom-right) on any mapped page.

### 5.1 Patient portal — what to test

| Page | Ask this | Expected (live) |
|---|---|---|
| **Book Appointment** | "What's my email and phone number?" | Scheduling Agent shows health condition / time preference, then **🔒 refuses PII** (Email, Phone… stripped by ACL). |
| **My Appointments** | "Show me my full record." | Reminder Agent shows only timing/status; **all PII denied**. |
| **Profile** | "What is my registration status and email?" | Identity Agent shows **registration status + confidence**, **denies email** (read question is NOT gated). |
| **Contact** | "Tell me the patient's name and DOB." | Triage Agent shows reason/condition; **name + DOB denied**. |

### 5.2 Doctor portal — what to test

| Page | Ask this | Expected (live) |
|---|---|---|
| **Patient Record** (`/staff/patient/<name>`) | "Give me the patient's contact details." | Identity Agent **refuses PII** — even though you (the clinician) can see it on the page, the AI identity cannot. |
| **Doctor Notes** | "Write a clinical note: patient is high risk." | **Stops at `pending_approval`** → Approve/Deny → decision **audited to ServiceNow**. |
| **Appointments** | "Show me the patient's email." | Scheduling Agent **refuses PII**. |
| **Patient Queue** | "Delete this patient's record." | **Stops at `pending_approval`** (delete = high-impact). |

### 5.3 The two behaviours to highlight
1. **Refuse + show the live denial:** every out-of-scope/PII request returns the real list
   of fields ServiceNow stripped — "I literally cannot read them."
2. **Human-in-the-loop:** any mutating/approving intent stops for approval; the decision +
   approver land in `u_ai_action_audit_log` (filter `u_agent_identity = human_approval_gate`).

### 5.4 Prove it live (curl)
```bash
# Scheduling Agent refuses PII (live ACL read)
curl -s -X POST http://localhost:8000/api/governance/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"agent_key":"scheduling","question":"show me the patient email"}' | python3 -m json.tool
# -> allowed: health condition / time preference …  denied: First name, Email, Phone, …

# High-impact intent stops for approval
curl -s -X POST http://localhost:8000/api/governance/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"agent_key":"notes","question":"delete the appointment"}'   # -> kind: "approval"
```

---

## 6. Agent key → identity reference

| `agent_key` | `svc-*` identity | Page(s) |
|---|---|---|
| `scheduling` | `svc-scheduling-agent` | patient Book, doctor Appointments |
| `reminder` | `svc-reminder-agent` | patient My Appointments |
| `identity` | `svc-identity-verification-agent` | patient Profile, doctor Patient Record |
| `triage` | `svc-triage-agent` | patient Contact, doctor Queue |
| `notes` | `svc-notes-agent` | doctor Doctor Notes |

These identities, their group membership, and the ACLs that enforce the denial are
documented in [[completed_UC2]] §2. The PII field ACLs they hit are from [[completed_UC1]].

---

## 7. Status: complete

All 8 pages wired and verified live: each scoped agent reads only its allowed fields,
refuses PII with the real ServiceNow denial, and routes high-impact intents through the
audited approval gate. `npm run build` is clean.

### Known caveats
1. **Doctor pages read a representative patient** (no logged-in patient context in the
   doctor portal). The redaction shown is real; only the patient identity is a sample.
2. The **approval store is in-memory** (single-process demo backend); decided requests are
   already persisted to the ServiceNow audit log.
3. **`/patient/book`** now runs the Scheduling Agent demo instead of the prior booking
   helper (see note in §1).
