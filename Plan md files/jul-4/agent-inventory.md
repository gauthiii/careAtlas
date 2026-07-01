# CareAtlas — ServiceNow Agent Inventory

How this app actually relates to ServiceNow: the FastAPI backend (`server/app/servicenow.py`) talks to a real ServiceNow instance over its REST Table API (`sn_aia_agent`, `sn_aia_a2a` A2A protocol, `alm_ai_system_digital_asset`, `sn_ai_governance_asset_governance_details`) using basic auth (`settings.snow_username/password`). The React frontend never calls ServiceNow directly — it only calls our own `/api/...` routes, which proxy to ServiceNow or to local Postgres-backed tables. So "real" below means "backed by a live ServiceNow API call or live backend logic," not "calls ServiceNow" specifically for every agent (some scoped agents are simulated ACL identities used purely for demo purposes, others execute via ServiceNow's actual A2A agent protocol).

## Agents that execute via ServiceNow's real A2A protocol

| Agent | sys_id | What it does | Real or mock? |
|---|---|---|---|
| **Schedule Appointment Agent** (`BOOK_APPOINTMENT_AGENT_ID`) | `b2cdf70e1bd50f54d7eaea45604bcb0c` | The patient portal's "Book Appointment" flow sends the booking request to this ServiceNow AI Agent via synchronous A2A (`message/send`, blocking) — `server/app/servicenow.py:2916` `execute_agent()`, called from `src/App.tsx:809/833`. Honors a least-privilege ACL (only non-PII scheduling fields). | **Real.** Live HTTP call to `{snow_base_url}/api/sn_aia/a2a/v2/agent/id/{agent_sys_id}` with real ServiceNow A2A response parsing (`servicenow.py:2916-3027`). |
| **Rogue Agent** (`ROGUE_AGENT_ID`) | `e175cd041ba54f94b72fc9d3604bcb4c` | Deliberately unrestricted ServiceNow agent with no ACL, used as the "before governance" counterexample — leaks PII and can take high-impact actions (e.g. cancel appointments) with no approval gate. Invoked the same way as the Book Appointment Agent (`SchedulingAgentCompareModal.tsx`), just pointed at a different sys_id. | **Real agent, intentionally misconfigured.** It's a genuine ServiceNow agent record with weak ACLs — used in the demo to contrast against the governed agent, not a UI mock. |

**Correction on `SchedulingAgentCompareModal.tsx`:** both the "Secure" and "Rogue" panels make the *same* genuine live `executeAgent()`/`fetchAgentExecution()` call against their respective real sys_ids (same latency, real round-trip). But per a comment at the top of that file, the "Secure" panel then **discards the real response and renders a hardcoded refusal message** (`REFUSAL_MESSAGE`) instead of showing what the governed agent actually said. So the underlying call is real on both sides — the "secure" outcome shown to the user is scripted UI theater layered on top of a real backend call, not a faked/mocked request.

**No LLM calls anywhere in this repo.** A repo-wide grep for `openai|anthropic|chat.completions|messages.create` across `src` and `server/app` returns only two harmless static display strings (`GovernanceAgendaPage.tsx:925` — a mock unmanaged-asset table row labeled "GPT-4 Triage Bot" / vendor "OpenAI", and `GovernanceDashboardPage.tsx:480` — static text `openai-proxy.internal`). "Agent execution" in this app always means proxying to ServiceNow's own AI Agent Studio / A2A protocol — CareAtlas itself never calls an LLM API directly.

## Page-scoped "Ask AI" identities (UC2 least-privilege demo)

These aren't separate ServiceNow AI Agent (`sn_aia_agent`) records executed via A2A — they're named ServiceNow **service-account identities** (`svc-*` users) that the backend authenticates as when reading the `u_patient` table, to prove field-level ACL enforcement per "agent." Defined in `server/app/servicenow.py:3417` (`SCOPED_AGENTS` dict), exposed via `POST /governance/agent/ask` → `askScopedAgent()` in `src/services/serviceNow.ts:163`.

| Agent | ServiceNow identity | What it does | Real or mock? |
|---|---|---|---|
| **Scheduling Agent** | `svc-scheduling-agent` | Ranks appointment slots from non-PII signals only (health condition, accessibility, time preference, account status). | **Real.** Live read of `u_patient` in ServiceNow *as that ACL-restricted user* — ServiceNow's field-level ACL strips PII server-side, not the app. |
| **Triage Agent** | `svc-triage-agent` | Assigns a triage priority from reason-for-visit + health condition. | **Real**, same mechanism. |
| **Clinical Notes Agent** | `svc-notes-agent` | Reads/writes appointment notes; denied all patient PII. | **Real**, same mechanism. |
| **Reminder Agent** | `svc-reminder-agent` | Reads appointment timing to send reminders. | **Real**, same mechanism. |
| **Identity Verification Agent** | `svc-identity-verification-agent` | Verifies identity from registration status + confidence score (exempt from consent-gating — treated as baseline security, not a toggleable AI purpose). | **Real**, same mechanism. |

Each of these is also consent-gated (UC10 ConsentGate, `servicenow.py:3480` area): before reading a patient as that identity, the patient's `u_consent_flags` must include the matching purpose (`scheduling`, `notes_summarisation`, `reminders`, `triage`); identity verification is exempt. Fails closed — missing/unreadable flag blocks the agent and logs an incident.

## "Security-ops" agents (no patient data access — used in ACL test suite)

Listed in `ACL_TEST_PROBES` (`servicenow.py:356-380`) and surfaced on `/governance/acl` (Least-Privilege Matrix / Test ACL page). These run automated read/write probes against ServiceNow to prove they're correctly denied patient-table access. **Real** — `testServiceAccountAcl()` / `POST /acl/test` actually executes table reads/writes as each identity and records pass/fail (`servicenow.py:2790` `_probe_create_denied`, `fetchAclSummary()` aggregates results from `/acl/summary`).

## AI Agent / AI Asset inventory tables (Governance pages)

| Source | Endpoint | What it shows | Real or mock? |
|---|---|---|---|
| **AI Agents inventory** (`GovernanceAiAgentsPage.tsx`) | `GET /agents` → `fetch_agents()` (`servicenow.py:593`) | Pulls all rows from ServiceNow's `sn_aia_agent` table created since a configured cutoff date, newest first (name, agent_type, strategy, role, description, proficiency, instructions, condition). | **Real.** Live `GET {snow_base_url}/api/now/table/sn_aia_agent` call. |
| **Register Agent** (`RegisterAgentModal.tsx`) | `POST /agents/register` → `create_agent()` (`servicenow.py:618`) | Lets a user create a brand-new `sn_aia_agent` record directly in ServiceNow from the CareAtlas UI. | **Real.** Live `POST` to ServiceNow's Table API — actually creates a record in the connected instance. |
| **Managed / Unmanaged AI Assets** (`fetchManagedAIAssets`, `fetchUnmanagedAIAssets`) | `GET /agents/managed`, `GET /agents/unmanaged` | Reads `alm_ai_system_digital_asset` + joins governance/risk data from `sn_ai_governance_asset_governance_details` (AI Control Tower risk score, lifecycle phase, status). Assets with `managed_by` set are "managed"; any asset name containing "demo agent" is forced into the unmanaged bucket for the demo narrative. | **Real data, demo-biased bucketing.** The ServiceNow data is live; the managed/unmanaged split has one hardcoded override (`DEMO_AGENT_NAME_FRAGMENT = "demo agent"`) purely to make the unmanaged-shadow-AI story visible in the demo. |

## Display-only / narrative agent references (not separately executable)

These names show up in `GovernanceAgendaPage.tsx` and `GovernanceAgenda26Page.tsx` as static checklist/status entries summarizing the demo story (e.g. "9 agents · 23 ACL checks · 9 passed"), and in `BeforeAfterDemo.tsx` / `ContextualPrivacyBeforeAfter.tsx` / `ContextualRiskBeforeAfter.tsx` as labels on simulated chat panels.

| Agent (as labeled) | What it does | Real or mock? |
|---|---|---|
| **Patient Data Agent** | Referenced in the governance agenda checklist as part of the "9 agents" tally. | **Mock/label only** — no corresponding executable agent or dedicated endpoint found; appears to be a narrative placeholder summarizing the demo's agent count. |
| **Fairness Monitor Agent** | Same — agenda checklist label. The *underlying fairness data* it implies (`GET /governance/fairness`, `fetchFairnessData()`) is real and computed from live appointment data with skew detection and an incident-raising action (`raiseFairnessRemediationIncident`), but there's no separate "Fairness Monitor Agent" ServiceNow record executing anything — it's app-side analytics, not an agent. | **Mixed** — underlying KPI computation is real; the "agent" framing is presentational. |

## Purely static mock agents (no backend wiring at all)

`src/data/staffGovernanceData.ts` defines its own standalone arrays for the staff Governance dashboard UI — these are **not fetched from anywhere** and exist only as hardcoded display data:

| Source | Entries | What it does | Real or mock? |
|---|---|---|---|
| `staffGovernanceData.ts:72` `agents` array | "Scheduling Ranker," "Identity Verifier," "Appointment Summarizer," "Legacy Slot Optimizer" | Displays a static agent roster with fabricated CI numbers (e.g. `CI-AI-2401`) and identities (e.g. `nhid-schedule-01`) on a dashboard table. | **Pure mock.** No fetch call backs this array. |
| `staffGovernanceData.ts:132` `nonHumanIdentities` array | 5 entries whose `userId` fields (`svc-identity-verification-agent`, `svc-scheduling-agent`, `svc-reminder-agent`, `svc-notes-agent`, `svc-triage-agent`) mirror the real backend `SCOPED_AGENTS` usernames | Lists non-human service identities for a dashboard panel. | **Pure mock, but name-aliased to something real.** This array is separately maintained static data — it isn't fetched from `/api/governance/agent/ask` or any live endpoint, even though its usernames are copy-identical to the genuinely real `SCOPED_AGENTS` identities used elsewhere (see above). Easy to mistake one for the other since the names match exactly. |
| `staffGovernanceData.ts:94` `accessViolations`, `:87` `injectionAlerts`, `:99` `auditLog` | — | Static narrative arrays for dashboard demo display. | **Pure mock.** |

`src/data/useCaseDemoData.ts:280/327` (`HALLUCINATION_PRESETS`, `scanHallucination()`) — the hallucination *detector* itself is a deterministic local rule engine (5 hardcoded rules: malformed JSON, missing fields, urgency escalation, high-acuity specialty mismatch, specialty mismatch), not an LLM call. It feeds a real ServiceNow log write (`flagHallucinationEvent` → `u_hallucination_log`), so the logging/audit trail is real even though the "detection" logic is local/rule-based rather than AI-driven.

`UseCaseWorkflowsModal.tsx` and `ShadowAiWorkflowModal.tsx` — entirely static storyboard JSX (no fetch calls), illustrating governance lifecycle steps with real ServiceNow table/endpoint names used purely as labels.

## Bottom line

- **Genuinely real, ServiceNow-backed:** Schedule Appointment Agent, Rogue Agent (both via live A2A execution), all five `svc-*` scoped page agents (live ACL-scoped reads), the AI Agent inventory table, Register Agent (live record creation), Managed/Unmanaged AI Assets, and the ACL test-probe security agents.
- **Demo-massaged but still live data:** the managed/unmanaged asset split (one name-based override), the "Fairness Monitor Agent" / "Patient Data Agent" labels (map to real computed governance data but aren't actual separate agent records), and the "Secure" panel in `SchedulingAgentCompareModal.tsx` (makes a real call, then shows a scripted refusal instead of the real response).
- **Pure mock, no backend at all:** the `agents` and `nonHumanIdentities`/`accessViolations`/`injectionAlerts`/`auditLog` arrays in `staffGovernanceData.ts`, and the local rule-based hallucination detector in `useCaseDemoData.ts` (though its audit log writes are real).
- No actual LLM API is called anywhere in this codebase — "agent execution" always proxies to ServiceNow's own AI Agent Studio / A2A protocol.
