# Use Case 2 — Risk: Excessive Agency via ACL Least-Privilege

**Category:** Risk · **OWASP:** LLM06 · **Demo date:** 2026-06-26
**Instance:** `ven04690.service-now.com` · **App:** CareAtlas (`server/app/*`, `src/*`)
**Live-verified:** 2026-06-23 (read-only curl with `server/.env`, user `interface_gautham`)

---

## 1. Talk to me like a baby — what is this?

Each robot (AI agent) is given **its own tiny keyring** — not the master key to the whole hospital.

- The **scheduling robot** can book an appointment… and that's it.
- It **cannot** peek at a patient's name or phone (PII).
- It **cannot** scribble in a doctor's clinical note.
- And if it ever wants to do something **big** (like approve a registration), it must **stop and raise its hand** so a human says "yes" first.

So even if a robot goes crazy, the mess it can make is **tiny** — we drew the box around it *before* it ever ran. That's "bounding the blast radius."

---

## 2. What problem we are solving

**Excessive agency = too many permissions + writes with no human + acting beyond the job.**
We stop a robot from reading PII it shouldn't, writing clinical data, or self-approving.

---

## 3. The real things on the instance (verified live, 2026-06-23)

**9 scoped `svc-*` service accounts exist** (part of `sys_user` = 910 rows):
`svc-identity-verification-agent`, `svc-triage-agent`, `svc-scheduling-agent`, `svc-notes-agent`, `svc-reminder-agent`, `svc-pipeline-orchestrator`, `svc-security-scanner`, `svc-security-remediation`, `svc-threat-intel`.

`sys_security_acl` ~78,932 — the enforcement layer is present.

**Already in code** — `ACL_TEST_PROBES` in [server/app/servicenow.py:214](../server/app/servicenow.py#L214) models **5 patient-facing accounts** with allow/deny probes:
- `svc-identity-verification-agent` — allow identity fields, **deny** `u_appointment`.
- `svc-scheduling-agent` — allow scheduling fields, **deny** PII (`u_first_name`,`u_last_name`,`u_email`,`u_phone`,`u_date_of_birth`,`u_gender`,`u_ethnicity`).
- `svc-reminder-agent` — allow `u_appointment`, **deny** `u_patient`.
- `svc-notes-agent` — allow note fields, **deny** PII.
- `svc-triage-agent` — allow triage fields, **deny** PII.

The 4 security-ops accounts (`svc-security-scanner`, `svc-security-remediation`, `svc-threat-intel`, `svc-pipeline-orchestrator`) have **no probes yet**.

---

## 4. Steps on the ServiceNow instance

1. **Create the real deny ACLs** so the allow/deny matrix in `ACL_TEST_PROBES` passes for real, not just on paper:
   - For each agent account, **field `read` ACLs** that deny PII on `u_patient`.
   - **Table `write` ACLs** denying cross-table writes (e.g. `svc-scheduling-agent` denied `write` on `u_appointment.u_notes`; `svc-notes-agent` denied `write` on `u_patient`).
2. **Confirm allow paths still work** — each agent can read its own allowed fields (so the green "allow" rows pass).
3. **Model a human-approval step** — in **Flow Designer** (or an AICT life-cycle task), add a branch that **pauses** A2A execution for high-impact intents (e.g. "approve registration", "write clinical note") until a governance officer approves.

---

## 5. Steps on the CareAtlas app (document only)

> Net-new ≈ 1–2 days. ~70% is already scaffolded.

- **Backend** — [server/app/main.py](../server/app/main.py):
  - `POST /acl/test` already exists ([main.py:598](../server/app/main.py#L598), backed by `test_service_account_acl` at [servicenow.py:2173](../server/app/servicenow.py#L2173)). **Add denied-WRITE probes** (note write, registration approve) to `ACL_TEST_PROBES`.
  - In `POST /agents/execute` ([main.py:161](../server/app/main.py#L161)): add an **approval-required branch** returning `status=pending_approval` for high-impact intents.
  - Add `POST /agents/execute/{id}/approve` for the governance officer (sibling of the existing `GET /agents/execute/{request_id}` at [main.py:196](../server/app/main.py#L196)).
- **Frontend** — [src/pages/governance/GovernanceAclPage.tsx](../src/pages/governance/GovernanceAclPage.tsx): already shows green-allow / red-deny per check. **Add the deny-write rows**; wire the **"Access violations"** KPI to real denied-probe counts.
- **Frontend** — A2A chat / [src/components/AiAssistantWidget.tsx](../src/components/AiAssistantWidget.tsx): show an **"Action requires approval"** state with an **Approve** button (governance role only, via [GovernanceAuthContext.tsx](../src/contexts/GovernanceAuthContext.tsx)).

---

## 6. Curl proof (run live before the demo)

```bash
set -a; . ./server/.env; set +a
SNOW="$SNOW_INSTANCE"; U="$SNOW_USERNAME"; P="$SNOW_PASSWORD"

# Scoped service accounts exist
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sys_user?sysparm_query=user_nameSTARTSWITHsvc-&sysparm_fields=user_name,name"

# Prove scheduling account is DENIED PII (expect empty/denied fields) — needs svc password
curl -s -u "svc-scheduling-agent:$PW" "https://$SNOW/api/now/table/u_patient?sysparm_fields=u_first_name,u_email&sysparm_limit=1"
```

---

## 7. The demo moment

The ACL page is **green-allow / red-deny** exactly matching the matrix. We ask the scheduling agent for a patient name → **denied**. We trigger a high-impact action → it **stops at "pending approval"**; a governance officer clicks **Approve**; the decision log records **who approved**.
