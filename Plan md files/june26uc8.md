# Use Case 8 — "Follow the Trail" · Step-by-Step Build Guide

**Access Map Incident Investigation — Reconstructing an Adversarial Event · Security Incident Response**
**Demo date:** 2026-06-26 · **Instance:** `ven04690.service-now.com` · **App:** CareAtlas (React/Vite + FastAPI)
**Audience for this doc:** someone with ZERO prior knowledge. Every click, URL, role, and `sys_id` is spelled out. Follow top to bottom.

---

## 0. Read this first — what we are showing, in one breath

Something looks wrong with an AI agent in production. A security officer needs to answer two questions, fast:

> *"What did this agent actually touch — and how far could the damage have spread?"*

UC8 shows exactly that, **live**, using ServiceNow's **Access Map** (a node-graph of every agent, workflow, and tool) plus a formal **AI Case**:

1. **BEFORE:** a suspicion exists, but there's no structured way to see what the agent touched or how far it reached. ❌
2. **AFTER:** we open the **Access Map**, find the suspect agent's node, review **"Tables accessed"** and **"Access issues"**, trace its **connections (blast radius)** to upstream workflows and downstream tools, and document the whole thing in a formal **AI Case with sub-type "Adversarial attack."** ✅

> **This is a PROCESS / investigation demonstration, not a code demonstration.** Like UC5, you are *operating* a governance machine that already exists — not building one. The "build" here is staging the story and rehearsing the click path so it's flawless on stage.

**Our suspect agent (locked):** **Patient Data Agent** — and good news, it's a *live, deployed, governed* AI system on the instance (state = "Live and Monitor"). That makes the story believable: "this agent is in production right now, and we suspect it overreached."

---

## 1. The single most important fact (good news + one honest caveat)

We probed the live instance. **Both halves of UC8 are access-ready and data-backed.**

| Thing UC8 needs | Status on `ven04690` (verified 2026-06-22) |
|-----------------|---------------------------------------------|
| Access Map role (`sn_ai_governance_ai_steward`) | ✅ `interface_gautham` already holds it |
| Create-AI-Case role (`sn_ai_case_mgmt.ai_case_analyst`) | ✅ `interface_gautham` already holds it |
| Agent topology (the node-graph data) | ✅ 160 agents, 241 relationship edges, 110 governed AI systems |
| Suspect agent exists & is live | ✅ **Patient Data Agent** — agent `sn_aia_agent` `b579ac0e1b9d0b54d7eaea45604bcb92`; also AI system `sn_grc_ai_gov_ai_system` `20bb87721b110b94d7eaea45604bcb02`, state 3 = Live and Monitor |
| "Adversarial attack" AI-case sub-type | ✅ Real record in `sn_grc_case_mgmt_case_type`: `adversarial_attacks` = `88a5a11d7befd21005de3782f38cb63a` |
| AI Case create works via API | ✅ Confirmed live (created `ACS0001003`, then deleted) — payload in §3 Step 2 |
| CareAtlas corroborating audit trail | ✅ `u_ai_action_audit_log` (12+ rows) + decision log already wired into the portal |

> ⚠️ **The one honest caveat (do not skip):** the Access Map's **red "access issue" warning icons** depend on a security-observability capability that looks sparse on this instance (`sn_vsc_security_privacy_capabilities` returned 0 rows). So **do NOT build the demo around a pre-existing red warning** — it may not be there. We design the investigation around the **node-graph topology + "Tables accessed" + connections**, which DO render, and we corroborate with CareAtlas's own audit trail. (You chose this "Topology + CareAtlas audit fallback" path — it's the robust one.)

> **Plain-English summary:** Nothing to install, no roles to grant. Your job for June 26: confirm the Access Map renders the suspect node, pre-create a backup AI Case, add two launch links to the portal, line up the corroborating audit trail, and rehearse the click path.

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

# 2.2 Suspect agent is live (expect state=3 = Live and Monitor)
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_grc_ai_gov_ai_system/20bb87721b110b94d7eaea45604bcb02?sysparm_fields=name,state&sysparm_display_value=all" -H "Accept: application/json"

# 2.3 "Adversarial attack" sub-type record exists (expect name=adversarial_attacks)
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_grc_case_mgmt_case_type/88a5a11d7befd21005de3782f38cb63a?sysparm_fields=name,sys_id" -H "Accept: application/json"

# 2.4 I can read the AI case table (expect 200; count likely 0)
curl -s -u "$U:$P" "https://$SNOW/api/now/stats/sn_ai_case_mgmt_ai_case?sysparm_count=true" -H "Accept: application/json"

# 2.5 I hold both required roles (expect 2 rows)
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sys_user_has_role?sysparm_query=user.user_name=interface_gautham^role.nameINsn_ai_governance_ai_steward,sn_ai_case_mgmt.ai_case_analyst&sysparm_fields=role.name" -H "Accept: application/json"
```

✅ All good → proceed. ❌ Any failure → see §8 Troubleshooting.

---

## 3. SERVICENOW SIDE — stage the investigation

### Step 1 — Confirm the Access Map renders the suspect node (20 min) ⭐ REHEARSE THIS
You cannot demo a map you haven't seen. Open it and find the suspect before stage day.

1. ServiceNow → top nav filter → go to **All > AI Security and Privacy > Access Map**
   *(alternate path: AI Control Tower → Security & privacy tab → "access map" link in the header).*
2. In **Search by agent or workflow**, type **Patient Data Agent**. Select its node.
3. On the **Agent node detail panel**, confirm you can see:
   - **Tables accessed** (the agent's observed table access over the last month) — **this is the hero panel.**
   - **Connections** to upstream workflows / downstream tools (the blast radius).
   - **Access issues** panel (Resource / Operation / Count) — *may be empty; that's fine, see §1 caveat.*
4. **Screenshot everything** — node-graph, Tables accessed, connections. These are your backup slides.

> **What "investigation" means here (the narrative):** compare **Tables accessed (observed)** against the agent's **intended scope**. A *Patient Data Agent* is expected to read patient demographics — but if "Tables accessed" shows it reaching something it shouldn't (e.g. a notes/credentials/admin table), that gap IS the security finding. Even with no red icon, the observed-vs-intended comparison is the story.

> **If the Access Map node is sparse/empty (fallback):** pivot to the **AI system record** for Patient Data Agent (`20bb87721b110b94d7eaea45604bcb02`) → its **related entities / connections** + the CareAtlas **audit trail** (Step 4) as the "what it touched" evidence. The investigation still lands; you just narrate from records instead of the graph.

### Step 2 — Pre-create the backup AI Case (10 min) — guaranteed fallback
So the "case raised" artifact always exists even if the live form misbehaves. **Payload below is verified working** (created `ACS0001003` on probe, then deleted).

```bash
curl -s -u "$U:$P" -X POST \
  "https://$SNOW/api/now/table/sn_ai_case_mgmt_ai_case?sysparm_exclude_reference_link=true" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{
        "name":"Suspected adversarial activity — Patient Data Agent",
        "description":"Patient Data Agent (live, governed) is suspected of accessing patient records beyond its intended scope. Access Map review of Tables accessed and downstream tool connections indicates possible over-reach. Raised for formal investigation and blast-radius scoping.",
        "case_subtype":"88a5a11d7befd21005de3782f38cb63a",
        "date_of_occurrence":"2026-06-20 14:00:00",
        "discovered_date":"2026-06-21 09:00:00",
        "breach":"to_be_determined"
      }' | python3 -m json.tool | head -40
```

> 🧠 **Why those dates matter:** a business rule **"Validate date of occurrence and discovery"** rejects the create if dates are missing OR **in the future**. Use dates in the **past** (relative to demo day) and keep `discovered_date` ≥ `date_of_occurrence`. That's the exact reason a naive create fails — now you know.

Note the returned **number** (e.g. `ACS000xxxx`) and **sys_id** — keep them for the demo. Open the record in the UI and confirm **Sub-type = Adversarial attacks**. This is your safety net.

### Step 3 — Rehearse creating an AI Case LIVE in the UI (15 min)
On stage you'll create one live (more authentic), with the pre-created one as backup.
1. **All > AI Control Tower** → **AI cases dashboard** → **Create AI case**.
2. Fill: **Name** = "Suspected adversarial activity — Patient Data Agent"; **Sub-type** = **Adversarial attacks**; **Priority** = High; **Date of occurrence** / **Date of discovery** = past dates; **Description** = paste the finding.
3. **Save.** Confirm it lands in **New** state with the adversarial sub-type.
4. Practice pasting **Access Map findings** into the **Description** and **Work notes** — that's the "document the trail" beat.

### Step 4 — Line up the CareAtlas corroborating trail (10 min)
This is the "audit fallback" that makes the investigation bulletproof. CareAtlas already logs agent actions.
```bash
# What the governance audit log holds (the corroborating "what it touched" evidence)
curl -s -u "$U:$P" "https://$SNOW/api/now/table/u_ai_action_audit_log?sysparm_fields=u_log_id,u_agent_identity,u_action_type,u_final_action,u_rejection_reason,sys_created_on&sysparm_query=ORDERBYDESCsys_created_on&sysparm_limit=8" -H "Accept: application/json" | python3 -m json.tool
```
In the portal, this is the existing **LLM02 audit page** (`GovernanceLlm02AuditPage`) and **decision-log** view. During the demo you say: *"And it's not just the platform's map — our own CareAtlas audit trail corroborates exactly what the agent did."*

---

## 4. CAREATLAS APP SIDE — add launch links (no code logic, ~25 min)

Per the chosen scope, the app side is **launch links + using existing pages as corroborating evidence — no backend, no new logic.**

**File:** `src/pages/governance/GovernanceDemoPage.tsx`. There's already a `demoLinks` array (~line 18) rendering launch cards. **Add two entries** so the portal is the launchpad for the UC8 walkthrough:

```typescript
  {
    label: 'Access Map',
    description: 'AI Security & Privacy — agent access topology (the trail)',
    href: `${SNOW_BASE}/now/nav/ui/classic/params/target/%24sn_ai_governance_access_map.do`,
    icon: Network,        // import from lucide-react
  },
  {
    label: 'AI Cases',
    description: 'AI Control Tower — adversarial-attack case record',
    href: `${SNOW_BASE}/now/ai-control-tower/home`,
    icon: ShieldAlert,    // import from lucide-react
  },
```

> ⚠️ **Verify both URLs during Step 1/3 rehearsal.** The Access Map page slug can differ by instance — when you open it via **All > AI Security and Privacy > Access Map**, copy the real URL from the browser into the `href`. Do NOT guess a slug in front of stakeholders.

Add the icon imports at the top (`import { ... Network, ShieldAlert } from 'lucide-react'`). Run `npm run dev`, click each card, confirm it opens the right page.

**The corroborating-evidence page already exists** — the LLM02 audit page (`src/pages/governance/GovernanceLlm02AuditPage.tsx`). No new code; just include it in the walkthrough as the CareAtlas-side trail.

**Backup screenshots:** capture (a) the Access Map suspect node + Tables accessed, (b) the connections/blast radius, (c) the AI Case with Adversarial sub-type. If live navigation lags, you show these.

---

## 5. Verification — prove the trail end-to-end

```bash
# 1. Both roles present (expect 2 rows)
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sys_user_has_role?sysparm_query=user.user_name=interface_gautham^role.nameINsn_ai_governance_ai_steward,sn_ai_case_mgmt.ai_case_analyst&sysparm_fields=role.name" -H "Accept: application/json"

# 2. Backup AI Case exists with adversarial sub-type (after Step 2)
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_ai_case_mgmt_ai_case?sysparm_query=case_subtype=88a5a11d7befd21005de3782f38cb63a&sysparm_fields=number,name,case_subtype,state&sysparm_display_value=all&sysparm_limit=5" -H "Accept: application/json" | python3 -m json.tool

# 3. Suspect agent reachable as both agent + AI system
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_grc_ai_gov_ai_system/20bb87721b110b94d7eaea45604bcb02?sysparm_fields=name,state&sysparm_display_value=all" -H "Accept: application/json"

# 4. CareAtlas corroborating audit rows exist
curl -s -u "$U:$P" "https://$SNOW/api/now/stats/u_ai_action_audit_log?sysparm_count=true" -H "Accept: application/json"
```

**What you point at on stage:** CareAtlas portal → **Access Map** card → suspect node → Tables accessed + connections (blast radius) → **AI Cases** card → AI Case with **Adversarial attack** sub-type, findings pasted in → CareAtlas **audit page** corroborates. Vague suspicion → evidenced, scoped incident record.

---

## 6. Work Breakdown Schedule — half a day (~3.5 hours)

> Walkthrough + AI Case + portal links + rehearsal. Ordered so the provable artifacts come first.

| # | Task | Where | Est. | Depends | Done = |
|---|------|-------|------|---------|--------|
| 0 | Verify access (5 curls in §2) | terminal | 0:10 | — | all pass; both roles present |
| 1 | **Open Access Map, find Patient Data Agent, confirm Tables accessed + connections render** | ServiceNow UI (§3.1) | 0:45 | 0 | suspect node visible, screenshots taken |
| 2 | Pre-create backup AI Case (adversarial sub-type) | curl (§3.2) | 0:10 | 0 | `ACS000xxxx` exists, sub-type confirmed |
| 3 | **Milestone: both hero artifacts proven** (map node + case) | — | 0:10 | 1,2 | ✅ demo can't fail |
| 4 | Rehearse creating an AI Case LIVE in the UI | AICT dashboard (§3.3) | 0:20 | 2 | live create works, sub-type set |
| 5 | Pull CareAtlas corroborating audit trail; open LLM02 page | terminal + portal (§3.4) | 0:15 | 0 | audit rows shown in portal |
| 6 | Add 2 launch-link cards to Demo page + verify real URLs | `GovernanceDemoPage.tsx` (§4) | 0:25 | 1 | each card opens correct page |
| 7 | Capture backup screenshots (node / blast radius / case) | — | 0:15 | 1,2 | 3 images saved |
| 8 | Full rehearsal of the 4-min narrative end-to-end | §7 | 0:25 | all | timed, smooth |
| — | **STRETCH** (only if ahead): try to stage a real access-issue warning | instance | 0:30 | 1 | a warning icon appears on the node |

**Critical path to a working demo = 0 → 1 → 2 → 3 (~1:15).** Everything after enriches the story. If the clock collapses, you can run UC8 with ONLY tasks 0–3 plus screenshots.

---

## 7. The 4-minute demo script (say this on stage)

1. **(20s)** "Prevention isn't perfect. When an AI agent does something unexpected, a security officer must answer two questions fast: *what did it touch, and how far could it have spread?* Here's how CareAtlas answers that."
2. **(30s) The suspicion:** "We've flagged the **Patient Data Agent** — it's live in production right now — for possible over-reach on patient records."
3. **(70s) Follow the trail (Access Map):** open the portal **Access Map** card → find the Patient Data Agent node. "This is the security topology — every agent, workflow, and tool. Here's the agent. **Tables accessed** shows what it *actually* touched over the last month — not what we *designed* it to touch. And these connections are its **blast radius**: the upstream workflows that call it and the downstream tools it can reach."
4. **(40s) Corroborate:** switch to the CareAtlas **audit page**. "Our own audit trail confirms the same actions independently — platform map plus application log, one consistent story."
5. **(50s) Document it (AI Case):** open **AI Cases** → create / show the case with sub-type **Adversarial attack**, findings pasted into the description. "We turn a vague suspicion into a formal, time-tracked incident record — sub-typed for adversarial activity, routed to the right team, audit-ready."
6. **(close, 20s)** "Before: a hunch and no way to scope it. After: an evidenced, scoped, documented incident — exactly what a regulator or auditor asks to see."

---

## 8. Troubleshooting (the failures you'll actually hit)

| Symptom | Cause | Fix |
|---------|-------|-----|
| §2 auth ≠ 200 | wrong creds / instance asleep | re-check `server/.env`; open the instance in a browser to wake it |
| AI Case create fails: "Validate date of occurrence and discovery" | missing dates, or dates in the **future** | set both `date_of_occurrence` and `discovered_date` in the **past**, discovery ≥ occurrence (§3.2) |
| Access Map node has no "Access issues" / no red icon | observability capability sparse on instance (expected) | don't rely on it — use **Tables accessed** + connections + CareAtlas audit trail (§3.1 fallback) |
| Access Map page won't load / slug 404 | instance URL slug differs | navigate via **All > AI Security and Privacy > Access Map**, copy real URL into the portal card `href` |
| Suspect node not found by name | agent named slightly differently | search `sn_aia_agent` for the exact name; suspect = `b579ac0e1b9d0b54d7eaea45604bcb92` |
| Can't create AI Case in UI | missing role | confirm `sn_ai_case_mgmt.ai_case_analyst` (already held); re-login if just granted |
| Sub-type "Adversarial attack" not selectable | wrong field / record | it's `case_subtype` → `sn_grc_case_mgmt_case_type` record `88a5a11d7befd21005de3782f38cb63a` |

---

## 9. Quick reference — verified IDs & facts (so nobody re-investigates)

- **Instance:** `ven04690.service-now.com` · creds in `CareAtlas/server/.env`
- **Suspect — Patient Data Agent:** agent `sn_aia_agent` `b579ac0e1b9d0b54d7eaea45604bcb92` · AI system `sn_grc_ai_gov_ai_system` `20bb87721b110b94d7eaea45604bcb02` (state 3 = Live and Monitor)
- **Access Map:** `All > AI Security and Privacy > Access Map` (or Security & privacy tab → "access map" link) · role `sn_ai_governance_ai_steward` (held)
- **AI Case table:** `sn_ai_case_mgmt_ai_case` (extends `sn_grc_case_mgmt_case` → `sn_grc_case_mgmt_core_case`) · create role `sn_ai_case_mgmt.ai_case_analyst` (held)
- **Sub-type field:** `case_subtype` → reference `sn_grc_case_mgmt_case_type` · **Adversarial attacks** = `88a5a11d7befd21005de3782f38cb63a` (other sub-types incl. `data_breach`-style, `unauthorised_ai_model_usage`, `bias_and_discrimination`, `ai_system_malfunction`)
- **AI Case create gotcha:** business rule rejects future/missing dates — use past `date_of_occurrence` + `discovered_date` (verified payload created `ACS0001003`)
- **Corroborating trail:** `u_ai_action_audit_log` (12+ rows) + decision log; portal page `GovernanceLlm02AuditPage.tsx`
- **Topology data:** `sn_aia_agent` 160 · `sn_grc_ai_gov_ai_system_entity_map` 241 edges · `sn_grc_ai_gov_ai_system` 110
- **Caveat:** `sn_vsc_security_privacy_capabilities` = 0 rows → Access Map red-warning data may be sparse (design around topology + audit, not warnings)

---

*Every table name, field, reference record `sys_id`, role, and the AI-Case create payload in this document was verified against the live `ven04690` instance and the ServiceNow Zurich AI Control Tower documentation ("Using the Access Map", "Create an AI Case in the AI Control Tower") on 2026-06-22. Items to confirm at rehearsal (the Access Map render depth and the two portal URLs) are flagged explicitly with a guaranteed fallback, never assumed.*
