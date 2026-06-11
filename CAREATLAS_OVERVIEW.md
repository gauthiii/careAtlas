# CareAtlas — Project Overview Deck

---

## 1. Basic Idea

CareAtlas is a healthcare management platform that connects patients, clinical staff, and AI governance officers inside a single web application. It demonstrates how a real hospital could safely adopt AI agents by grounding every piece of AI decision-making in a ServiceNow AI Control Tower — a governed, auditable registry of all agents operating in the system.

The app is a three-portal SPA backed by a FastAPI service. The frontend never touches ServiceNow directly; every call passes through the backend, which holds all credentials and enforces CORS. This architecture means the browser never sees a service account secret, an OAuth client credential, or a raw ServiceNow response that has not been sanitised.

```
Browser (React / Vite)
        │  fetch /api/*
        ▼
  Vite dev proxy ──► FastAPI backend (port 8000) ──► ServiceNow AI Control Tower
   (port 5173)            (server/)                   (ven04690.service-now.com)
```

---

## 2. Who This App Benefits

| Persona | What CareAtlas does for them |
|---|---|
| **Patient** | Self-service portal — register, sign in with MFA, book appointments via an AI-assisted booking wizard, view medical history, active medications, and clinic notifications |
| **Clinician / Doctor** | Daily run sheet — see today's appointments, receive AI governance alerts about flagged scheduling or medication interactions, write clinical notes, manage availability |
| **Admin / Receptionist** | Master scheduling and intake queue — approve patient registrations, manage open cases, search across all appointments, act on room status |
| **AI Governance Officer** | Control Tower evidence board — live AI agent inventory from ServiceNow, shadow AI detection, fairness monitoring, prompt injection alerts, ACL verification, end-to-end governance workflow visualisation |

---

## 3. Portals

CareAtlas is divided into three completely isolated portals, each with its own authentication context, route-level guards, and role blockers. A user signed in to one portal is actively blocked from accessing the other two.

### 3.1 Patient Portal (`/patient/*`)
The consumer-facing portal. Self-registration, MFA login, appointment booking with an AI assistant, profile management, appointment history, medications, and clinic messages.

### 3.2 Staff / Clinician Portal (`/staff/*`)
Two views sit inside this portal:
- **Doctor view** — clinical run sheet, governance alerts, pending tasks, quick notes.
- **Admin view** — master schedule, patient registration approvals, open service cases, room status.

### 3.3 AI Governance Portal (`/governance/*`)
The operations and compliance portal. Connects live to the ServiceNow AI Control Tower to surface agent inventory, shadow AI detections, scheduling fairness data, prompt injection events, access violations, and a full Action Fabric audit log.

---

## 4. Screens

### Patient Portal Screens
| Screen | Route | Description |
|---|---|---|
| Landing | `/patient/home` | Public marketing landing page |
| Registration | `/patient/register` | Multi-section patient sign-up with HIBP pwned-password check and dual registration into ServiceNow `u_patient` and AWS Cognito |
| Email Verification | `/patient/verify-email` | OTP code confirmation after Cognito sign-up |
| Sign In | `/patient/sign-in` | Username/password login with TOTP MFA challenge |
| Dashboard | `/patient/dashboard` | KPIs (next appointment, visits, medications, profile status), upcoming appointment card, history, quick actions, notifications |
| Book Appointment | `/patient/book` | 3-step wizard: (1) reason for visit + insurance + accessibility, (2) doctor weekly calendar from live ServiceNow data, (3) review and confirm. Floating AI assistant backed by the Book Appointment ServiceNow agent |
| Profile | `/patient/profile` | View and edit personal, medical, and emergency contact details |
| Contact | `/patient/contact` | Clinic contact form |

### Staff Portal Screens
| Screen | Route | Description |
|---|---|---|
| Sign In | `/staff/sign-in` | Clinician login (same Cognito flow as patients, separate storage key) |
| Doctor Dashboard | `/staff/doctor` | Today's run sheet, 7-day calendar, availability toggles, governance alerts, pending tasks, quick notes |
| Admin Dashboard | `/staff/admin` | KPI strip, appointment table, quick actions (manual booking, cancel, check-in, reminders), pending registration approvals, unresolved contact cases, activity log, room grid |
| Patient Record | `/staff/patient/:id` | Individual patient detail view |
| Availability | `/staff/availability` | Weekly availability management |

### AI Governance Portal Screens
| Screen | Route | Description |
|---|---|---|
| Sign In | `/governance/sign-in` | Governance officer login |
| Control Tower Dashboard | `/governance` | Evidence board — KPI strip (registered agents, shadow AI, prompt injection, access violations, fairness skew), agent inventory table, fairness bar chart, prompt injection timeline, shadow AI alerts, access violation log, agent risk scorecard, Action Fabric audit log |
| AI Agents | `/governance/ai-agents` | Live agent cards pulled from ServiceNow `sn_aia_agent` table, expandable to show role, proficiency, instructions, and metadata. Each card has a Chat button that opens a live A2A chat drawer. End-to-End Workflow modal animates the full shadow-AI governance lifecycle. |
| ACL / Non-Human Identities | `/governance/acl` | Cards for every service-account agent with their permissions, ACL rules, and group membership. "Test ACL" button fires a live read-only probe against ServiceNow and displays pass/fail with a terminal-style output modal. |
| Demo | `/governance/demo` | Launchpad cards that open the ServiceNow instance, AI Agent Studio, AI Control Tower, sys_user list, roles, groups, and ACL rules directly in a new tab |

---

## 5. Authentication

All three portals share the same underlying AWS Cognito-flavoured authentication backend, but use isolated storage keys and React contexts so sessions never bleed across portals.

### Flow
```
Login form
  │  POST /api/aws/login
  ▼
AWS Cognito (via boto3 backend)
  │  AUTH_SUCCESS → access_token + id_token + refresh_token
  │  MFA_SETUP_REQUIRED → session token, QR code flow
  │  MFA_REQUIRED → TOTP code challenge
  ▼
Backend validates token POST /api/aws/token/validate
  │  returns username + attributes
  ▼
Frontend stores tokens in localStorage
  (careatlas.patientAuth / careatlas.clinicianAuth / careatlas.governanceAuth)
```

### Auth Features
- **MFA** — TOTP MFA setup via QR code (generated with `qrcode` + `Pillow` on the backend), and TOTP verification on every subsequent login.
- **New password challenge** — first-login forced password reset via Cognito challenge.
- **Token hydration** — on page load the stored `access_token` is re-validated against `/api/aws/token/validate`. If the token is expired or invalid the session is cleared and the user is redirected to sign-in.
- **Pwned password check** — registration submits the candidate password to the HaveIBeenPwned k-anonymity API via the backend's `POST /api/passwords/pwned-check` endpoint before allowing signup.
- **Role blockers** — each portal route is wrapped in `GovernanceRoleBlocker`, `PatientRoleBlocker`, or `ClinicianRoleBlocker`. If a session for the wrong portal is active, the user sees an "access only" error page with a logout prompt.

### Microsoft Entra Support
The backend also implements `POST /api/auth/entra/*` endpoints using MSAL for Microsoft Entra External ID Native Auth — covering signup, login, MFA challenge/verification, strong-auth registration, and token refresh. This provides an alternative enterprise identity pathway alongside the Cognito flow.

### Clinician (Staff) Auth — ServiceNow Validation
Staff credentials are additionally validated directly against the ServiceNow `sys_user` table via `POST /api/auth/validate`. The backend performs a Basic Auth GET against the SNOW REST API and checks whether the matching active user record is returned.

---

## 6. ServiceNow Integrations

All ServiceNow communication originates from the FastAPI backend. The frontend calls only `/api/*`. The backend maps these to SNOW REST Table API, OAuth, and A2A calls.

| Backend endpoint | ServiceNow call | Purpose |
|---|---|---|
| `GET /api/agents` | `GET /api/now/table/sn_aia_agent` (Basic Auth) | Pull AI agent inventory from the AI Control Tower |
| `POST /api/agents/execute` | `POST /api/sn_aia/a2a/v2/agent/id/{sys_id}` (Bearer OAuth) | Execute a ServiceNow AI agent via A2A |
| `GET /api/agents/execute/{request_id}` | In-memory callback store | Poll for async A2A callback result |
| `POST /api/a2a/callback/{agent_sys_id}` | Inbound from ServiceNow | Receive async A2A push-notification callback |
| `POST /api/auth/validate` | `GET /api/now/table/sys_user` (Basic Auth as the logging-in user) | Validate staff credentials |
| `POST /api/patients/register` | `POST /api/now/table/u_patient` (Basic Auth, service account) | Create patient registration record |
| `GET /api/patients/booking/availability` | `GET /api/now/table/u_doctor` + `u_appointment` (Basic Auth) | Fetch doctors and bookings for the appointment calendar |
| `POST /api/acl/test` | `GET /api/now/table/{table}` (Basic Auth as the service account under test) | Live ACL probe — reads as the NHI service account to verify allowed/denied access |

### ServiceNow Tables Used
| Table | Purpose |
|---|---|
| `sn_aia_agent` | AI agent registry (AI Control Tower) |
| `sys_user` | Staff credential validation |
| `u_patient` | Patient records |
| `u_doctor` | Doctor/clinician records |
| `u_appointment` | Appointment slot records |
| `u_ai_decision_log` | AI scheduling decision audit entries |
| `sn_aia_execution_plan` | A2A agent execution plans (inspected in SNOW UI) |
| `sn_aia_external_agent_callback_registry` | Callback URL registry per agent |

---

## 7. Pipeline — Agent Execution

### Synchronous A2A (default)
```
POST /api/agents/execute
  │  Backend fetches OAuth Bearer token (cached, refreshed 60 s early)
  │  POST /api/sn_aia/a2a/v2/agent/id/{sys_id}
  │    {"jsonrpc":"2.0","method":"message/send","params":{"configuration":{"blocking":true},...}}
  │  ServiceNow executes agent, returns text output in same HTTP response
  │  Backend extracts text from result.status.message.parts[].text | result.artifacts
  └► 200 {"request_id":…,"output":"<agent reply>","context_id":…,"task_id":…}
```

### Asynchronous A2A (fallback / push-notification mode)
```
POST /api/agents/execute
  │  Backend sends payload with pushNotificationConfig pointing to
  │    https://careatlas.onrender.com/api/a2a/callback/{agent_sys_id}
  │  ServiceNow returns immediately with status=pending / accepted
  │  Backend creates in-memory pending execution record → returns {status:"pending"}
  │
ServiceNow (async)
  │  Executes agent
  │  POST https://careatlas.onrender.com/api/a2a/callback/{agent_sys_id}
  │    Authorization: Bearer <A2A_CALLBACK_TOKEN>
  │  Backend validates token, stores result, marks execution completed
  │
Frontend polls (every 2 s, up to 60 s)
  GET /api/agents/execute/{request_id}
    └► 200 {"status":"completed","output":"<agent reply>",...}
```

### Multi-turn Conversations
- Each chat turn passes the returned `contextId` and `taskId` back on the next `message/send` call.
- The agent can maintain conversation context across turns via these identifiers.
- The system context string (e.g., the logged-in patient's name and current page) is prepended to every user message before dispatch.

---

## 8. Tech Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 6 | Type safety |
| Vite | 8 | Build tool and dev-proxy |
| Tailwind CSS | 4 | Utility-first styling |
| React Router | 7 | Client-side routing |
| Recharts | 3 | Data visualisation charts |
| Lucide React | 1.8 | Icon set |

### Backend
| Technology | Version | Role |
|---|---|---|
| Python | 3.12 | Runtime |
| FastAPI | 0.136 | REST API framework |
| Uvicorn | 0.49 | ASGI server |
| Pydantic v2 | 2.13 | Request/response models and settings |
| httpx | 0.28 | Async HTTP client for ServiceNow and HIBP calls |
| boto3 | 1.40 | AWS SDK — Cognito authentication |
| MSAL | 1.37 | Microsoft Entra External ID Native Auth |
| PyJWT | 2.13 | JWT validation |
| qrcode + Pillow | 8.2 / 12.2 | TOTP MFA QR code generation |
| python-dotenv | 1.2 | Environment variable loading |

### Infrastructure
- **Deployment** — Backend on Render (public HTTPS origin for SNOW callbacks). Frontend as static build.
- **Dev proxy** — Vite proxies `/api` to the local FastAPI backend (port 8000) so the frontend runs on `localhost:5173` without CORS issues.

---

## 9. AI Agents

### Agents in ServiceNow AI Control Tower

| Agent | Identity (NHI) | Status | Risk | Purpose |
|---|---|---|---|---|
| Scheduling Ranker | `nhid-schedule-01` | Active | Low | Ranks appointment slots by health condition priority, accessibility, time preference, and physician continuity |
| Identity Verifier | `nhid-verify-02` | Active | Medium | Cross-references patient registration data, assigns identity confidence scores |
| Appointment Summarizer | `nhid-summary-03` | Paused | Medium | Generates post-appointment summaries from clinical notes |
| Legacy Slot Optimizer | Unknown | **Quarantined** | **High** | Legacy agent with unknown identity; caused shadow endpoint calls |

### Agents Called Directly from the CareAtlas Frontend

| sys_id | Where used | Purpose |
|---|---|---|
| `b2cdf70e1bd50f54d7eaea45604bcb0c` | Patient `/book` page | Book Appointment assistant — floating chat widget with patient context injected as system context |
| `90ef57251b1d8b14b72fc9d3604bcbce` | Governance `/ai-agents` chat drawer | Governance-specific agent (also used as the callback registry demo agent) |

### Agent Properties (from `sn_aia_agent`)
Each agent record exposes: `name`, `agent_type` (internal/external), `strategy`, `role`, `description`, `proficiency` (bullet list), `instructions` (numbered steps), and `condition`. CareAtlas renders all of these in expandable agent cards.

---

## 10. How AI Agents Are Communicated

CareAtlas uses the **ServiceNow Zurich Agent-to-Agent (A2A) Protocol** — an implementation of the open A2A specification over JSON-RPC 2.0.

### Authentication
```
POST https://{instance}.service-now.com/oauth_token.do
  grant_type=client_credentials
  client_id={SNOW_A2A_CLIENT_ID}
  client_secret={SNOW_A2A_CLIENT_SECRET}
  [scope=a2aauthscope]          ← if Scope Restriction is "Securely scoped"

→ {"access_token":"…","expires_in":1800}
```
The backend caches the token in memory and proactively refreshes it 60 seconds before expiry (`SNOW_A2A_TOKEN_SKEW_SECONDS`).

### Message Dispatch
```json
POST /api/sn_aia/a2a/v2/agent/id/{agent_sys_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": "{uuid}",
  "method": "message/send",
  "params": {
    "configuration": {
      "blocking": true          // synchronous
    },
    "message": {
      "kind": "message",
      "role": "user",
      "messageId": "{uuid}",
      "contextId": "…",        // omitted on first turn
      "taskId": "…",           // omitted on first turn
      "parts": [{"kind": "text", "text": "{system_context}\n\nUser message: {input}"}]
    },
    "metadata": {}
  }
}
```

### System Context Injection
Before every message is dispatched, the backend prepends an optional `system_context` string (supplied by the calling page) to the user's input. On the Book Appointment page this includes the patient's full name and email so the agent can personalise its reply without the user having to re-identify themselves.

### Response Parsing
The backend extracts the text reply from whichever A2A response shape ServiceNow uses:
- `result.status.message.parts[].text`
- `result.message.parts[].text`
- `result.artifacts[].parts[].text`
- `result` as a plain string

### Async Push-Notification Mode
For asynchronous agent runs (when `blocking:true` times out or is not supported), the backend sends a `pushNotificationConfig` in the configuration block. ServiceNow POSTs the result to `https://careatlas.onrender.com/api/a2a/callback/{agent_sys_id}` with a `Bearer` token for verification. The frontend polls every 2 seconds for up to 60 seconds.

---

## 11. ACLs — Non-Human Identities

Every AI agent operates under a dedicated **non-human identity (NHI)** — a ServiceNow service account that is:
- **Web-service only** — cannot log in interactively.
- **Active and unlocked** — `Password needs reset` is never checked.
- Granted permissions **exclusively via group membership and ACL rules** — the account holds no direct roles.
- Scoped to the **minimum set of tables and fields** needed for its function.

### NHI Service Accounts

| Service Account | Group | Permissions | Explicitly Denied |
|---|---|---|---|
| `svc-identity-verification-agent` | `grp-identity-agent` | Read all `u_patient` fields; write `u_registration_status`, `u_confidence_score` | `u_appointment` (full table) |
| `svc-scheduling-agent` | `grp-scheduling-agent` | Read 5 non-PII patient fields (`patient_id`, `health_condition`, `accessibility`, `time_preference`, `account_status`); insert into `u_ai_decision_log` | 7 PII fields: `ethnicity`, `gender`, `first_name`, `last_name`, `email`, `phone`, `dob` |
| `svc-reminder-agent` | `grp-reminder-agent` | Read `u_appointment` (full table, read-only) | `u_patient` (full table) |
| `svc-notes-agent` | `grp-notes-agent` | Read completed `u_appointment` records; write `u_patient.u_patient_summary` only | All other patient PII fields |
| `svc-triage-agent` | `grp-triage-agent` | Read 2 patient fields only: `u_reason_text`, `u_health_condition` | 5 PII fields: `first_name`, `last_name`, `email`, `phone`, `dob` |

### Live ACL Testing
The Governance ACL page lets a governance officer click **Test ACL** on any NHI card. The backend calls `POST /api/acl/test`, which:
1. Fires two read-only GET probes against ServiceNow — one for an expected-allowed table/field set, one for an expected-denied set — authenticating as the service account (`username` = NHI user ID, `password` = `SNOW_PASSWORD`).
2. For PII deny probes, inspects whether the denied fields are absent from the returned record (field-level ACL verification).
3. Returns `passed / failed / inconclusive / error` per check, displayed in the UI with a terminal-style modal showing the raw API request and response.

No records are returned to the browser — only pass/fail metadata.

---

## 12. Why AI Governance and Security

Healthcare is one of the highest-risk domains for AI deployment:

- **PHI (Protected Health Information)** — patient data is regulated under HIPAA and GDPR. An AI agent reading more fields than it needs is a compliance breach.
- **Fairness obligations** — AI scheduling decisions must not disadvantage any ethnic or demographic group. CareAtlas shows the fairness monitor catching a statistically significant over-allocation to the Asian cohort.
- **Prompt injection** — malicious inputs to AI agents can exfiltrate data or alter decisions. The governance dashboard tracks blocked and flagged injection attempts in real time.
- **Shadow AI** — clinical teams may connect unapproved AI endpoints (e.g. `legacy-slot-ai.local/api`) that bypass governance entirely. These must be detected and quarantined before they can affect patient care.
- **Auditability** — every AI decision that affects a patient (slot selection, identity verification, triage priority) must be recorded in a tamper-evident audit log that regulators and clinicians can inspect.
- **Least-privilege identity** — AI agents should never be able to read or write more data than their specific task requires. CareAtlas enforces this through field-level ACL deny rules verified live against ServiceNow.

The governance portal exists to make all of this visible and testable in real time, closing the gap between what the governance policy says and what the deployed agents are actually doing.

---

## 13. AI Control Tower and Its Managed Assets

### ServiceNow AI Control Tower
The AI Control Tower is the central governance registry inside the ServiceNow instance (`ven04690.service-now.com`). CareAtlas integrates with it at two levels:

**1. Agent Inventory (`sn_aia_agent` table)**
- Stores every AI agent: name, type (internal/external), strategy, role, description, proficiency, instructions, condition.
- CareAtlas reads this via `GET /api/now/table/sn_aia_agent` (Basic Auth, filtered to agents created since June 2, 2026).
- Displayed in the `/governance/ai-agents` page as expandable cards.

**2. Agent Execution (A2A endpoint)**
- `POST /api/sn_aia/a2a/v2/agent/id/{sys_id}` — the A2A execution surface.
- Requires an OAuth inbound application in ServiceNow's Application Registry with client credentials grant enabled.
- The OAuth Application User on the registry record determines which identity the agent runs as.

**3. External Agent Callback Registry (`sn_aia_external_agent_callback_registry`)**
- One record per agent for async callbacks.
- URL pattern: `https://careatlas.onrender.com/api/a2a/callback/{agent_sys_id}`
- ServiceNow verifies the URL before marking the record active.
- CareAtlas validates incoming callbacks with `compare_digest` against `A2A_CALLBACK_TOKEN`.

### Managed Asset Lifecycle
The Shadow AI Workflow Modal (accessible from the Governance AI Agents page) visualises the full 8-phase lifecycle that every AI asset must pass through:

| Phase | Stage | Actor | What happens |
|---|---|---|---|
| 1. Sync & Detect | Unmanaged | System / AI Steward | Discovery and cloud sync surface the shadow AI into the AI Asset Inventory |
| 2. Intake & Review | Unmanaged | AI Governance Steward | Steward reviews the entry, adds business details, evaluates ownership |
| 3. Rule Application | Unmanaged → Managed | System / Rules Engine | Automation rules assign metadata or auto-promote the asset to Managed |
| 4. Promotion | Managed · Intake | AI Governance Steward | Steward promotes the asset to Managed, triggering the governance lifecycle |
| 5. Assess & Classify | Managed · Assess | AI Risk & Compliance Manager | Formal risk and impact assessments; risk classification is computed |
| 6. Build / Evaluate | Managed · Build | AI Asset Owner / Dev | Guardrails, prompt-injection tests, and accuracy evaluation runs |
| 7. Approve & Deploy | Deployed | Governance Board / Owner | Final approvals complete; asset is sanctioned and marked Deployed |
| 8. Monitor & Track | Deployed · Monitoring | AI Steward / Owner | Guardrail logs and AI Case exceptions tracked continuously |

### Control Tower Evidence Board (Governance Dashboard)
The governance dashboard surfaces the Control Tower's live data into five KPI tiles:

| KPI | Current value | Meaning |
|---|---|---|
| Registered agents | 4 | 3 active, 1 quarantined |
| Shadow AI detections | 1 | Unapproved endpoint `legacy-slot-ai.local/api` first seen today 09:08 |
| Prompt injection alerts | 4 | 2 blocked (confidence ≥ 95%), 2 flagged today |
| Access violations | 2 | PHI scope guard hit by Scheduling Ranker; least-privilege violation by Appointment Summarizer |
| Fairness skew | High | Asian cohort over-allocated (p < 0.05) |

Supporting panels:
- **Agent Inventory** — live table with per-agent status, identity, and risk level.
- **Scheduling Fairness Monitor** — bar chart of slot allocation by ethnic group vs. expected proportion.
- **Prompt Injection Alerts** — session-level blocked/flagged log with confidence scores.
- **Shadow AI Detection** — alert card for the active unapproved endpoint plus a resolved-detection history.
- **Expected vs. Actual Allocation** — percentage deviation chart per demographic group.
- **Agent Access Violations** — timestamped log of which agent tried to reach which resource and which policy blocked it.
- **Agent Risk Scorecard** — H/M/L risk ranking with the reason for each rating.
- **Action Fabric Audit Log** — every AI-driven action with subject, agent, decision trail, and outcome.

---

## 14. Architecture Diagram (Summary)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Browser — React 19 / TypeScript / Tailwind / Vite                         │
│                                                                              │
│  Patient Portal      Staff Portal        AI Governance Portal               │
│  /patient/*          /staff/*            /governance/*                       │
│                                                                              │
│  PatientAuthContext  ClinicianAuthCtx    GovernanceAuthContext               │
│  (careatlas.patientAuth)  (clinicianAuth)   (governanceAuth)                │
│                                                                              │
│  AiAssistantWidget (floating, /patient/book only)                           │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │  fetch /api/*
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  FastAPI backend  (Python 3.12 / uvicorn / Pydantic v2 / httpx)            │
│                                                                              │
│  /api/agents          → SNOW sn_aia_agent table (Basic Auth)                │
│  /api/agents/execute  → SNOW A2A /api/sn_aia/a2a/v2/... (Bearer OAuth)     │
│  /api/a2a/callback/*  ← inbound push-notification callback from SNOW       │
│  /api/auth/validate   → SNOW sys_user table (Basic Auth as login user)     │
│  /api/patients/*      → SNOW u_patient, u_doctor, u_appointment tables     │
│  /api/acl/test        → SNOW tables (Basic Auth as NHI service account)    │
│  /api/aws/*           → AWS Cognito (via boto3)                             │
│  /api/auth/entra/*    → Microsoft Entra External ID (via MSAL)             │
│  /api/passwords/*     → HaveIBeenPwned k-anonymity API                     │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │
              ┌─────────────────┼───────────────────┐
              ▼                 ▼                   ▼
     ServiceNow             AWS Cognito         HaveIBeenPwned
  AI Control Tower        (MFA / JWT)           (pwned check)
  ven04690.service-now.com
```

---

*Document auto-generated from source on 2026-06-10.*
