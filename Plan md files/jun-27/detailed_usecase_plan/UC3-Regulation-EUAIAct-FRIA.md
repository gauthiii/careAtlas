# Use Case 3 — Regulation: EU AI Act Conformity + FRIA Classification

**Category:** Regulation · **Reg:** EU AI Act · **Demo date:** 2026-06-26
**Instance:** `ven04690.service-now.com` · **App:** CareAtlas (`server/app/*`, `src/*`)
**Live-verified:** 2026-06-26 (read-only curl with `server/.env`, user `interface_gautham`)
**Current status:** **Not demo-ready**. The target Triage AI system exists, but RAM classification is still `To be determined`, no assessment task is attached, no risk assessment result is mapped, and no FRIA is attached.

---

## 1. Talk to me like a baby — what is this?

A government rule (the **EU AI Act**) says: *"Tell me how dangerous each AI is, and prove it doesn't hurt people's rights."*

Old way: hire a consultant, run a workshop, make a slide deck. Slow and squishy.

Our way: we open the **AI system record** in ServiceNow and it already shows:
- **A risk tier** — High / Medium / Low — that the **platform calculated by itself** from a questionnaire (RAM = Risk Assessment Methodology).
- **A FRIA** (Fundamental Rights Impact Assessment) — the proof that we checked "could this hurt a patient's rights?"

So when the regulator asks "is this triage robot high-risk and where's your evidence?" we don't schedule a meeting — we **point at the live record**.

---

## 2. What problem we are solving

Unknown/undocumented regulatory exposure; no defensible high-risk classification; no fundamental-rights evidence for patient-facing agents.

---

## 3. The real things on the instance (verified live, 2026-06-26)

| Table | Live count | Why it matters |
|-------|-----------|----------------|
| `sn_grc_ai_gov_ai_system` | **111** | Governed AI systems exist to classify |
| `sn_smart_imp_auto_assessment_action` | **54** | Post Assessment Actions auto-map risk/controls |
| `sn_smart_imp_auto_rule` | **32** | Automation rules that drive the mapping |
| `sn_risk_definition` | **661** | Risk statements exist, including UC3/UC6 demo risks |

**Delivered templates to publish (ship in Draft):** *AI impact assessment for EU AI Act conformity assessment*, *EU AI Act Conformity Assessment*, *FRIA (Fundamental Rights Impact Assessment)*, *High-risk AI assessment questionnaire*.

### 3.1 Live UC3 audit result (verified 2026-06-26)

**Target AI system:** `Triage Appointment DG1` (`sn_grc_ai_gov_ai_system` sys_id `cdf56dc91bd14b14d7eaea45604bcb6e`)

| Check | Verified result | Demo impact |
|------|-----------------|-------------|
| AI system record exists | Yes, state `Assess` | Good starting point |
| RAM classification | `To be determined` | Not acceptable for UC3 demo |
| Entity map | 1 mapping exists | Asset is linked to an entity |
| Assessment tasks | 0 | Conformity/FRIA flow not attached to target |
| Risk assessment results | 0 | No closed-complete risk result mapped to target |
| Post Assessment Actions | 54 total | Automation framework exists |
| FRIA Post Assessment Actions | 0 active, 48 inactive | FRIA automation is not demo-ready |
| Current user roles | `sn_grc_ai_gov.ai_risk_and_compliance_business_user`, `sn_ai_asset_mgmt.ai_asset_owner` | Missing manager/admin/analyst role for publishing/review/closure |

**RAM properties verified:**
- `sn_grc_ai_gov.aisystem_primary_ram` = `977ffce453b25210762cddeeff7b12b5`
- `sn_grc_ai_gov.ai_system_automated_risk_classification_asmt_ram` = `6a6b8078ff61f610c920ffffffffff82`
- `sn_risk_advanced.migrate_to_advanced_risk` = `true`

**Access limitation:** direct `sn_smart_asmt_template` record query returned HTTP `403` for `interface_gautham`, so template publication cannot be proven with this user over Table API. Verify in Assessment Workspace with `sn_grc_ai_gov.ai_risk_and_compliance_manager`.

---

## 4. Steps on the ServiceNow instance

> Do these as `ai_risk_and_compliance_manager`.

1. **Use the right ServiceNow role.** `interface_gautham` currently has business-user and asset-owner access, but not the manager/admin/analyst role needed to prove or complete the workflow. Use or grant:
   - `sn_grc_ai_gov.ai_risk_and_compliance_manager`
   - `sn_grc_ai_gov.ai_risk_and_compliance_admin` if properties/templates/actions must be changed
   - `sn_grc_ai_gov.ai_risk_and_compliance_analyst` for final assessment review/closure
2. **Verify EU AI Act content activation.** In AI Risk and Compliance Workspace → Unified content management, confirm EU Artificial Intelligence Act is activated and required citations are selected. The read-only Table API search did not return authority/citation rows for `interface_gautham`.
3. **Publish the templates.** In the **Assessment Workspace**, publish *AI impact assessment*, *AI impact assessment for EU AI Act conformity*, *EU AI Act Conformity Assessment*, *FRIA*, and *High-risk AI assessment questionnaire* as applicable. Direct Table API template verification returned HTTP `403` for `interface_gautham`.
4. **Confirm RAM is wired.** The RAM property sys_ids exist. Confirm the referenced RAM records are published/active and are the intended RAMs for AI-system classification.
5. **Review FRIA automation.** FRIA Post Assessment Actions are present but currently `active=false` for 48 actions. Enable or republish the required FRIA automation rules before relying on automatic mapping.
6. **Run the target agent end-to-end.** Take `Triage Appointment DG1` through **Intake → Use & Purpose → EU AI Act conformity assessment → RAM classification → FRIA if High-risk**.
7. **Close complete after review.** Have the AIRC analyst review prescribed risks/controls and mark the assessment **Closed complete**. Per docs, risks and controls are generated and mapped only after this state.
8. **Verify target evidence.** The target must show:
   - risk classification is no longer `To be determined`
   - assessment task count is greater than 0
   - risk assessment result count is greater than 0
   - FRIA is attached if classified High-risk
   - mapped risks include fundamental-rights risks such as `Algorithmic Bias and Discrimination` and `Privacy Violations`

> **⚠️ Prereq to confirm — no assumption:** risk-based classification at intake needs AIRC **v22.0.3+** and the **"Migrate to Advanced Risk Assessments"** property. **That migration is one-way.** Confirm version + the manager role on `interface_gautham` **before** the demo.

---

## 5. Steps on the CareAtlas app (document only)

> Implemented 2026-06-26 as a **read-only live evidence surface**. No ServiceNow write path was added.

- **Backend** — [server/app/servicenow.py](../server/app/servicenow.py) now reads UC3 evidence from live ServiceNow tables and returns readiness flags via `/api/governance/regulation/evidence`.
- **Frontend** — [src/pages/governance/demo/RegulationPage.tsx](../src/pages/governance/demo/RegulationPage.tsx) now shows live ServiceNow readiness for `Triage Appointment DG1`.
- **Badge behavior** — [src/components/governance/RegulatoryClassificationBadge.tsx](../src/components/governance/RegulatoryClassificationBadge.tsx) no longer guesses classification from agent names. Missing live data renders as `Unverified`.

---

## 6. Curl proof (run live before the demo)

```bash
set -a; . ./server/.env; set +a
SNOW="$SNOW_INSTANCE"; U="$SNOW_USERNAME"; P="$SNOW_PASSWORD"

# Governed AI systems exist
curl -s -u "$U:$P" "https://$SNOW/api/now/stats/sn_grc_ai_gov_ai_system?sysparm_count=true"

# Post Assessment Actions present (auto-generate risk/control from answers)
curl -s -u "$U:$P" "https://$SNOW/api/now/stats/sn_smart_imp_auto_assessment_action?sysparm_count=true"

# Live CareAtlas API evidence check
curl -s "http://127.0.0.1:8000/api/governance/regulation/evidence?query=Triage%20Appointment%20DG1"
```

---

## 7. The demo moment

We open the Triage Agent's AI system record → it shows the **EU AI Act tier** the platform calculated and the **FRIA attached**. The risk register shows the **auto-mapped fundamental-rights risks**. Full regulatory audit trail, generated by ServiceNow — not a consultant.
