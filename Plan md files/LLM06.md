# LLM06 — Excessive Agency: Demonstrate & Govern with ServiceNow AICT + AIRC

**Scope:** CareAtlas Use Case 3, Risk B only. End-to-end, from-scratch implementation plan.
**Instance:** `ven04690.service-now.com` · **App:** CareAtlas (React/Vite + FastAPI `server/app/*`)
**Status:** Plan only. Verified against the live instance, the backend code, and ServiceNow Zurich/Australia docs (MCP `servicenow-ai-docs`).

---

## 1. What is this risk?

**OWASP LLM06 — Excessive Agency.** Harm that occurs when an LLM-based system is granted **more capability, permission, or autonomy than its task requires**, so that a faulty, manipulated, or hallucinating agent can take actions it never should. Three contributing factors:

- **Excessive functionality** — the agent can call tools/tables beyond its job (e.g. a scheduling agent that can also write clinical notes or approve registrations).
- **Excessive permissions** — the agent's identity holds broad rights (e.g. read full patient PII, write/delete on tables it only needs to read).
- **Excessive autonomy** — high-impact actions execute with **no human approval** and no audit.

In an **agentic** platform like ServiceNow (98 live AI agents acting over real tables via A2A), this is the highest-leverage risk: the agents are wired to act, not just chat.

## 2. What is the impact?

In the CareAtlas clinical context, unchecked agency means:

- **Patient safety** — a manipulated triage/scheduling agent silently escalates or reschedules appointments, or alters clinical summary notes.
- **Privacy breach** — an agent with over-broad read can pull full PII (name, DOB, email, phone, insurance) it doesn't need → also feeds LLM02 disclosure.
- **Integrity / fraud** — an agent auto-approves registrations or writes records with no human gate or attestation.
- **Compliance** — violates least-privilege and separation-of-duties expected under HIPAA/GDPR and the EU AI Act human-oversight requirement; maps to AIRC risk statements **Unauthorized Access to AI Models** and **Failure to Address Ethical Standards**.
- **No accountability** — without an audit trail, you can't prove who/what took an action.

## 3. Demonstration with our existing agents

These agents and identities **already exist on `ven04690`** (verified). The demo is a tight before/after on one over-privileged agent.

**Cast (live agents in `sn_aia_agent`):**
- `Schedule Appointment DG1` / `svc-scheduling-agent` — *should* only read scheduling fields + write the decision log.
- `Verify Patient DG1` / `svc-identity-verification-agent` — *should* read identity/registration status only.
- `Summary Notes Agent` / `svc-notes-agent` — *should* read appointments + write `u_summary_notes`.
- `Patient Data Agent` and `Bad Patient Agent` — the over-privileged / rogue agents we use as the "before" villain.
- `Access Governance DG1` — the governance agent that surfaces the violation.

**The scenario — "the scheduling agent that does too much":**

1. **Before (excessive agency):** Drive `svc-scheduling-agent` to (a) **read full patient PII** on `u_patient` (`u_first_name`, `u_email`, `u_date_of_birth`) and (b) **write a clinical note** to `u_summary_notes`, and (c) **approve a registration** (`u_patient.u_registration_status=approved`). With no ACLs, all three succeed → that's the breach.
2. **Mitigation:** scope the identity (least-privilege role + ACLs), deny the PII fields and the cross-table write, and put a **human-approval gate** in front of high-impact A2A actions.
3. **After:** the same three attempts now → **PII fields stripped**, **note write 403**, **approval action paused for a governance officer**. Every allowed action lands in `u_ai_decision_log`.

This reuses the existing **ACL test** page (it already renders allow/deny rows for these exact accounts) and the **Access violations** KPI on the Control Tower dashboard.

## 4. End-to-end lifecycle (the spine the demo follows)

Mapped to the ServiceNow **AI Governance Life Cycle** (AICT = system of record; AIRC = independent risk/control governance; *life-cycle progression in AICT depends on AIRC decisions*):

| Stage | LLM06 activity | Where |
|-------|----------------|-------|
| **1. Intake / Inventory** | Register `Schedule Appointment DG1` as a governed AI system; it appears in the AI inventory. | AICT (`sn_aia_agent` / `alm_ai_system_digital_asset`) |
| **2. Assess** | Run the **AI impact assessment**; Post-Assessment Actions attach risk **Unauthorized Access to AI Models** + control **"Least-privilege NHI + human approval gate."** | AIRC |
| **3. Build / Validate** | Implement scoped service account + ACLs + approval gate; complete the **control attestation**. | Instance + App |
| **4. Pre-deployment Review** | AIRC manager (`sn_grc_ai_gov.ai_risk_and_compliance_manager`) **blocks** while the excessive-agency risk is open, **approves** once mitigated. | AIRC → AICT state flip |
| **5. Monitor** | ACL denials + paused approvals flow as governance signals; a repeat breach opens an **AI Case**. | AICT/AIRC |

---

## 5. Prerequisites

1. **Roles:** an admin able to create/modify `sys_user`, roles (`sys_user_role`), and ACLs (`sys_security_acl`); and `sn_grc_ai_gov.ai_risk_and_compliance_manager` for the approve/block step. **Confirm `interface_gautham` has these or get an admin.**
2. **Shared service-account password (code-level fact):** `_run_acl_probe` authenticates as the `svc-*` username **using `settings.snow_password`** (`server/app/servicenow.py:2020`). So every `svc-*` account used by `/acl/test` **must have the same password as `SNOW_PASSWORD`** (`Account@123`) for live ACL enforcement to be testable. Set this on each account, or refactor to per-account secrets (see §7, optional).
3. **The 5 `svc-*` accounts exist** (verified) — no need to create them; they need **roles + ACLs attached** and the password aligned.
4. **Tables in play exist:** `u_patient`, `u_appointment`, `u_summary_notes`, `u_ai_decision_log`, `sn_aia_agent` — all verified OK.
5. **A2A OAuth** already configured (`SNOW_A2A_CLIENT_ID/SECRET`) for `/agents/execute`.
6. **(For the approval gate)** decide where pending-approval state lives — a new lightweight table `u_agent_action_approval` or reuse `sn_grc_issue`/an existing approval table.

---

## 6. What is already done (do NOT rebuild — extend)

**Backend (`server/app/servicenow.py`, `main.py`):**
- `ACL_TEST_PROBES` — the full allow/deny matrix for all five `svc-*` accounts, including **denied PII field** probes with `inspect_denied_fields=True` (strips fields and checks they're absent). Lines ~214–315.
- `test_service_account_acl()` + `_run_acl_probe()` + `_inspect_denied_field_response()` — run the probes live as the service account and classify allowed/denied/inconclusive/error. Lines ~1975–2123.
- `POST /acl/test` route (`main.py:495`).
- A2A execution: `execute_agent()` (line ~2126), `POST /agents/execute` (`main.py:152`), `GET /agents/execute/{request_id}`, callback `/a2a/callback/{agent_sys_id}`.
- Decision log: `fetch_ai_decision_log()` + `GET /governance/decision-log`.

**Frontend (`src/pages/governance/*`, `src/data/staffGovernanceData.ts`):**
- `GovernanceAclPage` — renders per-account NHI cards (permissions, ACL rules, roles) and a **Test ACL** button calling `/acl/test`, with a simulated CLI of request/response. Service accounts modeled in `staffGovernanceData.ts` (e.g. `svc-scheduling-agent` roles `role_scheduling_read_patient`, `role_scheduling_write_decision_log`).
- `GovernanceDashboardPage` — KPI strip already includes **Access violations**.
- `GovernanceAiAgentsPage` — A2A chat drawer per agent.

**Instance:** the five `svc-*` identities exist; the CareAtlas DG1 agents exist.

**Net: ~70% scaffolded.** The gap is real ACLs on the instance + the human-approval gate + wiring the violations KPI to real probe counts.

## 7. What needs to be done in the CODE

**Backend — `server/app/servicenow.py` / `main.py`:**

1. **Add deny-write probes** to `ACL_TEST_PROBES` for the over-privileged scenario, e.g. for `svc-scheduling-agent`:
   - Denied **write** to `u_summary_notes` (expected `denied`).
   - Denied **write/update** `u_patient.u_registration_status` (expected `denied`).
   This needs a small extension to `AclProbe` (add `method: "GET"|"POST"|"PATCH"` and have `_run_acl_probe` issue a guarded write that expects 403). Keep writes harmless (invalid/minimal payload so a 403 is the only outcome that matters).
2. **Approval gate on `/agents/execute`:** classify the requested intent; for **high-impact** intents (note write, status approve, delete) return `status="pending_approval"` and create an approval record instead of executing. Add:
   - `POST /agents/execute/{request_id}/approve` and `/reject` (governance role) → on approve, resume the A2A call; on reject, log and stop.
   - Persist pending actions (new `u_agent_action_approval` table or equivalent) with agent, intent, payload, requester, status, approver.
3. **Live violations feed:** add `fetch_access_violations()` (counts of failed/denied probes + rejected approvals) and `GET /governance/access-violations` so the dashboard KPI is real, not static.
4. **Audit every allowed agent action** into `u_ai_decision_log` (or a sibling action-audit table) with the acting identity + approver.

**Frontend:**

5. `GovernanceAclPage` — render the new **deny-write** rows (red when correctly denied).
6. `GovernanceAiAgentsPage` — when `/agents/execute` returns `pending_approval`, show an **"Action requires approval"** state + Approve/Reject buttons (governance auth only).
7. `GovernanceDashboardPage` — bind **Access violations** KPI to `GET /governance/access-violations`.
8. `staffGovernanceData.ts` — update `svc-scheduling-agent` etc. to reflect the final least-privilege role/ACL list so the UI matches the instance.

**Optional refactor:** move off the shared-password model (§5.2) to per-account credentials/OAuth for the probes — better security story, but not required for the demo.

## 8. What needs to be done in the INSTANCE

1. **Roles** (`sys_user_role`) — one least-privilege role per agent, matching `staffGovernanceData.ts`, e.g.:
   - `role_scheduling_read_patient` (read scheduling fields only), `role_scheduling_write_decision_log`.
   - `role_notes_read_appointment`, `role_notes_write_summary`.
   - `role_identity_read_patient`, `role_identity_write_status`.
   - `role_reminder_read_appointment` (read-only), `role_triage_read_session`.
2. **Assign roles** to the matching `svc-*` accounts (grant only its own role; **remove `admin`/broad roles**).
3. **ACLs** (`sys_security_acl`):
   - **Field ACLs** on `u_patient` denying PII fields (`u_first_name`, `u_last_name`, `u_email`, `u_phone`, `u_date_of_birth`, `u_insurance_id`) to scheduling/notes/triage roles.
   - **Table/operation ACLs** denying `write` on `u_summary_notes` to the scheduling role; denying `write` on `u_patient.u_registration_status` to scheduling/triage.
   - Allow only the specific read fields each role needs.
4. **Align passwords** — set each `svc-*` password to `SNOW_PASSWORD` (per §5.2) so `/acl/test` enforces for real.
5. **AIRC governance objects:**
   - Run the **AI impact assessment** on `Schedule Appointment DG1`; via Post-Assessment Actions attach risk **Unauthorized Access to AI Models** + a **control** = least-privilege NHI + approval gate (`sn_compliance_control`), tied to a policy (`sn_compliance_policy`, e.g. HIPAA).
   - Add a **control attestation** task; have the AIRC manager set the **pre-deployment** decision (block → approve).
6. **(Optional) Automation rule** (`sn_ai_governance_automation_rule`): on repeated denied-write attempts, open an **AI Case**.

## 9. Verification (curl) — proof the mitigation holds

```bash
SNOW=ven04690.service-now.com; ADMIN=interface_gautham:Account@123; SVC=svc-scheduling-agent:Account@123

# (a) PII is stripped for the scheduling identity
curl -s -u "$SVC" "https://$SNOW/api/now/table/u_patient?sysparm_fields=u_first_name,u_email,u_date_of_birth&sysparm_limit=1"
#   -> expect record without those fields (field ACL denies)

# (b) cross-table write is forbidden
curl -s -o /dev/null -w "%{http_code}\n" -X POST -u "$SVC" \
  "https://$SNOW/api/now/table/u_summary_notes" -H "Content-Type: application/json" -d '{}'
#   -> expect 403

# (c) registration approval is forbidden
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH -u "$SVC" \
  "https://$SNOW/api/now/table/u_patient/<sys_id>" -d '{"u_registration_status":"approved"}'
#   -> expect 403

# (d) the identity holds only its scoped role
curl -s -u "$ADMIN" "https://$SNOW/api/now/table/sys_user_has_role?sysparm_query=user.user_name=svc-scheduling-agent&sysparm_fields=role.name"
```
Then in-app: `POST /acl/test {"service_account":"svc-scheduling-agent"}` → all rows **passed**; the A2A high-impact action returns `pending_approval`.

## 10. How to show it at the demo (5–6 min)

1. **Frame (30s):** "98 agents act on real patient tables. Excessive agency = an agent that can do more than its job. Watch the scheduling agent overreach, then watch governance contain it."
2. **Before — the breach (90s):** run the curl trio (a)/(b)/(c) as `svc-scheduling-agent` **before ACLs** → PII returned, note written, registration approved. On the ACL page the rows are **red (failed)**; Access-violations KPI ticks up.
3. **Govern (90s):** open AIRC → the **AI impact assessment** flagged **Unauthorized Access**; control = least-privilege + approval gate; AIRC manager has it **blocked** for deployment.
4. **Mitigate (60s):** apply the scoped role + ACLs (pre-staged). Re-run **Test ACL** → all rows **green**; re-run curl → fields stripped, writes 403.
5. **Autonomy gate (60s):** in the A2A chat, ask `Schedule Appointment DG1` to write a note → **"Action requires approval"**; governance officer **Approves** → executes and **lands in the decision log** with the approver's identity.
6. **Close (30s):** AIRC manager flips **block → approve**; AICT life-cycle state advances. One sentence: *least privilege + human-in-the-loop + audit = excessive agency contained.*

---

## 11. Build order (fastest path)

- **Phase 1 (instance, highest ROI):** roles + ACLs + password alignment on `svc-scheduling-agent` and `svc-notes-agent`. → makes existing `/acl/test` go green/red for real. *Demoable on its own.*
- **Phase 2 (code):** deny-write probes + violations endpoint + KPI wiring.
- **Phase 3 (code):** approval gate on `/agents/execute` + approve/reject + audit.
- **Phase 4 (AIRC):** impact assessment, risk/control, attestation, block→approve.
- **Phase 5:** polish — ACL page deny-write rows, A2A approval UI, Demo-page "try the breach" box.

## 12. Open items to confirm (no assumptions)

1. Does the demo admin hold role-admin + `ai_risk_and_compliance_manager`? (gates §8.5)
2. OK to set all `svc-*` passwords to `SNOW_PASSWORD`, or do per-account secrets (refactor §7)?
3. Where to persist pending approvals — new `u_agent_action_approval` table or reuse an existing approval/issue table?
4. Are any `svc-*` accounts currently holding broad roles (`admin`) that must be removed first? (check `sys_user_has_role` before scoping)
5. Is automated AI-Case creation (§8.6) in scope for the demo, or stretch?

---

*All agents, service accounts, tables, roles, endpoints, and the shared-password behavior above were verified on the live `ven04690` instance or in the CareAtlas codebase on 2026-06-19. Items in §12 are flagged to-confirm, not assumed.*
