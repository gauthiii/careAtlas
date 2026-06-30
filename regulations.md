# CareAtlas — Regulatory Framing (EU AI Act → North America)

**Updated:** 2026-06-27
**Decision:** Re-frame the project's regulatory story from the **EU AI Act** to a
**North-America** framing — **NIST AI Risk Management Framework (AI RMF 1.0)** as the
AI-governance anchor, underpinned by **HIPAA** for the privacy / consent / security scenes.

Terminology mapping used throughout:

| Old (EU) | New (North America) |
|---|---|
| EU AI Act | **NIST AI RMF** (NIST AI Risk Management Framework 1.0) |
| FRIA / Fundamental Rights Impact Assessment | **AI Impact Assessment (AIA)** |
| EU AI Act Art. 10 (non-discrimination) | **NIST AI RMF (Harmful Bias & Fairness)** |
| GDPR / EU AI Act (consent & privacy) | **HIPAA** |

---

## 1. What has been done so far

**Only the FRONT END (display labels) and the story document have been changed.**
The behaviour, data, backend, and the live ServiceNow records are **unchanged** — the UI
now *says* NIST AI RMF / AI Impact Assessment, but it is still reading **EU AI Act / FRIA**
data underneath.

### Story document
- `Plan md files/26junstory.md` — Scene 1 (UC3 Regulation), Scene 5 (UC6 Fairness), the
  close, the live-numbers list, and the header changelog (now "rev. 3") were re-worded to
  NIST AI RMF / AI Impact Assessment / HIPAA.

### Frontend label changes (visible strings only)
- `src/pages/governance/demo/RegulationPage.tsx` — page title, intro, the
  "AI Impact Assessment actions active" metric, the readiness items, and the
  "NIST AI RMF Implementation Details" copy.
- `src/components/governance/RegulatoryClassificationBadge.tsx` — badge text + tooltip
  (`NIST AI RMF · {tier}`) and the `AI Impact Assessment` chip.
- `src/pages/governance/GovernanceDemoPage.tsx` — Regulation + Fairness card subtitles.
- `src/pages/governance/GovernanceDashboardPage.tsx` — table column header (`NIST AI RMF`).
- `src/pages/governance/demo/FairnessPage.tsx` — intro line.
- `src/components/governance/FairnessDebiasDemo.tsx` — header label.
- `src/pages/governance/GovernanceAgendaPage.tsx` — one risk-row label (`HIPAA / AI Impact Assessment`).
- `src/components/governance/UseCaseWorkflowsModal.tsx` — UC3 + UC6 workflow step
  records/descriptions/categories, and the UC3/UC6/UC10 headings + categories.
- `src/components/governance/ShadowAiWorkflowModal.tsx` — two workflow step strings
  (`NIST AI RMF, HIPAA` and `NIST AI RMF · HIPAA`).
- `src/data/useCaseDemoData.ts` — two section comments.

### What was deliberately NOT changed
- **Backend code** (`server/app/servicenow.py`) — still queries and labels by EU/FRIA
  (see §3). The data field names (`fria_actions_active_count`, `fria_attached`,
  `friaAttached`) are still `fria_*`.
- **The live ServiceNow instance** (`ven04690`) — the `sn_grc_ai_gov_ai_system`
  classification (Triage Appointment DG1) and the assessment record are still an
  **EU AI Act** classification + a **Fundamental Rights Impact Assessment**.
- `src/pages/governance/GovernanceAdditionalWorkPage.tsx:70` — still mentions
  "NIST RMF, EU AI Act" because it factually describes ServiceNow's own GRC docs coverage,
  not CareAtlas's posture.

> **Net effect:** purely cosmetic. If you click "Open AI system record" and flip to
> ServiceNow, the raw record still reads EU AI Act / FRIA. And because the backend finds
> the assessment by the literal template name "Fundamental Rights Impact Assessment", the
> "AI Impact Assessment actions active = 48" metric would drop to 0 if that EU-named
> template were ever renamed on the instance.

---

## 2. Instruction A — How to REVERT the front-end changes (back to EU AI Act)

Goal: undo §1's UI + story edits so everything reads EU AI Act / FRIA again. Nothing in the
backend or ServiceNow needs touching (it was never changed).

**Option 1 — Git (cleanest, if these edits are a separate commit / not yet committed):**
- If uncommitted: `git checkout -- <each file listed in §1>` (or `git restore`).
- If committed as one commit: `git revert <commit-sha>` of the "regulations re-frame" commit.
  > Note: this repo was reported as **not a git repo** at the time of writing — confirm with
  > `git status` first. If there is no git history, use Option 2.

**Option 2 — Manual find-and-replace** across the files in §1 (reverse the §0 mapping):
- `NIST AI RMF` → `EU AI Act`
- `NIST AI RMF Conformance` → `EU AI Act Conformity`
- `NIST AI Risk Management Framework` → `EU AI Act`
- `AI Impact Assessment (AIA)` → `Fundamental Rights Impact Assessment (FRIA)`
- `AI Impact Assessment` → `FRIA` (in short chips/labels) / `Fundamental Rights Impact Assessment` (in prose)
- `NIST AI RMF (Harmful Bias)` and `NIST AI RMF (Harmful Bias & Fairness)` → `EU AI Act Art. 10`
- `Consent & Purpose · HIPAA` → `Consent & Purpose · GDPR / EU AI Act`
- `HIPAA / AI Impact Assessment` → `FRIA / AI impact assessment`
- In `ShadowAiWorkflowModal.tsx`: `NIST AI RMF, HIPAA` → `EU AI Act, NIST`;
  `NIST AI RMF · HIPAA` → `EU AI Act · GDPR · NIST`; restore the
  "NIST AI RMF — Govern / Manage" description back to "EU AI Act Art. 9 Risk Management".
- In `26junstory.md`: remove the rev. 3 header block + the "Regulatory framing" line, and
  reverse the same wording in Scene 1, Scene 5, the close, and the live-numbers list.

**Verify the revert:**
```bash
cd CareAtlas
grep -rni "NIST AI RMF\|AI Impact Assessment" src "Plan md files/26junstory.md"   # should be empty
npx tsc -p tsconfig.app.json --noEmit                                              # should pass
```

---

## 3. Instruction B — How to ALSO move the BACKEND (and ServiceNow) to US regulations

This is what makes the change real end-to-end instead of cosmetic. Three parts: the
ServiceNow instance, the backend code, then the data field names.

### Part 1 — ServiceNow instance (`ven04690`) — the source of truth
The portal reads live GRC records, so the framework must change on the instance first.
- In **AI Governance / GRC**, re-classify the AI system **Triage Appointment DG1**
  (`sn_grc_ai_gov_ai_system`) under a **NIST AI RMF** conformance template instead of the
  EU AI Act template (re-run the Use & Purpose questionnaire under the NIST template so the
  Risk Assessment Methodology recomputes the tier — Triage should still come out High).
- Replace the **Fundamental Rights Impact Assessment** assessment template/record with an
  **AI Impact Assessment** template, and re-generate the post-assessment actions (the 48
  "active actions" the portal counts) under that new template.
- (Optional, for the privacy/consent/security scenes) map the relevant AIRC risk
  statements / controls to **HIPAA** rather than GDPR.

### Part 2 — Backend code (`server/app/servicenow.py`)
The regulation-evidence builder finds the assessment by the **literal EU template name** and
the FRIA detection keys off "fundamental rights". Update these to match the new NIST/AIA
template name you chose in Part 1:

- **~line 914** — query:
  `assessment_templateLIKEFundamental Rights Impact Assessment^active=true`
  → change `Fundamental Rights Impact Assessment` to your new template name
  (e.g. `AI Impact Assessment`).
- **~line 920** — the same string in the `active=false` query.
- **~line 960** — `fria_attached = "fundamental rights" in task_templates or "fria" in task_templates`
  → change the keywords to match the new template (e.g. `"ai impact assessment"` / `"aia"`).
- Re-scan `servicenow.py` for any other `fria` / `fundamental` / `eu ai` / `article` /
  `gdpr` references:
  ```bash
  grep -niE "fria|fundamental|eu ai|eu_ai|article|gdpr" server/app/servicenow.py
  ```

### Part 3 — (Optional) rename the `fria_*` data fields end-to-end
Cosmetic-but-tidy: the API still ships `fria_actions_active_count`, `fria_actions_inactive_count`,
`fria_attached`. To rename them to e.g. `aia_actions_active_count` / `aia_attached` you must
change them in **all three** places together (they are wired by name):
- `server/app/models.py` — the `RegulatoryEvidenceResponse` model fields.
- `server/app/servicenow.py` — where those fields are populated (~lines 928, 977–990).
- `src/services/serviceNow.ts` — the matching TypeScript type (`fria_actions_active_count`,
  `fria_actions_inactive_count`, `fria_attached`) and any UI that reads them
  (`RegulationPage.tsx` uses `evidence.fria_actions_active_count` and `evidence.fria_attached`).
> If you skip Part 3, leave the field names as `fria_*` — they still work; only the displayed
> labels (already done in §1) read as AIA.

### Verify the backend change
```bash
# restart backend, then:
curl -s http://localhost:8000/api/governance/regulation/evidence | python3 -m json.tool
# Expect: risk_classification "High", and the AIA/action counts > 0 (proves the new
# template name matched). If fria/aia counts are 0, the Part-2 query string does not
# match the Part-1 template name on the instance.
```

---

## 4. Quick reference — where each regulation maps per use case

| Use case | North America framing |
|---|---|
| UC3 Regulation (risk tier + impact assessment) | NIST AI RMF + AI Impact Assessment |
| UC1 Privacy (PII redaction, field-level ACL) | HIPAA Privacy Rule |
| UC10 Consent (purpose-of-use ConsentGate) | HIPAA (authorization / use-limitation) |
| UC5 Security (injection / exfiltration guardrails) | HIPAA Security Rule |
| UC6 Fairness (non-discrimination on outcomes) | NIST AI RMF (Harmful Bias) + optionally ACA §1557 |
