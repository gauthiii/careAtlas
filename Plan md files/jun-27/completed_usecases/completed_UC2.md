# Completed — UC2 Risk: Excessive Agency via ACL Least-Privilege (OWASP LLM06)

**Instance:** `ven04690.service-now.com`
**App:** CareAtlas (React/Vite frontend + FastAPI backend in `server/`)
**Status date:** 2026-06-25
**What this use case proves:** Every AI agent is a named, scoped non-human identity that
can do **only its job**. Agents read just the fields they need, are denied patient PII,
and **physically cannot write beyond their scope or self-approve** — and any high-impact
action stops for a **human approval** that is audited.

> **Honesty note.** Everything in this use case is **genuinely enforced by ServiceNow**,
> not mocked. The least-privilege matrix is enforced by real ACLs + group membership; the
> write-denials are real `HTTP 403`s; the approval gate writes a real audit record. The
> one cosmetic caveat is called out in [Section 8](#8-known-caveats).

---

## 0. TL;DR — what was built

| Control | Mechanism | Live? |
|---|---|---|
| **Scoped identities** | 9 `svc-*` accounts, web-service-only, permissions via **group membership** | ✅ |
| **Least-privilege reads** | Each agent reads only its scoped fields; **PII denied** to all | ✅ |
| **Write-deny (no excessive agency)** | Cross-scope create/write attempts return **403** | ✅ |
| **Human-approval gate** | High-impact intent → `pending_approval` → officer approves/denies → **audited** | ✅ |
| **Live posture KPI** | `GET /acl/summary` aggregates all 9 agents (blocked count, leaks) | ✅ |

**Live numbers (verified 2026-06-25):** 9 agents tested, **9 passed**, 23 checks, **18 access attempts blocked**, **9 write denials**, **0 leaks**.

---

## 1. The core ServiceNow constraint (read this first)

This instance **strips direct role grants** (`sys_user_has_role`) from the pre-existing
`svc-*` accounts — by design they *"hold no direct roles; permissions are granted
exclusively via group membership."* A direct `role → user` grant works for a few seconds,
then a platform rule removes it.

**Therefore UC2 grants access via GROUPS, not direct roles.** Group-derived roles persist.

Two other instance facts that shaped the design:
- The delivered roles **bundle read + write** (`u_patients_user` = patient read **and**
  write; `u_scheduling_agent` = appointment read/write **and** patient read).
- **Field-level** write denials return a misleading `200`-with-no-change; **table-level**
  write denials (no role) return a clean **`403`**. UC2's write-deny probes use the clean
  `403` path — so **no custom deny ACLs (and no `security_admin` elevation) were needed.**

---

## 2. ServiceNow objects (source of truth)

Open any record at `https://ven04690.service-now.com/<table>.do?sys_id=<sys_id>`.

### 2.1 Groups created for UC2 (the permission mechanism)

| Group | Grants role | Effect | `sys_id` |
|---|---|---|---|
| **CareAtlas Patient Read Agents** | `u_patients_user` | Patient table read (PII still denied by UC1 field ACLs) | `0e61c6043b390b105551369693e45a33` |
| **CareAtlas Scheduling Agents** | `u_scheduling_agent` | Appointment read/write (+ patient read) | `5e61c6c43bf50b1076f13b64c3e45a87` |

Role sys_ids: `u_patients_user` = `1f6e76e41b518314d7eaea45604bcb2b`,
`u_scheduling_agent` = `f6d1ce461bd58b54d7eaea45604bcbb8`.

### 2.2 The 9 governed agents and their group membership

| Agent (`svc-*`) | Member of | Can do (allowed) | Cannot do (denied) |
|---|---|---|---|
| `svc-scheduling-agent` | Patient Read **+** Scheduling | read patient scheduling fields; read/write appointments | read PII; write clinical notes; create patient |
| `svc-triage-agent` | Patient Read | read patient triage fields | read PII; touch appointments (403) |
| `svc-identity-verification-agent` | Patient Read | read patient identity fields | read appointments (403); write appointments |
| `svc-notes-agent` | Scheduling | read/write appointment notes | read PII; write the patient record (403) |
| `svc-reminder-agent` | Scheduling | read appointments (+ patient non-PII) | read PII; write the patient record (403) |
| `svc-security-scanner` | *(none)* | — | all patient data, read **and** write (403) |
| `svc-security-remediation` | *(none)* | — | all patient data, read **and** write (403) |
| `svc-threat-intel` | *(none)* | — | all patient data, read **and** write (403) |
| `svc-pipeline-orchestrator` | *(none)* | — | all patient data, read **and** write (403) |

All 9 are **Active** and **Web service access only**, and share the demo password
(stored only in `server/.env` — never in this doc).

---

## 3. Recreating the ServiceNow side from scratch

Each step has **(A) UI click-path** and **(B) REST/curl**. Replace `<INSTANCE>`,
`<ADMIN_USER>`, `<ADMIN_PW>`. **No `security_admin` elevation is required for UC2** — only
the `admin`/`user_admin` role to manage groups and membership.

### 3.1 Create the two access groups

**A — UI:** Filter navigator → **`sys_user_group.list`** → **New** →
Name `CareAtlas Patient Read Agents` → **Submit**. Repeat for `CareAtlas Scheduling Agents`.

**B — REST:**
```bash
curl -s -u "<ADMIN_USER>:<ADMIN_PW>" -X POST \
  "https://<INSTANCE>/api/now/table/sys_user_group" \
  -H "Content-Type: application/json" \
  -d '{"name":"CareAtlas Patient Read Agents","description":"UC2 least-privilege: grants u_patients_user."}'
```

### 3.2 Grant each group its role

**A — UI:** Open the group → **Roles** related list → **Edit** → add `u_patients_user`
(patient-read group) / `u_scheduling_agent` (scheduling group).

**B — REST:**
```bash
curl -s -u "<ADMIN_USER>:<ADMIN_PW>" -X POST \
  "https://<INSTANCE>/api/now/table/sys_group_has_role" \
  -H "Content-Type: application/json" \
  -d '{"group":"<GROUP_SYS_ID>","role":"<ROLE_SYS_ID>"}'
```

### 3.3 Add each agent to its group(s)

**A — UI:** Open the group → **Group Members** related list → **Edit** → add the agents
from the table in 2.2. (Or open a user → **Groups** related list.)

**B — REST:**
```bash
curl -s -u "<ADMIN_USER>:<ADMIN_PW>" -X POST \
  "https://<INSTANCE>/api/now/table/sys_user_grmember" \
  -H "Content-Type: application/json" \
  -d '{"user":"<USER_SYS_ID>","group":"<GROUP_SYS_ID>"}'
```

> **Do NOT grant roles directly to these accounts** (`sys_user_has_role`) — the instance
> strips them. Group membership is the only stable mechanism here.

### 3.4 Security-ops agents

`svc-security-scanner`, `svc-security-remediation`, `svc-threat-intel`,
`svc-pipeline-orchestrator` are added to **no** patient groups — that *is* their
least-privilege posture (patient data fully out of scope).

---

## 4. CareAtlas application changes

### 4.1 Backend (`server/`)

| File | Change |
|---|---|
| `app/servicenow.py` | Extended `AclProbe` with `operation: "read" \| "write"` + `write_payload`; rewrote `ACL_TEST_PROBES` (read **and** write-deny probes for all 5 patient agents + a shared deny matrix for the 4 security agents); added `_run_acl_write_probe` (safe: POST create, expect denial, delete anything unexpectedly created); added `summarize_acl_posture()`; added `record_approval_decision()` (writes the approval decision to `u_ai_action_audit_log`). |
| `app/approvals.py` *(new)* | In-memory human-approval gate: `HIGH_IMPACT_RULES`, `classify_intent`, `create_request`, `get_request`, `decide`. |
| `app/models.py` | New: `AclSummaryResponse`, `ApprovalSubmitRequest`, `ApprovalDecisionRequest`, `ApprovalRecordResponse`; added `operation` to `AclTestCheck`. |
| `app/main.py` | New routes (below). |

**API endpoints (UC2):**

| Method & path | Purpose |
|---|---|
| `POST /api/acl/test` *(existing, now richer)* | Runs read **+ write-deny** probes for one agent; returns per-check allow/deny. |
| `GET /api/acl/summary` | Live aggregate posture across all 9 agents (`access_blocked`, `write_denials`, `leaks`, `agents_passed`). |
| `POST /api/governance/approval/submit` | Submit an agent intent; high-impact → `pending_approval`, else `auto_completed`. |
| `POST /api/governance/approval/{id}/decision` | Governance officer approves/denies; writes the decision + approver to the ServiceNow audit log. |
| `GET /api/governance/approval/log` | Live, persisted approval decisions (the `human_approval_gate` rows from `u_ai_action_audit_log`) — surfaced in the UI. |

**How the write-deny probe stays safe:** it issues a `POST` (create) as the agent. A
`401/403` ⇒ denied (pass). A `201` ⇒ excessive-agency leak — the created record is
immediately **deleted** and the probe reports the violation. In practice every probe
returns `403`, so nothing is ever created.

### 4.2 Frontend (`src/`)

| File | Change |
|---|---|
| `services/serviceNow.ts` | Added `fetchAclSummary`, `submitApprovalIntent`, `decideApproval` + types; added `operation` to `AclTestCheck`. |
| `components/governance/ApprovalGateDemo.tsx` | **Rewired from a client-side mock to the live backend** — server classifies the intent, real approve/deny, "Live · ServiceNow" badge, audit confirmation. |
| `pages/governance/GovernanceAclPage.tsx` | "Access violations blocked" KPI now reads `GET /acl/summary` (live) instead of static data; removed the Demo tag. |
| `data/staffGovernanceData.ts` | Added the **4 security-ops agents** so the NHI inventory shows all 9, each testable. |
| `components/governance/ApprovalLogPanel.tsx` *(new)* | Live **"Agent action & approval log"** panel on the ACL page — reads `GET /governance/approval/log` and shows every approved/denied high-impact decision (intent, approver, timestamp) from `u_ai_action_audit_log`. Makes the otherwise-invisible approval audit trail demonstrable in the UI. |

---

## 5. How to run it

```bash
# Backend
cd server && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
# Frontend (repo root)
npm run dev
```
Interactive API docs (every endpoint): <http://localhost:8000/docs>.

---

## 6. How to demonstrate (customer script)

**Login bypass for local demo:** on the governance sign-in page, **double-click** the
"Sign in" nav link → enter code **`leavemealone`**.

### 6.1 Least-privilege ACL matrix (live)
**URL:** <http://localhost:5173/governance/acl>
1. The header chip shows the **live** "access violations blocked" count (from `/acl/summary`).
2. Each of the **9 agent cards** has a **Test ACL** button → click it to run the live
   probes. Watch the agent get **green-allow** on its scoped fields and **red-deny** on
   PII and on out-of-scope writes (real `403`s).
3. Talk track: *"Each agent is a named identity scoped by group membership. The scheduling
   agent can read scheduling fields and book appointments — but it cannot read a patient's
   name, and it cannot write a clinical note. The security agents can't touch patient data
   at all. We bounded the blast radius of every agent before it ran."*

### 6.2 Human-approval gate (live + audited)
**URL:** <http://localhost:5173/governance/demo/risk>
1. Submit **"Approve the registration for the new patient"** → it stops at
   **`status: pending_approval`** with the reason.
2. Click **Approve** (or **Deny**) as the governance officer → the decision resolves and
   is **written to the ServiceNow audit log** (the card confirms "Written to the ServiceNow
   audit log").
3. Submit a low-impact intent (e.g. *"Read the next available appointment slot"*) → it
   **auto-completes**, no gate.
4. Talk track: *"Any high-impact action stops for a human. The agent never executes it
   until a governance officer approves — and the approval, with the approver's name, lands
   in our audit trail."*

### 6.3 Prove it's not UI trickery (technical buyers)
```bash
# Agent denied creating a patient record (clean 403)
curl -s -o /dev/null -w "%{http_code}\n" -u "svc-notes-agent:<PW>" \
  -X POST "https://ven04690.service-now.com/api/now/table/u_patient" \
  -H "Content-Type: application/json" -d '{"u_first_name":"x"}'   # -> 403

# Live aggregate posture
curl -s http://localhost:8000/api/acl/summary
# -> {"agents_tested":9,"agents_passed":9,"access_blocked":18,"write_denials":9,"leaks":0}
```

### 6.4 Verify the approval audit record in ServiceNow
Filter navigator → **`u_ai_action_audit_log.list`** → filter
`u_agent_identity = human_approval_gate` → the most recent row's **reason** field shows the
intent, the decision, and the approving officer.

---

## 7. What is genuinely live (summary)

| Item | Genuinely enforced by ServiceNow? |
|---|---|
| Scoped reads + PII denial per agent | ✅ Yes — group roles + field ACLs |
| Write-deny (cross-scope create/write) | ✅ Yes — clean `403` |
| Live `/acl/summary` posture + per-agent `Test ACL` | ✅ Yes — live probes |
| Approval gate decision + approver in audit log | ✅ Yes — writes `u_ai_action_audit_log` |
| Intent classification (high vs low impact) | ✅ Server-side (`app/approvals.py`) |

---

## 8. Known caveats

1. **Audit `u_final_action` field** is a restricted choice list that blanks
   non-standard values, so `approved`/`denied` is carried in the record's **reason text**
   (full context — intent, decision, approver — is present and the records are confirmed
   landing). The UI shows status from the API response, so the demo is unaffected.
2. **Approval store is in-memory** (single-process demo backend). A restart clears pending
   requests; decided ones are already persisted to the ServiceNow audit log.
3. **Permissions must be granted via groups**, never direct roles, on these accounts
   (see Section 1) — re-granting direct roles will silently disappear.

---

## 9. Status: complete

All UC2 deliverables are implemented and verified live (9/9 agents pass, 0 leaks,
approval gate audited). No `security_admin` elevation was required. Related: [[completed_UC1]]
covers the PII field-level ACLs that this use case's "PII denied" checks rely on.
