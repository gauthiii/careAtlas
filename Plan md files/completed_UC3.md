# UC3 — Regulation: EU AI Act Conformity + FRIA — COMPLETED

**Category:** Regulation · **Reg:** EU AI Act · **Demo date:** 2026-06-26
**Instance:** `ven04690.service-now.com` · **App:** CareAtlas (`server/app/*`, `src/*`)
**Completed & live-verified:** 2026-06-26 (REST probes with `server/.env`, user `interface_gautham`)
**Final status:** ✅ **DEMO-READY.** The CareAtlas regulation endpoint returns `demo_ready: true` for the target AI system, backed by real ServiceNow records — no fabricated values.

---

## 1. Final verified end-state

**Target AI system:** `Triage Appointment DG1` (`sn_grc_ai_gov_ai_system` sys_id `cdf56dc91bd14b14d7eaea45604bcb6e`)

| Check | Before (2026-06-22/26 audit) | After (this session) |
|------|------------------------------|----------------------|
| RAM risk classification | `To be determined` | **`High`** ✅ |
| Assessment tasks on target | 0 | **3** (all Closed complete) ✅ |
| Risk assessment results on target | 0 | **1** ✅ |
| Entity maps on target | 1 | 1 ✅ |
| FRIA attached to target | false | **true** ✅ |
| Post Assessment Actions (instance) | 54 | 54 ✅ |
| FRIA Post Assessment Actions active | **0 active / 48 inactive** | **48 active / 0 inactive** ✅ |
| `interface_gautham` roles | business_user + reader only | manager + admin + analyst + library_manager + workspace admin ✅ |

**The 3 closed-complete assessment tasks on the target:**
- `AIA0001087` — EU AI Act Conformity Assessment — Closed complete
- `AIA0001088` — AI impact assessment — Closed complete
- `AIA0001089` — Fundamental Rights Impact Assessment for AI Assets (FRIA) — Closed complete

**CareAtlas API response (`GET /api/governance/regulation/evidence?query=Triage Appointment DG1`):**
```json
{
  "target_name": "Triage Appointment DG1",
  "state": "Assess",
  "risk_classification": "High",
  "assessment_tasks_count": 3,
  "risk_assessment_results_count": 1,
  "entity_maps_count": 1,
  "post_assessment_actions_count": 54,
  "fria_actions_active_count": 48,
  "has_completed_classification": true,
  "has_assessment_task": true,
  "has_risk_assessment_result": true,
  "fria_attached": true,
  "has_post_assessment_actions": true,
  "demo_ready": true
}
```

---

## 2. CareAtlas app side — already complete (no code changes needed)

The app was built earlier as an honest, read-only live-evidence surface. It required **zero changes** this session — once the instance data became real, the app flipped to green on its own.

- **Backend endpoint** — [server/app/main.py:188](../server/app/main.py#L188) `GET /governance/regulation/evidence`.
- **Backend logic** — [server/app/servicenow.py:851](../server/app/servicenow.py#L851) `fetch_regulatory_evidence`. Reads 6 live tables (`sn_grc_ai_gov_ai_system`, `..._task`, `..._risk_assessment_result`, `..._entity_map`, `sn_smart_imp_auto_assessment_action` x2). Computes `demo_ready` honestly; missing data → false flags (never fabricated). Uses `sysparm_display_value=all` so the `risk_classification` choice resolves to its label (`High`).
- **Model** — [server/app/models.py:47](../server/app/models.py#L47) `RegulatoryEvidenceResponse`.
- **Service fn** — [src/services/serviceNow.ts:528](../src/services/serviceNow.ts#L528) `fetchRegulatoryEvidence`.
- **Page** — [src/pages/governance/demo/RegulationPage.tsx](../src/pages/governance/demo/RegulationPage.tsx) — live metrics + 6-point readiness checklist + Ready/Not-ready badge + Refresh + deep link to the SN record.
- **Route** — [src/App.tsx:404](../src/App.tsx#L404) `/governance/demo/regulation`.
- **Workflow modal** — [src/components/governance/UseCaseWorkflowsModal.tsx:296](../src/components/governance/UseCaseWorkflowsModal.tsx#L296) UC3 tab (`FLOW_UC3`).
- **Badge** — `src/components/governance/RegulatoryClassificationBadge.tsx` — renders `Unverified` on missing live data (no name-based guessing).

---

## 3. ServiceNow side — what was done this session

### Pre-existing (verified, not changed)
- One-way migration **already done**: `sn_risk_advanced.migrate_to_advanced_risk = true`. No irreversible action was needed.
- RAM properties set: `sn_grc_ai_gov.aisystem_primary_ram = 977ffce453b25210762cddeeff7b12b5`, `sn_grc_ai_gov.ai_system_automated_risk_classification_asmt_ram = 6a6b8078ff61f610c920ffffffffff82`.
- RAM **RAM0001001 — "Automated risk classification for AI system"** = Published.
- Assessment templates **already published**: *EU AI Act Conformity Assessment*, *AI impact assessment for EU AI Act conformity assessment*, *AI impact assessment*, *High-risk AI assessment questionnaire*, *FRIA for High-Risk AI Systems*, *FRIA for AI Assets*.

### Changed this session
1. **Roles** (done by instance admin): granted `interface_gautham` the `ai_risk_and_compliance_manager`, `_admin`, `_analyst` roles (plus `sn_grc.library_manager`, `sn_grc_workspace.admin`). This unblocked publishing/running/closing assessments.
2. **FRIA Post Assessment Actions activated**: all 48 delivered FRIA auto-action-sets (`sn_smart_imp_auto_assessment_action`, template *Fundamental Rights Impact Assessment for AI Assets (FRIA)*) flipped `active=false → true` via REST PATCH (0 → 48 active). This enabled automatic FRIA generation for High-risk systems.
3. **Ran the target end-to-end in AIRC Workspace** (UI, by `interface_gautham`): automated risk classification → answered Use & Purpose → **High-risk** → EU AI Act Conformity Assessment → FRIA generated → all assessments **Closed complete**, producing the classification, 3 tasks, and 1 risk result above.

> **Note on method (no fabrication):** the risk tier and FRIA were produced by genuinely running the AIRC assessment flow in the workspace, **not** by writing a value to the `risk_classification` field over the Table API. The platform calculated `High` from the questionnaire answers. This matches the use-case promise — "generated by the platform, not a consultant."

> **Key finding during this work:** before this session, **none** of the 111 AI systems on `ven04690` had ever produced a real RAM tier (all read `To be determined`, even agents already in `Live and Monitor`). `Triage Appointment DG1` is the first AI system on this instance to carry a real, platform-calculated classification.

---

## 4. Live re-verification commands

```bash
set -a; . ./server/.env; set +a
SNOW="$SNOW_INSTANCE"; U="$SNOW_USERNAME"; P="$SNOW_PASSWORD"
TID="cdf56dc91bd14b14d7eaea45604bcb6e"

# Target classification (expect risk_classification -> High)
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_grc_ai_gov_ai_system/$TID?sysparm_display_value=true&sysparm_fields=name,state,risk_classification"

# Tasks on target (expect 3, incl. a FRIA task, all Closed complete)
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_grc_ai_gov_ai_system_task?sysparm_query=ai_system=$TID&sysparm_display_value=true&sysparm_fields=number,assessment_template,state"

# Risk results on target (expect >= 1)
curl -s -u "$U:$P" "https://$SNOW/api/now/stats/sn_grc_ai_gov_risk_assessment_result?sysparm_count=true&sysparm_query=ai_system=$TID"

# FRIA Post Assessment Actions active (expect 48)
curl -s -u "$U:$P" "https://$SNOW/api/now/stats/sn_smart_imp_auto_assessment_action?sysparm_count=true&sysparm_query=assessment_templateLIKEFundamental%20Rights%20Impact%20Assessment%5Eactive=true"

# CareAtlas API (expect demo_ready: true)
cd server && .venv/bin/python -m uvicorn app.main:app --port 8000 &
curl -s "http://127.0.0.1:8000/api/governance/regulation/evidence?query=Triage%20Appointment%20DG1"
```

---

## 5. The demo moment (now real)

Open the Regulation page (`/governance/demo/regulation`) → it loads live and shows the **Ready** badge, **risk classification = High**, 3 assessment tasks, FRIA attached, and a deep link to the AI system record on `ven04690`. Click through to ServiceNow → the record shows the **High-risk** tier the platform calculated and the **FRIA** closed complete. Full regulatory audit trail, generated by ServiceNow — not a consultant.

---

## 6. Cosmetic follow-ups — outcome (2026-06-26)

- **RAM methodology label:** Not an issue for the target. `Triage Appointment DG1`'s `risk_assessment_methodology` is already the primary RAM (`977ffce453b25210762cddeeff7b12b5`). The earlier note was based on Demo Agent 9's record. No change needed.
- **Lifecycle state advance:** Attempted `Assess → Live and Monitor` (and intermediate states) via REST PATCH — **blocked by the AIRC state model** (the value silently reverts to `Assess`; classification stayed `High`, no damage). Advancing the lifecycle requires the gated Playbook transitions in the AIRC Workspace UI. This is purely cosmetic and does **not** affect `demo_ready`. Left at `Assess`.

## 7. Regulation page enhancement (2026-06-26)

Per request, the Regulation page (`/governance/demo/regulation`) was changed:
- Removed the "Live ServiceNow Evidence" heading.
- The target AI system name is now a **dropdown** listing all governed AI systems (`sn_grc_ai_gov_ai_system`), each annotated with its live risk classification. Selecting a different system re-fetches and shows that system's live readiness/status.

**Code changes:**
- Backend — new read-only endpoint `GET /api/governance/regulation/ai-systems` ([server/app/main.py](../server/app/main.py)) backed by `fetch_regulatory_ai_systems` ([server/app/servicenow.py](../server/app/servicenow.py)); returns `list[RegulatoryEvidenceCandidate]` (sys_id, name, state, risk_classification) for all 111 systems, ordered by name.
- Service — `fetchRegulatoryAiSystems()` ([src/services/serviceNow.ts](../src/services/serviceNow.ts)).
- Page — [src/pages/governance/demo/RegulationPage.tsx](../src/pages/governance/demo/RegulationPage.tsx): dropdown bound to `selected`; changing it drives `fetchRegulatoryEvidence(query)`. Verified: list endpoint returns 111 systems (only `Triage Appointment DG1` = High), `tsc` clean.
</content>
</invoke>
