# CareAtlas — Master README, Audit & Demo Playbook

**Last updated: 2026-06-26** · Single source of truth for the whole project.

> **What's new (2026-06-26):** UC10 — **Consent & Purpose-of-Use Enforcement** added (live runtime ConsentGate that blocks an agent when a patient hasn't consented to its purpose, plus a dedicated page at `/governance/demo/consent` with the workflow modal, consent panel, and a live incidents table). Merged the `hema` (UI) and `shesh` (consent) branches. All 6 app-driven use cases (UC1/2/3/5/6/8) plus UC10 verified working live on this date.

> This document explains *everything* that has been built, how it works, how to run it,
> what lives on the React side, what lives on the ServiceNow side, and the exact status
> of every governance use case — verified against the live instance and the code on
> **2026-06-26**. It is written so that someone brand new to the project can read it
> top‑to‑bottom and understand and run the whole thing.

---

## 0. Talk to me like I'm new here — what is CareAtlas?

CareAtlas is a **pretend AI‑native hospital** used to *sell and prove AI governance on
ServiceNow*. The hospital is run with the help of **AI agents** (robots): one verifies who
you are, one books appointments, one reads symptoms (triage), one writes clinical notes,
one sends reminders.

Robots are useful but scary: *Who let them loose? Are they legal? Can they leak my
secrets? Are they fair? Can we stop them?* CareAtlas answers each worry by pointing at a
**real, live record in ServiceNow** — not a slide.

There are three "front doors" (portals) to the app:

| Portal | Who uses it | What they do |
|---|---|---|
| **Patient portal** | Patients | Register, sign in (with MFA), book/see appointments, edit profile, contact care team |
| **Staff / Clinician portal** | Doctors & admins | See schedules, manage appointments, write clinical notes, approve registrations |
| **Governance portal ("Control Tower")** | AI Governance Officer | Prove every AI agent is visible, regulated, gated, bounded, private, fair, and stoppable |

Behind all three is **one backend** (a Python FastAPI service) that talks to **ServiceNow**
(instance `ven04690.service-now.com`) and to **AWS Cognito** (for login/MFA).

---

## 1. The big picture (architecture)

```
   Browser (React 19 + Vite SPA)
   patient / staff / governance portals
            │  fetch  /api/*
            ▼
   Vite dev server (port 5173)  ──proxy /api──►  FastAPI backend  (server/, port 8000)
                                                      │
                          ┌───────────────────────────┼───────────────────────────┐
                          ▼                            ▼                           ▼
                   ServiceNow REST            AWS Cognito (boto3)        Microsoft Entra (msal)
                   ven04690.service-now.com   email/pw + TOTP MFA        native auth (optional)
                   (AICT + AIRC + GRC tables)
                                                      │
                                            External: HaveIBeenPwned (k-anonymity)
```

- The **frontend never talks to ServiceNow/AWS directly** — it only calls its own `/api`.
  All secrets stay on the backend.
- **Dev:** the Vite dev server proxies `/api` → `http://localhost:8000` (no CORS pain).
- **Prod:** frontend is a static build on **Firebase Hosting**; it calls the backend
  deployed on **Render** (`https://careatlas.onrender.com/api`).

---

## 2. Status snapshot — what exists on the live instance (probed 2026-06-26)

These are **real row counts** returned by `ven04690` today (read‑only `curl` with
`server/.env`, user `interface_gautham`). They are the evidence the demo stands on.

| ServiceNow table | Count (2026‑06‑26) | Used by |
|---|---|---|
| `u_ai_decision_log` | 17 | UC1 — anonymized AI audit log |
| `sys_security_acl` | 78,941 | UC1/UC2 — ACL enforcement layer |
| `sys_user` (`user_name` starts `svc-`) | 11 | UC2 — scoped service accounts (UC2 governs 9 of them) |
| `sn_grc_ai_gov_ai_system` | 111 | UC3/UC4/UC6 — governed AI systems |
| `sn_smart_imp_auto_assessment_action` | 54 | UC3/UC4 — Post Assessment Actions |
| └ FRIA actions `active=true` | **48** | UC3 — **activated 2026‑06‑26 (was 0)** |
| `sn_smart_imp_auto_rule` | 32 | UC4 — automation rules |
| `sn_compliance_control` | 399 | UC4 — control library |
| `sn_compliance_policy` | 87 | UC4 — policy library |
| `sys_gen_ai_filter` | 10 (6 active) | UC1/UC5 — Gen AI content filters |
| `sys_gen_ai_filter_sample` | 269 | UC5 — filter sample phrases |
| `sn_ai_governance_automation_rule` | 4 | UC5 — guardrail → governance event |
| `sn_ai_case_mgmt_ai_case` | **9** | UC5 — AI Cases (demo created these; was 0) |
| `sn_data_discovery_data_pattern` | 39 | UC5 — deterministic output patterns |
| `sn_risk_definition` | 661 | UC6/UC7 — risk statements |
| `sn_grc_metric_m2m_definition_risk_statement` | 21 | UC6 — fairness metric definitions |
| `sys_generative_ai_metric` | 10,327 | UC6 — outcome metrics |
| `sn_model_risk_mgmt_model` | **NOT INSTALLED** (Invalid table) | UC7 — model‑risk app absent (roadmap) |
| `sn_aia_agent` | 160 | UC8 — AI agent inventory |
| `alm_ai_system_digital_asset` | 333 | UC8 — AI asset inventory |
| `sn_mcp_server` / `sn_mcp_server_registry` | 1 / 2 | UC9 — MCP kill‑switch target |
| `u_patient.u_consent_flags` (+ `u_consent_accepted`) | populated | UC10 — per‑patient AI‑purpose consent |
| `sn_si_incident` (`category=consent_purpose_violation`) | 1 (grows as the gate fires) | UC10 — consent‑violation incidents |

**The target AI system for UC3, `Triage Appointment DG1`** (`sn_grc_ai_gov_ai_system`
sys_id `cdf56dc91bd14b14d7eaea45604bcb6e`) is now **classified High‑risk** with 3
closed‑complete assessments (EU AI Act Conformity, AI Impact, **FRIA**), 1 risk result —
the **first AI system on this instance to carry a real platform‑calculated risk tier**.

---

## 3. Tech stack (exact versions)

### Frontend (`/`, `src/`)
- **React** 19.2.4, **React Router DOM** 7.14.2
- **Vite** 8.0.4, **TypeScript** ~6.0.2
- **Tailwind CSS** 4.3.0 (via `@tailwindcss/vite`) — note: Tailwind **v4**, see the gotcha in §16
- **lucide-react** 1.8.0 (icons), **recharts** 3.8.1 (charts)
- **jspdf** 4.2.1 + **html2canvas-pro** 2.0.4 (PDF/screenshot export)
- State: **React Context only** (no Redux/Zustand)

### Backend (`server/`)
- **FastAPI** 0.136.3 on **Uvicorn** 0.49.0 (+ uvloop)
- **Pydantic** 2.13.4 + **pydantic-settings** 2.14.1
- **httpx** 0.28.1 (async ServiceNow client)
- **boto3** 1.40.47 (AWS Cognito), **msal** 1.37.0 (Microsoft Entra), **PyJWT**, **cryptography**
- **qrcode** + **pillow** (MFA QR codes), **python-dotenv**, **email-validator**

---

## 4. Repository layout

```
CareAtlas/
├── README.md                     ← this file (master playbook)
├── package.json                  ← frontend deps + scripts (dev/build/preview)
├── vite.config.ts                ← dev server + /api proxy
├── firebase.json / .firebaserc   ← frontend hosting (Firebase project: task--mission)
├── .env / .env.example / .env.production   ← FRONTEND env (proxy target, API base)
├── index.html
├── dist/                         ← production build output
├── src/                          ← React app (see §7)
│   ├── App.tsx  main.tsx
│   ├── contexts/                 ← 3 auth contexts (patient/clinician/governance)
│   ├── pages/                    ← home, patient, staff, governance, governance/demo
│   ├── components/               ← auth, governance, patient, staff, portal + widgets
│   ├── services/                 ← serviceNow.ts (API client), awsAuth.ts
│   ├── hooks/  data/  lib/  styles.css
├── server/                       ← FastAPI backend (see §8–§10)
│   ├── app/
│   │   ├── main.py               ← all API endpoints + app factory + CORS
│   │   ├── servicenow.py         ← every ServiceNow read/write + ACL probes
│   │   ├── config.py             ← Settings (reads server/.env)
│   │   ├── models.py             ← Pydantic request/response models
│   │   ├── aws_auth.py           ← AWS Cognito router (/api/aws/*)
│   │   ├── a2a_callbacks.py      ← agent execution store + A2A callback parsing
│   │   ├── approvals.py          ← UC2 human-approval gate (in-memory)
│   │   ├── notifications.py      ← u_notification_reminders helpers
│   │   └── pwned_passwords.py    ← HaveIBeenPwned k-anonymity check
│   ├── requirements.txt
│   ├── .env / .env.example       ← BACKEND env (ServiceNow/Cognito/Entra/A2A secrets)
│   ├── tests/                    ← pytest suite (see §14)
│   └── scripts/                  ← UC3 audit scripts, snapshot/backfill utilities
└── Plan md files/                ← the business plan + per-use-case "completed_*" docs
    ├── june26BusinessPlan.md     ← the 9-use-case master plan
    ├── 26junstory.md             ← demo walkthrough script
    ├── completed_UC1.md … completed_UC6.md, UC3-Regulation-EUAIAct-FRIA.md, etc.
```

---

## 5. How to run it (step by step, from zero)

You need **Python 3.11+**, **Node 18+**, and the two `.env` files (ask the project owner —
real secrets live in `server/.env` and are **not** committed).

### 5.1 Backend (FastAPI) — port 8000
```bash
cd CareAtlas/server

# one-time: create a virtualenv and install deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# create server/.env from the template and fill in real values
cp .env.example .env        # then edit .env (see §6)

# run it (auto-reloads on code changes)
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```
Check it's alive: open <http://localhost:8000/api/health> → `{"status":"ok"}`.
Interactive API docs (every endpoint): <http://localhost:8000/docs>.

### 5.2 Frontend (React/Vite) — port 5173
```bash
cd CareAtlas
npm install

# create the dev env file
cp .env.example .env         # default proxies /api -> http://localhost:8000

npm run dev                  # open http://localhost:5173
```

> **Tip:** You can skip running the Python backend locally by pointing
> `VITE_API_PROXY_TARGET` at the deployed backend (`https://careatlas.onrender.com`) in
> `.env`. Then `npm run dev` talks to the live backend.

### 5.3 Build for production
```bash
npm run build        # tsc -b && vite build  -> outputs to dist/
npm run preview      # preview the production build locally
```

---

## 6. Environment variables

Two `.env` files — **frontend** (`CareAtlas/.env`) and **backend** (`CareAtlas/server/.env`).
Templates are committed (`*.example`); real values are **not**.

### 6.1 Frontend (`CareAtlas/.env`)
| Var | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Where the app sends API calls. Dev: `/api` (uses the proxy). Prod: full origin (set in `.env.production`). |
| `VITE_API_PROXY_TARGET` | Where the Vite dev server proxies `/api`. Local backend `http://localhost:8000`, or the Render URL to use the live backend. |

### 6.2 Backend (`CareAtlas/server/.env`) — placeholders shown, real secrets omitted
| Var | Purpose |
|---|---|
| `SNOW_INSTANCE` | ServiceNow host, e.g. `ven04690.service-now.com` |
| `SNOW_USERNAME` / `SNOW_PASSWORD` | Main service account (read AICT/AIRC/GRC tables) — `interface_gautham` |
| `SNOW_PII_AGENT_USERNAME` / `_PASSWORD` | UC1 "restricted" agent (NO `role_patient_pii`) — proves PII is stripped |
| `SNOW_CLINICAL_AGENT_USERNAME` / `_PASSWORD` | UC1 "privileged" agent (HAS `role_patient_pii`) — authorized side of redaction demo |
| `SNOW_A2A_CLIENT_ID` / `_CLIENT_SECRET` / `_SCOPE` / `_TOKEN_SKEW_SECONDS` | OAuth for executing ServiceNow AI Agents (A2A) |
| `A2A_CALLBACK_BASE_URL` / `A2A_CALLBACK_TOKEN` | Async A2A callback endpoint (blocking A2A is the default now) |
| `COGNITO_REGION` / `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` / `COGNITO_CLIENT_SECRET` | AWS Cognito (login + MFA). AWS creds via standard AWS chain. |
| `ENTRA_*` | Microsoft Entra External ID native auth (optional) |
| `CORS_ORIGINS` | Comma-separated allowed browser origins (dev `http://localhost:5173`, plus prod origins) |
| `AGENTS_CREATED_SINCE` | Only list agents created on/after this date (default `2026-06-02 00:00:00`) |
| `REQUEST_TIMEOUT` / `AGENT_EXECUTE_TIMEOUT` | HTTP timeouts (20s / 90s) |

> **Security note:** `server/.env` holds live ServiceNow, AWS, and Entra secrets. It is
> gitignored. Never paste these into docs, screenshots, or the frontend bundle.

---

## 7. Frontend in detail (`src/`)

### 7.1 Entry & auth wiring
- `src/main.tsx` wraps the app in `<BrowserRouter>` and **three nested auth providers**:
  `PatientAuthProvider` → `ClinicianAuthProvider` → `GovernanceAuthProvider`.
- `src/App.tsx` declares all routes and **route guards**. Each portal is protected and
  cross‑portal access is blocked (if a patient is logged in, staff/governance routes
  redirect, and vice‑versa).

### 7.2 The three auth contexts (`src/contexts/`)
`PatientAuthContext`, `ClinicianAuthContext`, `GovernanceAuthContext` — identical shape,
separate localStorage keys (`careatlas.patientAuth` / `.clinicianAuth` / `.governanceAuth`).
Each backs onto **AWS Cognito** and supports: `login`, `completeNewPasswordChallenge`,
`verifyLoginMfa`, `completeMfaSetup`, `overrideLogin` (demo bypass), `logout`. Tokens are
re‑validated on reload; invalid → logged out. The **override auth** (`src/lib/overrideAuth.ts`)
lets you enter any portal for demos without real credentials.

### 7.3 Routes (all verified in `App.tsx`)
**Home:** `/` and `/role-picker` → `ViewChooserPage` (pick a portal).

**Patient portal** (`PatientProtectedRoute`):
`/patient/home`, `/patient/register`, `/patient/verify-email`, `/patient/sign-in`,
`/patient/dashboard`, `/patient/book`, `/patient/appointments`,
`/patient/appointments/:recordId`, `/patient/profile`, `/patient/contact`,
`/patient/notifications`.

**Staff portal** (`ClinicianProtectedRoute`):
`/staff/sign-in`, `/staff/doctor`, `/staff/admin`, `/staff/patient/:id`, `/staff/notes`,
`/staff/notifications`, `/staff/appointments`, `/staff/appointments/:recordId`,
`/staff/queue`, `/staff/analytics`, `/staff/availability`, `/staff/profile`.

**Governance portal** (`GovernanceProtectedRoute`):
`/governance/sign-in`, `/governance`, `/governance/ai-agents`, `/governance/acl`,
`/governance/demo`, `/governance/demo/privacy` (UC1), `/governance/demo/risk` (UC2),
`/governance/demo/regulation` (UC3), `/governance/demo/security` (UC5),
`/governance/demo/fairness` (UC6), `/governance/demo/consent` (UC10), `/governance/agenda`,
`/governance/additional-work`, `/governance/llm02-audit`. Fallback `*` → `/`.

### 7.4 Key governance components (`src/components/governance/`)
- `PiiRedactionDemo.tsx` / `AiRedactionComparisonCard.tsx` / `RoleBasedRedactionDemo.tsx` /
  `PrivacyControlsPanel.tsx` — **UC1** PII redaction & role‑based access comparison.
- `ApprovalGateDemo.tsx` / `ApprovalLogPanel.tsx` — **UC2** human‑approval gate + audit log.
- `RegulatoryClassificationBadge.tsx` — **UC3** risk tier badge (renders `Unverified` on
  missing live data — never guesses).
- `InjectionTesterDemo.tsx` — **UC5** prompt‑injection tester.
- `FairnessDebiasDemo.tsx` / `SchedulingAgentCompareModal.tsx` — **UC6** fairness/debias.
- `ConsentEnforcementPanel.tsx` — **UC10** "Patient Consent Enforcement" panel, shared by the governance dashboard and the consent demo page. The `UseCaseWorkflowsModal` also has a `uc10` tab.
- `ShadowAiWorkflowModal.tsx` — **UC8** shadow‑AI discovery animation.
- `RegisterAgentModal.tsx` — register a new agent. `UseCaseWorkflowsModal.tsx` /
  `PatientLifecycleModal.tsx` — animated narratives. `DemoTag.tsx` — "Demo" label.

Other widgets: `AiAssistantWidget.tsx` (floating "Ask AI" panel — runs agents, applies the
approval gate and guardrail scan per page), `NotificationBell.tsx`, `NotificationFeed.tsx`.

### 7.5 Services (`src/services/`)
- `serviceNow.ts` — the typed API client. Every function maps to one backend endpoint.
  Highlights: `fetchManagedAIAssets` / `fetchUnmanagedAIAssets` (UC8), `askScopedAgent`
  (UC2), `fetchPrivacyControls` / `fetchPatientAccessComparison` (UC1),
  `submitApprovalIntent` / `decideApproval` / `fetchApprovalLog` (UC2),
  `fetchRegulatoryEvidence` / `fetchRegulatoryAiSystems` (UC3),
  `scanGuardrailApi` / `fetchSecurityKpis` (UC5), `fetchFairnessData` (UC6),
  `fetchAclSummary` / `testServiceAccountAcl` (UC2), plus all patient/booking/notes/notification calls.
- `awsAuth.ts` — Cognito auth calls (`/api/aws/*`).

### 7.6 Hooks / data / lib
- Hooks: `useNotifications`, `usePatientSchedule`, `useClinicianSchedule`, `useFairnessData`,
  `useUnmanagedAISystems`.
- Data: `patientPortalData.ts` (hospital/sample data), `staffGovernanceData.ts` (KPIs/use‑case
  copy), `useCaseDemoData.ts` (regex patterns, fairness thresholds, intent classification).
- Lib: `cn.ts` (classnames), `overrideAuth.ts`, `portalNav.ts`, `notifications.ts`,
  `scheduling.ts`, `patientDataGenerator.ts`.

---

## 8. Backend in detail (`server/app/`)

- `main.py` builds the FastAPI app (`create_app()`), mounts the `/api` router, configures
  **CORS** from `CORS_ORIGINS`, adds logging + exception handlers, and mounts the AWS
  Cognito router. Settings come from `config.py` via a cached `get_settings()` dependency.
- `servicenow.py` owns **every** ServiceNow REST call and the ACL probe matrix.
- `models.py` defines all Pydantic request/response shapes.
- Auth/util modules: `aws_auth.py`, `a2a_callbacks.py`, `approvals.py`, `notifications.py`,
  `pwned_passwords.py`.

---

## 9. Backend API reference (every endpoint)

All under prefix `/api`. Full interactive list at `/docs` when running.

### Health & agent inventory
| Method | Path | Does | ServiceNow |
|---|---|---|---|
| GET | `/health` | Liveness probe | — |
| GET | `/agents` | List AI agents created since cutoff | `sn_aia_agent` |
| POST | `/agents/register` | Create an AI agent | `sn_aia_agent` |
| GET | `/agents/managed` | Managed AI assets (owned) | `alm_ai_system_digital_asset` (+ governance details) |
| GET | `/agents/unmanaged` | Unmanaged / shadow AI assets (**UC8**) | `alm_ai_system_digital_asset` (+ governance details) |

### Agent execution (A2A)
| Method | Path | Does |
|---|---|---|
| POST | `/agents/execute` | Run a ServiceNow AI Agent (blocking A2A, OAuth) |
| GET | `/agents/execute/{request_id}` | Poll execution result (in‑memory store) |
| POST | `/a2a/callback/{agent_sys_id}` | Async A2A callback sink (token‑validated) |

### Governance — Regulation (**UC3**)
| Method | Path | Does | ServiceNow |
|---|---|---|---|
| GET | `/governance/regulation/ai-systems` | Dropdown list of team‑owned governed AI systems | `sn_grc_ai_gov_ai_system` (filtered by `business_owner`) |
| GET | `/governance/regulation/evidence?query=` | Live readiness (classification, tasks, FRIA, risk result, `demo_ready`) | `sn_grc_ai_gov_ai_system` (+ `_task`, `_risk_assessment_result`, `_entity_map`, `sn_smart_imp_auto_assessment_action`) |

### Governance — Privacy (**UC1**) & Risk (**UC2**)
| Method | Path | Does | ServiceNow |
|---|---|---|---|
| GET | `/governance/decision-log` | Anonymized AI triage decisions | `u_ai_decision_log` |
| GET | `/governance/privacy-controls` | PII ACL status, deny‑probe, filter count, anonymization rate | `u_ai_decision_log`, `sys_security_acl` |
| GET | `/governance/privacy/patient-lookup` | Same patient read by restricted vs privileged agent | `u_patient` (read as both identities) |
| POST | `/governance/agent/ask` | Page‑scoped agent answer within its ACL identity (may return approval) | `u_patient` |
| POST | `/governance/approval/submit` | Submit high‑impact intent → pending/auto | in‑memory |
| POST | `/governance/approval/{request_id}/decision` | Officer approve/deny (audited) | `u_ai_action_audit_log` |
| GET | `/governance/approval/log` | Approval audit trail | `u_ai_action_audit_log` |

### Governance — Security (**UC5**) & LLM02
| Method | Path | Does | ServiceNow |
|---|---|---|---|
| POST | `/governance/guardrail/scan` | Scan text for injection; open AI Case if blocked | `sn_ai_case_mgmt_ai_case` |
| GET | `/governance/security-kpis` | Open AI cases, active filters, patterns, rules | `sn_ai_case_mgmt_ai_case`, filters |
| POST | `/governance/llm02/flag` | Log a sensitive‑info‑disclosure block | `u_ai_action_audit_log` |
| GET | `/governance/llm02/audit-log` | List LLM02 blocks | `u_ai_action_audit_log` |

### Governance — Fairness (**UC6**)
| Method | Path | Does | ServiceNow |
|---|---|---|---|
| GET | `/governance/fairness` | Appointment outcomes by gender/ethnicity/age (aggregates only, no PII) + skew alert | `u_appointment` ⋈ `u_patient` |

### Consent & Purpose (**UC10**)
| Method | Path | Does | ServiceNow |
|---|---|---|---|
| GET | `/patient/consent-flags` | Read a patient's allowed AI purposes (header `X-Username`; username→email fallback) | `u_patient.u_consent_flags` |
| POST | `/patient/consent-flags` | Save a patient's allowed purposes (`{flags}`) | `u_patient` |
| GET | `/governance/consent-violations` | 30‑day count + recent consent‑breach incidents | `sn_si_incident` (`category=consent_purpose_violation`) |

> **Runtime ConsentGate:** `ask_scoped_agent` (`/governance/agent/ask`) checks the patient's `u_consent_flags` for the agent's purpose **before** reading; on a miss it blocks (reads nothing) and opens a `consent_purpose_violation` incident. Identity‑verification is exempt; behaviour is fail‑closed.

### ACL posture (**UC2**)
| Method | Path | Does |
|---|---|---|
| POST | `/acl/test` | Run the read/write/PII probe matrix for one `svc-*` account |
| GET | `/acl/summary` | Aggregate posture across all governed agents (passed, blocked, write‑denials, leaks) |

### Patients, booking, staff, notes
`POST /patients/register`, `GET /patients/profile`, `PATCH /patients/profile`,
`GET /patients/search`, `GET /patients/booking/availability`,
`POST /patients/booking/appointments`, `GET/PATCH /staff/registrations`,
`GET /staff/appointment-options`, `GET /staff/appointment`,
`POST/PATCH /staff/appointments`, `GET/POST/PATCH /staff/summary-notes`,
`DELETE /staff/summary-notes/{sys_id}` — all back onto `u_patient`, `u_doctor`,
`u_appointment`, `u_summary_notes`, `u_notification_reminders`.

### Auth, notifications, utilities
- `POST /auth/validate` (validate a ServiceNow login against `sys_user`)
- `POST /passwords/pwned-check` (HaveIBeenPwned k‑anonymity)
- `POST /doctors/provision-sample` (create a demo clinician in Cognito + `u_doctor`)
- `GET /notifications`, `PATCH /notifications/{sys_id}/read`
- **AWS Cognito** router under `/api/aws/*`: `register`, `register-doctor`, `login`,
  `login/new-password`, `mfa/setup/start`, `mfa/setup/verify`, `mfa/preference`,
  `login/verify-mfa`, `password/forgot`, `password/reset`, `token/validate`,
  `email/send-code`, `email/verify`, `logout`.

---

## 10. ServiceNow integration

### 10.1 Tables CareAtlas reads/writes
**Hospital data:** `u_patient`, `u_doctor`, `u_appointment`, `u_summary_notes`,
`u_notification_reminders`.
**Audit:** `u_ai_decision_log` (anonymized triage decisions),
`u_ai_action_audit_log` (approval decisions + LLM02 blocks).
**AI governance:** `sn_aia_agent`, `alm_ai_system_digital_asset`,
`sn_ai_governance_asset_governance_details`, `sn_grc_ai_gov_ai_system` (+ `_task`,
`_risk_assessment_result`, `_entity_map`), `sn_smart_imp_auto_assessment_action`,
`sn_ai_case_mgmt_ai_case`, content filters, `sys_security_acl`, `sys_user`.
**Consent (UC10):** `u_patient.u_consent_flags` / `u_consent_accepted` / `u_consent_accepted_on`;
`sn_si_incident` (`category=consent_purpose_violation`).

### 10.2 The `svc-*` service accounts (UC2)
11 `svc-*` accounts exist; UC2 governs **9**: `svc-identity-verification-agent`,
`svc-scheduling-agent`, `svc-triage-agent`, `svc-notes-agent`, `svc-reminder-agent`
(patient‑facing) and `svc-security-scanner`, `svc-security-remediation`,
`svc-threat-intel`, `svc-pipeline-orchestrator` (security‑ops, no patient access).
**Permissions are granted via group membership, never direct roles** — the instance
strips direct `sys_user_has_role` grants from these accounts. The two access groups are
*CareAtlas Patient Read Agents* (`u_patients_user`) and *CareAtlas Scheduling Agents*
(`u_scheduling_agent`). Full matrix in `Plan md files/completed_UC2.md`.

### 10.3 The ACL probe matrix (`servicenow.py`)
`test_service_account_acl()` runs, per account, a set of **read** / **write** /
**field‑level PII** probes and classifies each as allowed/denied/leak. Clean write‑denials
come back as HTTP `403` (table‑level, no role) — so no custom deny ACLs were needed.
`summarize_acl_posture()` aggregates all accounts for the KPI on `/acl/summary`.

### 10.4 Agent execution (A2A)
`execute_agent()` gets an OAuth token (client‑credentials, `SNOW_A2A_*`) and calls the
ServiceNow A2A v2 endpoint for the agent, **blocking** until the agent replies. Async
callbacks (`/a2a/callback/...`) and an in‑memory store exist as a fallback path.

---

## 11. The ten governance use cases — honest status (2026‑06‑26)

Status legend: ✅ **Built & live‑verified** · 🟡 **Foundations live, partial app surface** ·
🧭 **Roadmap / instance‑side only**.

### UC1 — Privacy: Sensitive Information Disclosure (OWASP LLM02) · ✅
**Proves:** no agent can leak patient PII; the audit log itself can't re‑identify a patient;
access is governed by *role*. **Three walls:** (1) field‑level ACLs on `u_patient` PII
columns requiring `role_patient_pii` — **enforced live**; (2) a Gen AI PII output filter
(`sys_gen_ai_filter`, active) — **record real, not yet wired into a runtime output path**;
(3) anonymized `u_ai_decision_log` keyed on `u_patient_id_anon` — **enforced live**.
**App:** `GET /governance/privacy-controls`, `GET /governance/privacy/patient-lookup`;
page `/governance/demo/privacy`. **Doc:** `completed_UC1.md`.

### UC2 — Risk: Excessive Agency via ACL least‑privilege (OWASP LLM06) · ✅
**Proves:** every agent is a scoped identity that can do only its job; cross‑scope writes
return `403`; high‑impact actions stop for human approval (audited). Verified 2026‑06‑25:
9 agents, 9 passed, 18 access attempts blocked, 9 write denials, 0 leaks.
**App:** `/acl/test`, `/acl/summary`, `/governance/agent/ask`, `/governance/approval/*`;
pages `/governance/acl`, `/governance/demo/risk`. **Doc:** `completed_UC2.md` (+continuation).

### UC3 — Regulation: EU AI Act Conformity + FRIA · ✅ (completed 2026‑06‑26)
**Proves:** the platform calculated a real EU AI Act **risk tier** and generated a **FRIA**
for the patient‑triage agent. `Triage Appointment DG1` is now **High‑risk** with EU AI Act
Conformity + AI Impact + **FRIA** assessments all closed‑complete; `demo_ready: true`.
This session: granted manager/admin/analyst roles, **activated 48 FRIA Post Assessment
Actions** (were 0), and ran the assessment end‑to‑end in the AIRC Workspace.
**App:** `GET /governance/regulation/evidence`, `GET /governance/regulation/ai-systems`
(dropdown of team‑owned systems); page `/governance/demo/regulation`. **Read‑only** — no
ServiceNow write path. **Docs:** `completed_UC3.md`, `UC3-Regulation-EUAIAct-FRIA.md`.

### UC4 — Compliance: Pre‑Deployment Compliance Gate · 🟡
**Proves:** nothing ships without a green light — the AICT Playbook blocks deployment while
a control is unattested, then approves. **Foundations live on the instance:** 54 Post
Assessment Actions, 32 automation rules, 399 controls, 87 policies. The enforced
block→approve transition is demonstrated **in the ServiceNow AICT Playbook UI**; the
CareAtlas app surfaces governed AI systems and their evidence but does not yet render the
full block→approve gate. (No dedicated `completed_UC4.md`; covered in the business plan.)

### UC5 — Security: Prompt‑Injection Defense + Output‑Pattern Detection (OWASP LLM01) · ✅
**Proves:** injection in patient free‑text is caught before the model acts, a real **AI
Case** is opened automatically, and agent output is scanned against deterministic patterns
(SQLi, script‑tag, RCE, …). The backend scans input (3 injection patterns) and output (5
patterns); on a block it `POST`s a real `sn_ai_case_mgmt_ai_case` (case_type
`adversarial_attacks`). 9 AI Cases now exist (was 0). **App:** `POST /governance/guardrail/scan`,
`GET /governance/security-kpis`; page `/governance/demo/security`. **Doc:** `completed_UC5.md`.

### UC6 — Fairness & Ethics: Non‑Discriminatory Scheduling (EU AI Act Art. 10) · ✅
**Proves:** scheduling outcomes are measured continuously across gender/ethnicity/age, and
skew is surfaced in real time. Live data (90 appointments) showed a **13.1pp
over‑allocation** to one cohort → real skew alert. Backed by `sn_risk_definition`
(Algorithmic Bias + Data Bias), a fairness control, 21 metric definitions, and real
demographic fields on `u_patient`. **App:** `GET /governance/fairness`; page
`/governance/demo/fairness`; dashboard "Fairness skew" tile. **Doc:** `completed_UC6.md`.

### UC7 — Data Integrity: Data Poisoning Defense (OWASP LLM04) · 🧭
**Proves (governance only):** datasets are registered, risk‑assessed, and integrity‑controlled.
**Honest caveat (re‑confirmed 2026‑06‑26):** the dedicated **Model Risk Management** app is
**NOT installed** (`sn_model_risk_mgmt_model` → Invalid table). So data‑poisoning
*governance* is demonstrable; model‑level detection/lineage is **roadmap** (procure the app).

### UC8 — Visibility: Shadow AI Discovery · ✅
**Proves:** show every AI agent/asset touching patient data, including unregistered ones,
then pull one into intake. **Live data:** 160 agents, 333 assets, with a managed/unmanaged
split. **App:** `GET /agents/managed`, `GET /agents/unmanaged`, hook
`useUnmanagedAISystems`, component `ShadowAiWorkflowModal`; page `/governance/ai-agents`.

### UC9 — Operational Control: Emergency Stop (MCP kill switch) · 🧭
**Proves:** one click pauses a misbehaving AI integration. Live target exists
(`sn_mcp_server` = 1 "Dynatrace MCP server", `sn_mcp_server_registry` = 2). Requires **AI
Control Tower Pro Plus** entitlement for the pause/resume control to surface — entitlement
to confirm. Operated in ServiceNow; the app can optionally show a status badge.

### UC10 — Consent & Purpose-of-Use Enforcement · ✅ (added 2026‑06‑26)
**Proves:** the AI only processes a patient's data for the purposes that patient explicitly
agreed to — purpose‑level, beyond table/field ACLs. Every patient sets allowed purposes
(`scheduling`, `notes_summarisation`, `reminders`, `triage`) on `u_patient.u_consent_flags`.
A **runtime ConsentGate** in `ask_scoped_agent` checks the patient's consent for the agent's
purpose **before** reading; on a miss it **blocks (reads no data) and opens a real
`sn_si_incident`** (`category=consent_purpose_violation`). Identity‑verification is exempt;
behaviour is **fail‑closed**. Verified live: Notes Agent blocked for a scheduling‑only patient
(incident opened), Scheduling Agent allowed. **App:** patient consent toggles in
`ProfilePage.tsx`; shared `ConsentEnforcementPanel`; dedicated page `/governance/demo/consent`
(workflow modal + panel + live incidents table); endpoints `GET/POST /patient/consent-flags`,
`GET /governance/consent-violations`. **Docs:** `completed_UC10.md`, `UC10-Consent-PurposeOfUse.md`.
**Loose ends:** `fetchConsentCoverage` (frontend) points at an unimplemented
`/governance/consent-coverage`; the dashboard panel copy is static (the live table is on the
consent page).

---

## 12. Use case → code map (quick reference)

| UC | Backend endpoint(s) | Frontend page | Key ServiceNow table |
|---|---|---|---|
| UC1 Privacy | `/governance/privacy-controls`, `/governance/privacy/patient-lookup`, `/governance/decision-log` | `/governance/demo/privacy` | `sys_security_acl`, `u_ai_decision_log` |
| UC2 Risk | `/acl/test`, `/acl/summary`, `/governance/agent/ask`, `/governance/approval/*` | `/governance/acl`, `/governance/demo/risk` | `svc-*` users, `u_ai_action_audit_log` |
| UC3 Regulation | `/governance/regulation/evidence`, `/governance/regulation/ai-systems` | `/governance/demo/regulation` | `sn_grc_ai_gov_ai_system` (+ tasks/FRIA) |
| UC4 Compliance | (AICT Playbook UI; `/agents/managed` for evidence) | ServiceNow AICT + `/governance/ai-agents` | `sn_compliance_control`, `sn_smart_imp_auto_*` |
| UC5 Security | `/governance/guardrail/scan`, `/governance/security-kpis`, `/governance/llm02/*` | `/governance/demo/security`, `/governance/llm02-audit` | `sn_ai_case_mgmt_ai_case` |
| UC6 Fairness | `/governance/fairness` | `/governance/demo/fairness` | `sn_risk_definition`, `sys_generative_ai_metric` |
| UC7 Data Integrity | (governance via AIRC; no app detection) | — | `sn_risk_definition` (model‑risk app absent) |
| UC8 Visibility | `/agents`, `/agents/managed`, `/agents/unmanaged` | `/governance/ai-agents` | `sn_aia_agent`, `alm_ai_system_digital_asset` |
| UC9 Operational Control | (ServiceNow MCP pause/resume) | optional badge | `sn_mcp_server` |
| UC10 Consent & Purpose | `/patient/consent-flags`, `/governance/consent-violations`, gate in `/governance/agent/ask` | `/governance/demo/consent` (+ `ProfilePage`) | `u_patient.u_consent_flags`, `sn_si_incident` |

---

## 13. Recommended demo walkthrough

From `Plan md files/26junstory.md` — tell it as one journey through the AI Governance
Life Cycle, each answer creating the next question:

**See it (UC8 Visibility) → Justify it (UC3 Regulation) → Gate it (UC4 Compliance) →
Bound it (UC2 Risk) → Protect the patient (UC1 Privacy) → Treat everyone fairly
(UC6 Fairness) → Protect the inputs (UC7 Data Integrity) → Catch the attack (UC5 Security)
→ Stop it instantly (UC9 Operational Control).**

---

## 14. Testing

Backend tests (pytest) in `server/tests/`:
```bash
cd CareAtlas/server
.venv/bin/python -m pytest tests/ -v
```
Covers ACL probes (`test_servicenow_acl.py`), Cognito auth (`test_aws_auth.py`), pwned
passwords, patient registration, A2A execution, and A2A callbacks.

Frontend typecheck:
```bash
cd CareAtlas
npx tsc -p tsconfig.app.json --noEmit
```

UC3 read‑only instance audits: `server/scripts/audit_uc3_readonly.sh`,
`server/scripts/audit_uc3_detail_readonly.sh`.

---

## 15. Deployment

- **Frontend → Firebase Hosting** (`firebase.json`, project `task--mission`): `npm run build`
  produces `dist/`, deployed as a static SPA (SPA rewrite to `/index.html`, 1‑year cache on
  hashed assets, `no-cache` on `index.html`). `.env.production` points the build at the
  deployed backend.
- **Backend → Render** (`https://careatlas.onrender.com`): runs `uvicorn app.main:app`.
  Ensure `CORS_ORIGINS` includes the deployed frontend origin(s).

---

## 16. Gotchas & notes for newcomers

- **Tailwind v4 layering:** `src/styles.css` has an *unlayered* `a { color: inherit }` rule
  that **overrides** layered Tailwind utilities like `text-white`. So an `<a>` styled as a
  filled button needs `!text-white` (important modifier) to render white text. (`<button>`
  / `<span>` are unaffected.) This bit the "Open AI system record" button on the Regulation
  page — fixed with `!text-white`.
- **No fabrication policy:** governance pages read **live** ServiceNow data and show
  `Unverified` / `Not ready` when evidence is missing. UC3 was completed by genuinely
  running the AIRC assessment flow, not by writing a fake classification value.
- **`svc-*` accounts:** never grant them direct roles — use groups (the instance strips
  direct grants).
- **Service accounts share the demo password**, stored only in `server/.env`.

---

## 17. Where to read more

The `Plan md files/` directory is the narrative source of truth:
- `june26BusinessPlan.md` — the full ten‑use‑case master plan with live evidence.
- `26junstory.md` — the demo walkthrough script ("talk to me like a baby").
- `completed_UC1.md`, `completed_UC2.md` (+ continuation), `completed_UC3.md`,
  `completed_UC5.md`, `completed_UC6.md` — per‑use‑case "what was built", with ServiceNow
  `sys_id`s and recreate‑from‑scratch steps.
- `UC3-Regulation-EUAIAct-FRIA.md` — the UC3 plan and instance steps.

---

*Every endpoint, route, table name, and row count in this README was verified on
2026‑06‑26 against the live `ven04690` instance (read‑only `curl` via `server/.env`) and the
CareAtlas source (`src/`, `server/app/`). Items marked 🟡/🧭 are explicitly partial or
roadmap and are not overstated.*
</content>
