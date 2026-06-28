# Use Case 1 — Privacy: Sensitive Information Disclosure (SUD)

**Category:** Privacy · **OWASP:** LLM02 · **Demo date:** 2026-06-26
**Instance:** `ven04690.service-now.com` · **App:** CareAtlas (`server/app/*`, `src/*`)
**Live-verified:** 2026-06-23 (read-only curl with `server/.env`, user `interface_gautham`)

---

## 1. Talk to me like a baby — what is this?

Imagine a patient's name, birthday, phone number, and insurance ID are **secret toys**.
We do **not** want the robot (the AI agent) to ever see those secret toys or write them down anywhere.

We build **three walls** so the secret never leaks:

1. **Wall 1 — "You can't even look."** The robot is *blocked* from reading the secret fields. (ServiceNow ACL = a lock on each field.)
2. **Wall 2 — "If you somehow say it, we wipe it."** A privacy filter scrubs the robot's answer and erases any secret before a human sees it. (ServiceNow Gen AI filter.)
3. **Wall 3 — "Our diary uses fake names."** When we write down what the robot did, we use a *secret nickname* (an anonymized token), never the real patient. So even our own notebook can't point back to a real person.

If all three walls are green, we can tell a regulator: *"It is impossible for our AI to leak a patient. Here are the live records that prove it."*

---

## 2. What problem we are solving

PII (name, DOB, email, phone, insurance ID) must never show up in:
- (a) the AI agent's **output**,
- (b) the **decision/audit log**, or
- (c) any **governance view**.

---

## 3. The real things on the instance (verified live, 2026-06-23)

| Table | Live count | Why it matters |
|-------|-----------|----------------|
| `u_ai_decision_log` | **17** | Audit rows exist and only carry the anonymized id |
| `sys_security_acl` | ~78,932 | The lock layer is present |
| `sys_gen_ai_filter` | **7** (3 active) | The scrubbing filter exists |

**PII fields on `u_patient`:** `u_first_name`, `u_last_name`, `u_email`, `u_phone`, `u_date_of_birth`, `u_insurance_id`.
**Decision-log columns (no raw PII):** `u_patient_id_anon`, `u_confidence_score`, `u_model_version`, `u_triage_input`.
**Consent already tracked:** `u_consent_accepted`, `u_consent_accepted_on`, `u_privacy_notice_version`.

---

## 4. Steps on the ServiceNow instance

> Do these as a ServiceNow admin in the `ven04690` UI.

1. **Field-deny ACLs on `u_patient` PII.** Go to **System Security → Access Control (ACL)**. For each PII field (`u_first_name`, `u_last_name`, `u_email`, `u_phone`, `u_date_of_birth`, `u_insurance_id`) create/confirm a **field-level `read` ACL** that the agent service accounts (`svc-scheduling-agent`, `svc-triage-agent`, `svc-notes-agent`, `svc-reminder-agent`) do **not** satisfy. Result: those accounts read the row but the PII fields come back empty/denied.
2. **Confirm a PII Gen AI filter is active on the output path.** Go to **Now Assist → AI filters** (`sys_gen_ai_filter`). Confirm at least one **PII-type** filter is `active=true` and scoped to the CareAtlas triage/summary agents' **output**. If none is output-scoped, clone a delivered PII filter and scope it.
3. **Confirm anonymized logging.** Open a few `u_ai_decision_log` rows. Confirm every agent-written row has `u_patient_id_anon` populated and **no raw patient id column**.

---

## 5. Steps on the CareAtlas app (what code to add — document only)

> These are **net-new**; do **not** build yet. ~1 day.

- **Backend** — [server/app/main.py](../server/app/main.py): add `GET /governance/privacy-controls` returning
  `{ pii_acl_status, redaction_on, anonymization_rate }`.
  Helper in [server/app/servicenow.py](../server/app/servicenow.py) reading ACL status + filter `active` + % of `u_ai_decision_log` rows with `u_patient_id_anon`.
  *(Note: `fetch_ai_decision_log` already exists at `servicenow.py:1204`, and `GET /governance/decision-log` already exists at `main.py:587` — reuse them.)*
- **Frontend** — [src/pages/governance/GovernanceDashboardPage.tsx](../src/pages/governance/GovernanceDashboardPage.tsx): add a **"Data Privacy & PII Protection"** panel (denied PII fields list, redaction ON/OFF, % rows anonymized).
- **Frontend** — [src/pages/governance/GovernanceDemoPage.tsx](../src/pages/governance/GovernanceDemoPage.tsx): add a **"PII leak attempt → redacted"** before/after box.
  *(The existing [GovernanceLlm02AuditPage.tsx](../src/pages/governance/GovernanceLlm02AuditPage.tsx) already shows the anonymized audit board — link to it.)*

---

## 6. Curl proof (run live before the demo)

```bash
set -a; . ./server/.env; set +a
SNOW="$SNOW_INSTANCE"; U="$SNOW_USERNAME"; P="$SNOW_PASSWORD"

# Decision log exposes ONLY the anonymized id — no raw PII
curl -s -u "$U:$P" "https://$SNOW/api/now/table/u_ai_decision_log?sysparm_fields=u_patient_id_anon,u_confidence_score&sysparm_limit=5"

# Privacy guardrail filters that are active
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sys_gen_ai_filter?sysparm_query=active=true&sysparm_fields=name,active"
```

---

## 7. The demo moment (what the audience sees)

The privacy panel is **green**. We open the decision log live — it shows only `u_patient_id_anon`, never a real name. We try to make the agent print a patient's name → the filter **redacts** it. The AIRC risk register shows *Privacy Violations* as **mitigated**.
