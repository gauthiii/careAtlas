# Use Case 5 — "Nothing Ships Without a Green Light" · Step-by-Step Build Guide

**Pre-Deployment Governance Gate Across the Full AI Lifecycle · Non-OWASP**
**Demo date:** 2026-06-26 · **Instance:** `ven04690.service-now.com` · **App:** CareAtlas (React/Vite + FastAPI)
**Audience for this doc:** someone with ZERO prior knowledge. Follow it top to bottom; every click, URL, role, and ID is spelled out.

---

## 0. Read this first — what we are showing, in one breath

A hospital wants to launch a new AI feature (say, a "Clinical Notes Summarizer"). The scary question every executive asks is:

> *"What actually stops an unsafe AI feature from reaching patients?"*

UC5 answers that **live**. We walk one AI feature through ServiceNow's governed life cycle:

**Intake → Assess → Build → Pre-deployment Review → Live & Monitor**

…and at the **Pre-deployment Review** gate, the **AI Risk & Compliance manager BLOCKS it** while a risk is open, then **APPROVES it** once the risk is mitigated. That block/approve is the money shot. Before: anything ships. After: nothing ships without a green light.

> **This is a PROCESS demonstration, not a code demonstration.** UC1 was "build a guardrail." UC5 is "operate the governance machine that already exists." That is the whole point — and it's why this is the lowest-code, highest-trust use case in the set.

---

## 1. The single most important fact (good news edition)

We probed the live instance. **Almost everything UC5 needs is already installed, published, and configured.** You are not building — you are arranging furniture that's already in the room.

| Thing UC5 needs | Status on `ven04690` (verified 2026-06-22) |
|-----------------|---------------------------------------------|
| AIRC + AICT applications | ✅ Installed: `sn_grc_ai_gov` v22.1.2, `sn_ai_governance` v6.1.1, `sn_smart_imp_auto`, `sn_ai_case_mgmt`, `sn_impact_fwk`, `sn_ai_asset_mgmt` |
| Version ≥ 22.0.3 (needed for risk-based intake classification) | ✅ v22.1.2 |
| "Migrate to Advanced Risk Assessments" (one-way change) | ✅ Already `true` — **done, no decision to make** |
| Default RAMs configured | ✅ `aisystem_primary_ram` AND `ai_system_automated_risk_classification_asmt_ram` both set |
| AI impact assessment template **published** | ✅ Published (also EU AI Act, FRIA, High-risk — all published) |
| Post-Assessment Action rules (auto-generate risks/controls) | ✅ 32 rules exist (e.g. "Map data used by the system…") |
| Intake front door ("Request an AI use case") | ✅ Active record producer, `sys_id = 117d9b8993929210032a1f1044891888` |
| AI systems already sitting at the gate | ✅ 3 systems at state **"Review for deployment"** (real IDs in §4) |
| Lifecycle states | ✅ New(-1) → Assess(0) → Build(1) → **Review for deployment(2)** → Live and Monitor(3) → Retired(4) |

**The ONE gap:** the demo account `interface_gautham` does **not** hold the approve/block role `sn_grc_ai_gov.ai_risk_and_compliance_manager`. It IS a global `admin`, so it can grant itself that role in 2 minutes (§3 Step 1). That's the only "missing piece," and it's trivial.

> **Plain-English summary:** UC5 is ~90% pre-built on this instance. Your job for June 26 is: grant one role, pre-stage one CareAtlas-branded system at the gate, add a couple of launch links to the portal, and rehearse the click path. No backend code.

---

## 2. Before you touch anything — verify access (5 min)

Credentials live in `CareAtlas/server/.env` (git-ignored — never commit).

```bash
export SNOW=ven04690.service-now.com
export U=interface_gautham
export P='Account@123'

# 2.1 Auth works? Expect 200.
curl -s -o /dev/null -w "auth: %{http_code}\n" -u "$U:$P" \
  "https://$SNOW/api/now/table/sys_user?sysparm_limit=1"

# 2.2 AIRC app present + version? Expect sn_grc_ai_gov / 22.1.2
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sys_scope?sysparm_query=scope=sn_grc_ai_gov&sysparm_fields=scope,version" -H "Accept: application/json"

# 2.3 AI impact assessment template published? Expect published=true
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_smart_asmt_template?sysparm_query=name=AI impact assessment&sysparm_fields=name,published" -H "Accept: application/json"

# 2.4 Systems already at the gate? Expect count = 3 (or more)
curl -s -u "$U:$P" "https://$SNOW/api/now/stats/sn_grc_ai_gov_ai_system?sysparm_count=true&sysparm_query=state=2" -H "Accept: application/json"
```

✅ All good → proceed. ❌ Any failure → see §8 Troubleshooting.

---

## 3. SERVICENOW SIDE — the only setup you must do

### Step 1 — Grant the approve/block role (2 min) ⭐ the only true blocker
Without this, you cannot click "approve/block" as a manager.

**UI way (recommended):**
1. ServiceNow → top nav filter → type **Users** → open **User Administration > Users**.
2. Open **Interface Gautham** (`user_name = interface_gautham`).
3. Open the **Roles** related list → **Edit** → add **`sn_grc_ai_gov.ai_risk_and_compliance_manager`** → Save.
4. **Log out and back in** (roles only fully apply on a fresh session).

**API way (only if you prefer curl — uses verified IDs):**
```bash
# interface_gautham sys_id = 456487f81b958714d7eaea45604bcb3f
# manager role sys_id      = d7253a7f93995210032a1f1044891892
curl -s -u "$U:$P" -X POST "https://$SNOW/api/now/table/sys_user_has_role" \
  -H "Content-Type: application/json" \
  -d '{"user":"456487f81b958714d7eaea45604bcb3f","role":"d7253a7f93995210032a1f1044891892"}' | python3 -m json.tool
```
> ℹ️ You may also want `sn_grc_ai_gov.ai_risk_and_compliance_admin` if you intend to touch RAM/template config — but you DON'T need it for the demo, because templates and RAMs are already configured. Skip unless something forces it.

### Step 2 — Pre-stage ONE CareAtlas-branded system AT the gate (10 min)
This is your safety net so the block/approve climax always works, even if a live intake stalls.

**Option A (recommended — fastest, guaranteed valid state machine):** rename an existing system already at "Review for deployment" to a CareAtlas name.
```bash
# Existing systems at the gate (state=2), verified live:
#   KB Summarization Skill        AIS0001031  id=1c3e02cb2b1b3610d116f153ce91bf37
#   Incident Creator with NowLLM  AIS0001095  id=7f2572b91b51c754d7eaea45604bcbea
#   Demo Agent 1 for testing      AIS0001109  id=880b289e1b298f58d7eaea45604bcbd5
# Rename "Demo Agent 1 for testing" -> CareAtlas branding:
curl -s -u "$U:$P" -X PATCH \
  "https://$SNOW/api/now/table/sn_grc_ai_gov_ai_system/880b289e1b298f58d7eaea45604bcbd5" \
  -H "Content-Type: application/json" \
  -d '{"name":"CareAtlas Clinical Notes Summarizer","description":"Generative AI feature that drafts clinical visit summaries for clinician review. Staged at Pre-deployment Review for the June 26 governance-gate demonstration."}' | python3 -m json.tool
```

**Option B (cleaner provenance, slightly more work):** create a brand-new AI system. Mandatory fields are `name`, `analyst`, `ai_system_digital_asset` (verified). Easiest is to create it through the AICT UI (**All > AI Control Tower > Add AI system**) so the lifecycle playbook attaches correctly, then move it to "Review for deployment" via the workspace.

> **Recommendation:** use **Option A** for the guaranteed-working climax, AND still run a **fresh intake** (Step 4 below) for the "front door" story. That's the "pre-staged + fresh intake" combo.

### Step 3 — Confirm the exact approve/block control on the gate (10 min) — REHEARSE THIS
The state change is performed at the **Pre-deployment Review** gate. Find the exact button before the demo so you're not hunting on stage:
1. Go to **All > AI Control Tower** (`https://ven04690.service-now.com/now/ai-control-tower/home`).
2. Open the **AI asset inventory** → find **CareAtlas Clinical Notes Summarizer** (state = Review for deployment).
3. Open it in the **AICT/AIRC workspace**. Look for the life-cycle **playbook / review task** (`sn_grc_ai_gov_ai_system_task`) with an **Approve / Return-for-remediation (block)** action. As the manager, this transitions the system state.
4. **Practice both:** Block (sends it back / holds at gate) and Approve (advances to **Live and Monitor**). Watch the `state` field change.

**⛑️ Guaranteed-visual fallback (only if the UI playbook button misbehaves live):** flip the state directly by API so the demo can never fail.
```bash
# BLOCK (return to Build): state 2 -> 1
curl -s -u "$U:$P" -X PATCH "https://$SNOW/api/now/table/sn_grc_ai_gov_ai_system/880b289e1b298f58d7eaea45604bcbd5" \
  -H "Content-Type: application/json" -d '{"state":"1"}' >/dev/null && echo "BLOCKED -> Build"
# APPROVE (advance to Live & Monitor): -> 3
curl -s -u "$U:$P" -X PATCH "https://$SNOW/api/now/table/sn_grc_ai_gov_ai_system/880b289e1b298f58d7eaea45604bcbd5" \
  -H "Content-Type: application/json" -d '{"state":"3"}' >/dev/null && echo "APPROVED -> Live and Monitor"
# RESET back to the gate for a re-run / next rehearsal:
curl -s -u "$U:$P" -X PATCH "https://$SNOW/api/now/table/sn_grc_ai_gov_ai_system/880b289e1b298f58d7eaea45604bcbd5" \
  -H "Content-Type: application/json" -d '{"state":"2"}' >/dev/null && echo "RESET -> Review for deployment"
```
> Prefer the real UI playbook on stage (it tells the better story). Keep the curl reset handy between rehearsals, and as the live safety net.

### Step 4 — Dry-run the fresh intake (15 min) — the "front door"
1. **All > Self-Service > Employee Center.**
2. **Help center > Technology services**, then **AI assets** from the topics.
3. Open the **Request an AI use case** card (record producer `117d9b8993929210032a1f1044891888`).
4. Fill it for a CareAtlas feature, choosing answers that push risk **up** so the classification is interesting:
   - **Name:** *CareAtlas Clinical Notes Summarizer (intake demo)*
   - **Model category:** Generative AI
   - **Data used by the system:** include **Sensitive Business Data** (patient data is sensitive)
   - **People affected:** General Customer Base / Public or Large Audiences
   - **Level of human involvement:** *AI-Initiated with User Approval* (shows oversight)
   - **System autonomy level:** *Semi-Automated (acts with confirmation)*
5. **Submit.** Confirm a risk classification (Low/Medium/High) lands on the resulting AI system. *(If it shows "To Be Determined," that's expected until an AI Steward "manages" it — note it, don't panic; the pre-staged system in Step 2 carries the climax.)*

> **Why two systems?** The **fresh intake** shows the front door + auto-classification. The **pre-staged system** guarantees a clean block→approve climax without waiting for an assessment to complete on stage.

### Step 5 (optional, only if you want the assessment beat) — Run the AI impact assessment (15 min)
On the pre-staged system, initiate the **AI impact assessment** (already published) from the AIRC workspace, answer "uses personal/sensitive data = Yes," and mark it **Closed complete**. The 32 **Post-Assessment Action** rules then auto-generate risk statements + control objectives mapped to the system — giving the manager a concrete open risk to "block" on. *Skip if time is tight; the block/approve still demos without it.*

---

## 4. CAREATLAS APP SIDE — add launch links (no code logic, ~30 min)

Per the chosen scope, the app side is **launch links + screenshots only — no backend, no business logic.**

**File:** `src/pages/governance/GovernanceDemoPage.tsx`. There is already a `demoLinks` array (around line 18) rendering launch cards. **Add three entries** so the portal is the single launchpad for the UC5 walkthrough:

```typescript
  {
    label: 'AI Control Tower',           // (already present — keep)
    description: 'Lifecycle state of every managed AI asset',
    href: `${SNOW_BASE}/now/ai-control-tower/home`,
    icon: TowerControl,
  },
  {
    label: 'Employee Center — AI Intake',
    description: 'Request an AI use case (the governance front door)',
    href: `${SNOW_BASE}/esc?id=sc_cat_item&sys_id=117d9b8993929210032a1f1044891888`,
    icon: ClipboardList,   // import from lucide-react
  },
  {
    label: 'AI Risk & Compliance',
    description: 'AIRC workspace — assessments, risks, approve/block gate',
    href: `${SNOW_BASE}/now/nav/ui/classic/params/target/%24sn_grc_ai_gov_workspace.do`,
    icon: ShieldCheck,     // import from lucide-react
  },
```

> ⚠️ **Verify the two new URLs on the instance during rehearsal** (Employee Center catalog URL format and the AIRC workspace slug can differ by instance). If a slug 404s, just navigate manually via **All >** and update the `href`. Do NOT guess in front of stakeholders — confirm in Step 3/4 rehearsal.

Add the new icon imports at the top of the file (`import { ... ClipboardList, ShieldCheck } from 'lucide-react'`). Run `npm run dev` and click each card to confirm it opens the right place.

**Screenshots backup slide:** capture (a) the intake form, (b) the system at "Review for deployment", (c) the state after Approve = "Live and Monitor". If live navigation lags, you show these.

---

## 5. Verification — prove the gate works end-to-end

```bash
# 1. Manager role is granted (expect 1 row)
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sys_user_has_role?sysparm_query=user.user_name=interface_gautham^role.name=sn_grc_ai_gov.ai_risk_and_compliance_manager&sysparm_fields=role.name" -H "Accept: application/json"

# 2. CareAtlas system is staged at the gate (expect state=2, CareAtlas name)
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_grc_ai_gov_ai_system/880b289e1b298f58d7eaea45604bcbd5?sysparm_fields=name,state&sysparm_display_value=all" -H "Accept: application/json"

# 3. Approve moves it to Live & Monitor (state=3), then reset to 2 for the real demo
#    (use the Step-3 PATCH commands)

# 4. Intake producer is live
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sc_cat_item_producer/117d9b8993929210032a1f1044891888?sysparm_fields=name,active" -H "Accept: application/json"
```

**What you point at on stage:** the CareAtlas portal Demo page launches → Employee Center intake (front door) → AICT inventory shows the system at the gate → AIRC manager **blocks** → resolve → **approves** → state flips to **Live and Monitor**. End on the risk/control records the assessment generated.

---

## 6. Work Breakdown Schedule — half a day (~3.5 hours)

> Config + rehearsal only. Ordered so the climax (block/approve) is provable first; everything after is polish.

| # | Task | Where | Est. | Depends | Done = |
|---|------|-------|------|---------|--------|
| 0 | Verify access (4 curls) | terminal (§2) | 0:10 | — | all 200, template published=true |
| 1 | Grant `ai_risk_and_compliance_manager` to interface_gautham + re-login | ServiceNow UI (§3.1) | 0:15 | 0 | role shows in verify §5.1 |
| 2 | Pre-stage CareAtlas system at the gate (rename Demo Agent 1) | curl/UI (§3.2 Opt A) | 0:15 | 0 | name + state=2 confirmed |
| 3 | **Rehearse block→approve at the gate (UI playbook); confirm exact button** | AICT/AIRC workspace (§3.3) | 0:45 | 1,2 | state visibly flips 2→1→3 |
| 4 | **Milestone: climax works live** + test the API fallback + reset to state 2 | terminal (§3.3) | 0:15 | 3 | ✅ block/approve provable |
| 5 | Dry-run the fresh intake (Employee Center) | ServiceNow (§3.4) | 0:25 | 1 | intake submits, classification lands |
| 6 | (Optional) Run AI impact assessment → auto-generate risk/controls | AIRC workspace (§3.5) | 0:25 | 5 | risk statements mapped to system |
| 7 | Add 3 launch-link cards to CareAtlas Demo page + verify URLs | `GovernanceDemoPage.tsx` (§4) | 0:30 | 0 | each card opens correct page |
| 8 | Capture backup screenshots (intake / gate / approved) | — | 0:15 | 3,5 | 3 images saved |
| 9 | Full rehearsal of the 4-min narrative end-to-end | §7 | 0:25 | all | timed, smooth |

**Critical path to a working demo = 0 → 1 → 2 → 3 → 4 (~1:40).** Tasks 5–8 enrich the story. Task 6 is optional. If the clock collapses, you can demo UC5 with ONLY tasks 0–4 plus the screenshots.

---

## 7. The 4-minute demo script (say this on stage)

1. **(20s)** "Every exec asks: *what actually stops an unsafe AI feature from reaching patients?* CareAtlas answers that with ServiceNow's governed AI life cycle — and none of this is custom-built; it's the platform doing its job."
2. **(40s) Front door:** open CareAtlas portal → **Employee Center — AI Intake** card → show the **Request an AI use case** form for the *Clinical Notes Summarizer*. "Anyone proposing AI starts here. Notice it auto-classifies the risk based on how the AI is used — sensitive patient data pushes it up."
3. **(40s) Inventory & gate:** open **AI Control Tower** → show the system sitting at **Review for deployment**. "It can't just ship. It's parked at the pre-deployment gate."
4. **(60s) BLOCK:** as the AI Risk & Compliance manager, open the review task → point at the open risk/control from the assessment → **Block / return for remediation**. "There's an unresolved privacy risk. As the governance manager, I block deployment. It does not ship."
5. **(40s) APPROVE:** resolve/accept the risk → **Approve** → watch the state flip to **Live and Monitor**. "Risk mitigated, control attested — now, and only now, the green light. The state changes in the system of record."
6. **(close, 20s)** "Before: features reached patients with no checkpoint. After: nothing ships without a governed green light — intake, assessment, risk, control, and an explicit human approval, all on the record."

---

## 8. Troubleshooting (the failures you'll actually hit)

| Symptom | Cause | Fix |
|---------|-------|-----|
| §2 auth ≠ 200 | wrong creds / instance asleep | re-check `server/.env`; open the instance in a browser to wake it |
| No "Approve/Block" button as manager | role not applied to session | confirm Step 1 role grant, then **log out and back in** |
| Intake classification shows "To Be Determined" | system not yet "Managed by an AI steward" (expected) | fine for the demo — the pre-staged system carries the climax; or have the steward "manage" it |
| UI playbook approve button hard to find / errors | workspace/playbook variance | use the **§3.3 API fallback** to flip state live; rehearse so you know which you're using |
| New launch-link card 404s | instance URL slug differs | navigate via **All >** to the right page, copy the real URL into `href` |
| State won't move 2→3 via UI | a mandatory review task/attestation is open | complete/close the open task, or use the API fallback for the visual |
| Can't see AIRC workspace | missing workspace role | interface_gautham has `sn_grc_workspace.user` + admin; if blocked, confirm role and re-login |

---

## 9. Quick reference — verified IDs & facts (so nobody re-investigates)

- **Instance:** `ven04690.service-now.com` · creds in `CareAtlas/server/.env`
- **interface_gautham** sys_id: `456487f81b958714d7eaea45604bcb3f` (holds `admin`, `sn_ai_governance.ai_steward`, `sn_grc_ai_gov.ai_risk_and_compliance_business_user`; **needs** `…manager`)
- **Manager role** sys_id: `d7253a7f93995210032a1f1044891892` (`sn_grc_ai_gov.ai_risk_and_compliance_manager`)
- **Intake record producer** "Request an AI use case": `117d9b8993929210032a1f1044891888`
- **AI system table:** `sn_grc_ai_gov_ai_system` · mandatory create fields: `name`, `analyst`, `ai_system_digital_asset`
- **Lifecycle states:** `-1` New · `0` Assess · `1` Build · **`2` Review for deployment (the gate)** · `3` Live and Monitor · `4` Retired
- **Pre-stage candidates already at state 2:** `CareAtlas Clinical Notes Summarizer` (renamed Demo Agent 1) `880b289e1b298f58d7eaea45604bcbd5` · KB Summarization Skill `1c3e02cb2b1b3610d116f153ce91bf37` · Incident Creator with NowLLM `7f2572b91b51c754d7eaea45604bcbea`
- **Published templates (SAE, `sn_smart_asmt_template`):** AI impact assessment · EU AI Act Conformity · FRIA · High-risk AI questionnaire — all `published=true`
- **Post-Assessment Actions:** `sn_smart_imp_auto` v22.0.2, 32 rules present
- **Advanced Risk:** `sn_risk_advanced.migrate_to_advanced_risk = true` (done) · RAMs: `aisystem_primary_ram` + `ai_system_automated_risk_classification_asmt_ram` both set

---

*Every table name, column, state value, role, record `sys_id`, property, and template publish-state in this document was verified against the live `ven04690` instance and the ServiceNow Zurich/Australia GRC documentation ("AI Governance Life Cycle", "Request an AI use case") on 2026-06-22. Items to confirm at rehearsal time (the exact approve/block UI control and the two new portal URLs) are flagged explicitly with a guaranteed fallback, never assumed.*
