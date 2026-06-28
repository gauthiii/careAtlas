# July 4 Plan — Feedback Received & Pending Actionable Items

**Prepared:** 2026-06-27 · **Target dry-run:** Saturday, July 4, 2026 (internal "board presentation")
**App-side freeze:** Wednesday, July 1 · **Story prep:** Thursday–Friday, July 2–3
**Instance:** `ven04690.service-now.com` · **App:** CareAtlas (React/Vite + FastAPI `server/app/*`)

---

## 0. Locked decisions for this cycle (no ambiguity)

These were confirmed before planning — every item below honours them:

1. **Scope = the 6 use cases already demoed.** No 7th use case, no data-poisoning build this cycle.
   The six are: **UC1 Privacy · UC2 Risk · UC3 Regulation · UC5 Security · UC6 Fairness · UC10 Consent.**
2. **Regulatory anchor = North America only.** **NIST AI RMF 1.0** as the AI-governance frame,
   **HIPAA + 42 CFR Part 2** (plus HITECH/HITRUST, Massachusetts regs as supporting) for
   privacy/consent/security. **Retire the EU AI Act / FRIA framing everywhere** (app + story + docs).
3. **Build = current CareAtlas hospital app only.** Rework the *narrative*; do **not** start BCBS
   payer use cases (prior auth / claims) this cycle — that is a later phase after Jack green-lights.
4. **Two parallel tracks, not either/or** (Kuppusami's explicit instruction): (A) finish the
   application/build by July 1, and (B) sharpen the story for July 2–3.

---

## 1. Live instance reality check (probed read-only on `ven04690`, 2026-06-27)

Verifying what is *actually* running today — two material changes since the June 26 plan:

| Evidence (table) | June 22/26 plan | **Today (2026-06-27)** | Meaning |
|---|---|---|---|
| `sn_ai_case_mgmt_ai_case` | 0 | **25** | ✅ UC5 prompt-injection **is now auto-creating AI Cases live** (was "demo creates first row") |
| `sn_si_incident` (`consent_purpose_violation`) | 0 | **4** | ✅ UC10 **runtime ConsentGate is now firing real incidents** — UC10 is effectively complete, not "in progress" |
| `sn_grc_ai_gov_ai_system` | 111 | 111 | Governed AI systems present |
| `sys_gen_ai_filter` (active) | 3 | **6** | More content filters active |
| `sys_user` (`svc-*`) | 9 | **11** | Scoped agent identities present |
| `sn_smart_imp_auto_assessment_action` | 54 | 54 | Post Assessment Actions present |
| `sn_compliance_control` | 393 | **399** | Control library present |
| `u_ai_decision_log` | 17 | 17 | Anonymized audit rows present |

> **Net:** all six use cases are **live-demonstrable today.** What is missing is **not capability** —
> it is (a) the *before-the-control damage* contrast on most use cases, (b) the NA regulatory
> re-labelling, and (c) terminology/loose-end cleanup. That matches the feedback exactly.

---

## 2. Feedback received (consolidated, both weeks)

### 2.1 Strategic context (Jun 27 — Raja Balu joined for the first time)
- CareAtlas is the basis for an **AI Innovation Center / Center of Excellence proposal for
  Blue Cross Blue Shield (Vermont)**. Two goals: (1) tactical — win a paid BCBS project;
  (2) strategic — build a ServiceNow **AI Control Tower** book of business.
- **Jack** is the interim gate ("treat Jack like the customer"). Internal dry-run first, then Jack,
  then customer.
- Reaction: **clearly positive.** Raja: *"it's awesome."* Kuppusami: team is "comfortable with the
  platform," can "go broad." The custom **MCP/knowledge-repo** got an "amazing piece of work"
  reaction — positioned as an internal **differentiation/amplifier**, not a commercial product.

### 2.2 The core structural feedback — adopt a 4-step "before / after" narrative
Built on **Tanush's three-layer model** (Process → Risk → Control). For **every** use case:

1. **Normal business process** — where AI/agents add value.
2. **The risk** — how the agent's capability can be exploited; **show the damage *before* any control.**
3. **The control** — what was put in place.
4. **Re-attempt the same exploit *after* the control** — prove it now fails.

> The single biggest miss today: we jump straight to the control. **Without the "before" damage,
> the control has nothing to contrast against.** (Reference format = Tanush's `Sample_AI_Use_Case_
> Process_Flows.pdf`: a 5-box process flow with the AI step in red + human step in green, three
> risk cards, one control bar.)

### 2.3 Stop selling the plumbing — sell the platform & the outcome
- Don't tour ACLs, agent configs, "nuts and bolts." Lead: **business problem → risk → control →
  benefit/differentiation.**
- Land the pitch on: *"This is possible because of the ServiceNow AI Control Tower platform, and we
  have the expertise to set it up for you."* (Direct quote: *"Don't sell the technology. Don't sell
  the nuts and bolts. Don't show them all the tools in your tool bag."*)

### 2.4 Demo delivery discipline (carried from Jun 20, still applies)
- **Agenda → demo → recap** structure; lead with a strong **hook**.
- **Stay focused** — no "you can also do this/that" tangents mid-demo.
- **Tailor to the audience** (internal vs Jack vs customer).
- **Maximise out-of-the-box ServiceNow**, minimise custom logic (and *say* what's native).

### 2.5 Terminology fixes
- "good/bad agent" → **secured scheduling agent / rogue agent** ✅ done.
- **Stop calling UC1 "SUD"** — it is the **PII / Privacy** use case. (Already clean in code; fix in
  talk-track + any slide so it's never said live again.)
- **"Queue" vs "case load"** — Raja asked for the correct clinical term; resolve and use consistently.

### 2.6 Tanush's technical flag — third-party LLM supply-chain risk
Now Assist Guardian covers the **native ServiceNow orchestration layer**, not model-specific
prompt-injection weaknesses in third-party LLMs (Claude, OpenAI, etc.). **CareAtlas uses native
Agent Studio → no third-party LLM → that supply-chain risk is out of scope.** Action: **explicitly
scope it out** in the UC5 narrative (turn the gap into a credibility point).

### 2.7 Fairness boundary (UC6) — acknowledged, not a build miss
ServiceNow AIRC does **not** auto-correct fairness/predictive-parity deviations; remediation is
**manual via incident/case management.** Confirmed against docs — a genuine *platform boundary*.
Cite it confidently: *"the platform detects + governs; remediation is a controlled human workflow."*

### 2.8 Regulatory answer (resolved in-meeting)
NA equivalents for the consent/purpose use case: **42 CFR Part 2, HIPAA, HITECH/HITRUST,
Massachusetts state regs** (Sivashankar: "HIPAA, HITECH, HITRUST and 42 CFR Part 2... and
Massachusetts"). Kuppusami: *"that's your 42 CFR Part 2 use case."*

---

## 3. Pending actionable items (scoped to the 6 use cases)

### 3.1 Application / build — must land by **Wed July 1**
| # | Item | Use case | Type | Status today |
|---|---|---|---|---|
| A1 | Build the **"before-the-control" exploit demo** for each UC (see `before-damage-demo-gaps.md`) | All 6 | React/data | ⬜ Main gap |
| A2 | **Retire EU AI Act / FRIA → NIST AI RMF + HIPAA + 42 CFR Part 2** across app (36 refs, 7 files) | UC3, UC10 | React + server | ⬜ |
| A3 | Wire **42 CFR Part 2 / HIPAA** as the consent regulatory basis on the consent demo page | UC10 | React | ⬜ |
| A4 | Decide + execute **UC1 Wall-2 PII output filter**: wire at runtime *or* frame as platform-native (record is active, not invoked) | UC1 | server (or talk-track) | ⬜ Decision |
| A5 | Add **UC6 manual-remediation path** (incident/case raised from a skew alert) so the boundary has a visible answer | UC6 | React + server | ⬜ |
| A6 | Fix loose end: `fetchConsentCoverage` → `/api/governance/consent-coverage` is **unbacked** (404) — implement or remove | UC10 | server/React | ⬜ |
| A7 | UC10 doctor-side block needs a **representative patient pre-seeded** with `notes_summarisation` off for a live block | UC10 | data/setup | ⬜ |
| A8 | Confirm UC3 **role/version** prereqs: `ai_risk_and_compliance_manager` on demo user + AIRC 22.0.3+ to (re)run NA assessment cleanly | UC3 | ServiceNow config | ⬜ Verify |
| A9 | Terminology: scrub "SUD" from talk-track; resolve **queue vs case load** and apply | UC1, clinician UI | copy | ⬜ |
| A10 | *(Optional enhancement)* Activate the **Prompt Injection dashboard** in Now Assist Center for live monitoring evidence | UC5 | ServiceNow config | ⬜ Optional |

### 3.2 Narrative / story — **July 2–3** (after freeze)
| # | Item | Owner |
|---|---|---|
| N1 | Rework all **6 UCs into the 4-step before/after** structure (draft in `usecase-narratives-4step.md`) | Gautham + Tanush |
| N2 | Get Tanush's **3-layer model slide**; align our 6 to that template | Tanush → Gautham |
| N3 | Re-sequence the demo: **hook → agenda → per-UC (process→risk→damage→control→re-test) → "it's the platform + our expertise" close** | Gautham + Kuppusami |
| N4 | **Send Kuppusami all 6 use cases** for story planning (do this first, before "declaring done") | Gautham |
| N5 | **Story-walkthrough session with Kuppusami** before locking — avoids rework | Gautham |
| N6 | NA regulatory research write-up (42 CFR Part 2 / HIPAA / HITECH / HITRUST / Mass.) mapped per UC | Gautham (ask Sivashankar) |

### 3.3 Deferred — explicitly NOT this cycle (record so nothing silently slips)
- **7th use case / Data Poisoning (UC7)** — dropped this cycle (model-risk app not installed; Kuppusami: "save for future").
- **Third-party / self-trained agent validation** before onboarding — future use case (Kuppusami "take offline").
- **BCBS payer use cases** (prior auth, claims fraud, FWA, underwriting) — later phase, post-Jack.
- **Gautham's AICT/GRC foundations deep-dive** — approved by Kuppusami **after** July 4, not before.
- **Raja's 1:1 technical deep-dive** on the AICT/ServiceNow backend mechanics — schedule separately.
- *(Non-CareAtlas)* Sivashankar's Arctic Wolf email — unrelated, tracked elsewhere.

---

## 4. Timeline & sequencing (confirm with Kuppusami)

| Date | Day | Focus |
|---|---|---|
| Jun 28 | Sun | Build: A1 (before-damage demos) for UC1/UC2/UC5 + A2 (EU→NA retire) |
| Jun 29 | Mon | Build: A1 for UC3/UC6/UC10 + A3, A5 |
| Jun 30 | Tue | Build: A4, A6, A7, A9 + A8 verify; integration pass |
| **Jul 1** | **Wed** | **App freeze.** Smoke-test full run on all 6; lock live numbers |
| Jul 2 | Thu | Story: N1–N3 (4-step rework, sequencing) |
| Jul 3 | Fri | Story: N5 walkthrough with Kuppusami; rehearse |
| **Jul 4** | **Sat** | **Internal dry-run** ("board presentation"); if green → Jack |

> **Open sequencing question for Kuppusami:** his opening referenced a *Jack demo Monday (Jun 29)*,
> but the freeze→rehearse→dry-run order he set later puts Jack **after** July 4. Confirm before Sunday.

---

*See `plan-of-action.md` (React + ServiceNow WBS + effort), `usecase-narratives-4step.md`
(4-step story content per UC), and `before-damage-demo-gaps.md` (the exploit demos to build).*
