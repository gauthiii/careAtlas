# 27 June Demo Feedback

## Demo Summary

**Context:** This wasn't a normal weekly check-in — Raja Balu joined for the first time alongside Kuppusami, Tanush, Hemalatha, and Sivashankar. The session opened with Kuppusami framing the *stakes*: he's positioning CareAtlas as the basis for an **AI Innovation Center / Center of Excellence proposal for Blue Cross Blue Shield**, with two objectives — (1) win a tactical project at BCBS, (2) build a long-term ServiceNow AI Control Tower practice/book of business. The Monday meeting with "Jack" is the gating step before getting in front of the actual customer.

### What it covered
You walked Raja through the three portals (patient, clinician, governance), then went deep on **5 completed use cases** (out of 7 total — 2 still in progress):

1. **Privacy (PII access control)** — role-based redaction; agents and unauthorized users only see redacted fields unless the `patient_PIA` role is granted.
2. **Regulation/compliance** — AI Control Tower asset lifecycle, risk classification via questionnaires, automated risk→control-objective mapping, impact assessments (HIPAA, EU AI Act, etc.).
3. **Risk / Excessive Agency (least privilege)** — ACLs for both users and agents, human-in-the-loop approval for high-impact actions, demoed via the now-renamed **"secured scheduling agent" vs. "rogue scheduling agent"** (previously "good/bad agent" — that rename from last week's feedback was implemented).
4. **Fairness/non-discrimination monitoring** — 21 fairness metrics (predictive parity, deviation thresholds by ethnicity/gender/age); you clarified this is **not** data poisoning (that's a separate, future use case).
5. **Security / Prompt injection** — Gen AI filter/guardrail blocking injected instructions, with case management auto-created on detection.
6. **Consent & purpose (in progress)** — EU-style consent enforcement; not yet wired into patient/clinician UI.
7. A 7th use case was mentioned as pending but not detailed in the demo itself.

You also showed the custom MCP server / knowledge repository you built from ServiceNow's docs (since the AI Control Tower docs were updated ~June 12 and post-date general AI model knowledge) — this got a strong positive reaction.

### Did it go well?
**Yes — clearly positive**, but with substantive direction-setting feedback rather than "well done, ship it."

- Raja (seeing it for the first time): *"it's awesome,"* found the governance/application story clear, though he flagged that the ServiceNow/AI Control Tower backend mechanics are invisible in the demo and want a separate deep-dive session with you on that.
- Kuppusami: reiterated last week's praise, said the team is now "comfortable with the platform" and can "go broad" — but pushed hard on **narrative structure**, not technical gaps.
- The custom MCP/knowledge-repo work got an enthusiastic "amazing piece of work"-style reaction — Kuppusami connected it to a broader idea he and Raja had discussed about building internal documentation repositories to dramatically improve team problem-solving speed, calling it a differentiation/amplifier opportunity (not commercial).

### Feedback / things to address

**1. Adopt a 4-step "before/after" storytelling structure for every use case** (his main structural ask, using Tanush's "three-layer model" as the framework):
   - Normal business process → where AI/agents add value
   - The risk: how the agent's capabilities could be exploited (show the damage/impact **before** controls)
   - The control: what you put in place to prevent it
   - Re-attempt the same exploit **after** the control — prove it now fails
   - Don't skip the "before" damage demonstration — that contrast is what sells the control's value.

**2. Stop selling the technology/plumbing — sell the platform and the outcome.**
   - Don't walk customers through ACLs, agent configs, "nuts and bolts." Lead with business problem → risk → control → benefit/differentiation.
   - The pitch should land on: *"This is possible because of the ServiceNow AI Control Tower platform, and we have the expertise to set it up for you"* — not a tour of features.

**3. Sharpen the narrative/storytelling layer separately from continued technical build-out.** He was explicit that this is "both," not "either/or" — keep building depth, but invest real time in the story.

**4. Terminology fixes** (smaller, in-demo):
   - "Good/bad agent" → confirmed renamed to **secured scheduling agent / rogue scheduling agent** ✅ (done, per last week's feedback)
   - You misnamed the PII use case as "SUD" mid-demo — Raja and Kuppusami corrected this; needs cleanup in your materials/scripts so the terms are used correctly and consistently.
   - "Queue" vs. "case load" terminology for the clinician dashboard — open item, you said you'd look into proper terminology.

**5. Tanush's flagged technical point:** prompt-injection protection via the Guardrail/Gen AI filter doesn't cover **supply-chain risk** for third-party LLMs (e.g., model-specific prompt injection weaknesses in Claude, OpenAI, etc.). Since you're using native ServiceNow Agent Studio rather than external LLM providers directly, this may be lower priority — but Tanush suggested explicitly scoping out what's *not* applicable (no third-party LLM = no third-party supply-chain risk) as part of refining the use cases.

**6. Fairness monitoring gap (acknowledged, not yet solved):** ServiceNow's GRC doesn't auto-correct fairness deviations — remediation is manual via incident/case management. Kuppusami flagged a related, broader question to "take offline": **how do you validate/test third-party or self-trained agents before bringing them into the business**, especially against data-poisoning-style risk — explicitly deferred to a future use case, not for this sprint.

**7. Regulatory framework answer (resolved in the meeting):** For the North America equivalent of the EU AI Act consent/purpose use case, Kuppusami pointed you to **42 CFR Part 2, HIPAA, HITECH/HITRUST**, and Sivashankar added **Massachusetts state regulations** — these map to your "consent and purpose" use case.

### Next actionable items
- **Send Kuppusami all 7 use cases** (including the 2 in-progress) for story planning.
- **Finalize the 2 remaining use cases** (consent/purpose completion + the 7th).
- **Rework all 7 use case narratives** using the 4-step before/after framework, working with Tanush on the 3-layer model slide (he's sharing it with you).
- **Research North America regulatory equivalents** (42 CFR Part 2 / HIPAA / HITRUST / Mass. regs) for the consent & purpose use case — ask Sivashankar if stuck.
- **Timeline:** Everything on the application side wrapped by **Wednesday (July 1)**; Thursday/Friday for story prep + delivery rehearsal; internal full dry-run **next Saturday (July 4)**; if green-lit, demo to **Jack on Monday**.
- **Schedule a story-walkthrough session with Kuppusami** (tentatively tomorrow evening — he couldn't commit a firm time yet) before declaring the use cases "done," specifically to avoid rework.
- **Raja wants a separate 1:1 technical deep-dive** with you on the AI Control Tower / ServiceNow backend mechanics that aren't visible in the demo.
- Your own ask (acknowledged but deferred by Kuppusami): dedicated time to learn AI Control Tower/GRC foundations more deeply — approved, but **after** this Saturday's deadline, not before.
- Sivashankar separately mentioned a drafted email to "Arctic Wolf" pending Raja's review — unrelated to CareAtlas but flagged at the end of the call.


-----

Detailed Report

# CareAtlas AI Governance Demo — June 27, 2026

**Meeting:** AI Governance Demo
**Date:** June 27, 2026, 5:03 PM – 6:00 PM (57 min)
**Attendees:** Gautham Vijayaraj, Kuppusami Natesan, Rajah Balu, Tanush Kuppusami, Hemalatha Gurunathan, Sivashankar Balamuralikrishnan

---

## 1. Context

This was not a routine weekly check-in. Rajah Balu ("Raja sir") joined for the **first time**, alongside Kuppusami, Tanush, Hemalatha, and Sivashankar.

Kuppusami opened by framing the strategic stakes: CareAtlas is being positioned as the foundation for an **AI Innovation Center / Center of Excellence proposal for Blue Cross Blue Shield (Vermont)**. Two objectives were stated explicitly:

1. **Tactical, short-term:** Win a paid project at Blue Cross Blue Shield.
2. **Strategic, long-term:** Build a real book of business around ServiceNow's AI Control Tower (AICT) and AI Risk & Compliance (AIRC) practice.

A meeting with **"Jack"** (internal stakeholder) on **Monday, June 29** is the gating step before getting in front of the actual customer.

---

## 2. What the Demo Covered

Walked Raja through all three CareAtlas portals (patient, clinician, governance), then went deep on **5 completed use cases** (out of 7 total — 2 still in progress):

| # | Use Case | Category | Status |
|---|----------|----------|--------|
| 1 | **Privacy (PII access control)** — role-based redaction; agents/unauthorized users see redacted fields unless `patient_PIA` role is granted | Privacy / OWASP LLM02 | ✅ Complete |
| 2 | **Regulation / Compliance** — AI Control Tower asset lifecycle, risk classification questionnaires, automated risk→control mapping, impact assessments (HIPAA, EU AI Act) | Regulation | ✅ Complete |
| 3 | **Risk / Excessive Agency (least privilege)** — ACLs for users *and* agents, human-in-the-loop approval for high-impact actions. Demoed via renamed **"secured scheduling agent" vs. "rogue scheduling agent"** | Risk | ✅ Complete |
| 4 | **Fairness / Non-discrimination monitoring** — 21 fairness metrics (predictive parity, deviation thresholds by ethnicity/gender/age) | Fairness | ✅ Complete |
| 5 | **Security / Prompt injection** — Gen AI filter / guardrail blocking injected instructions, auto case-management on detection | Security | ✅ Complete |
| 6 | **Consent & Purpose** — EU-style consent enforcement; not yet wired into patient/clinician UI | Consent | 🟡 In progress |
| 7 | *(Pending — not detailed in this demo)* | — | 🟡 In progress |

**Other notable items shown:**
- The **"good agent / bad agent" naming was renamed** to "secured scheduling agent" / "rogue scheduling agent" — addressing feedback from the prior week's demo.
- Use Case 4 was clarified as **fairness/non-discrimination**, *not* data poisoning — data poisoning is a distinct, deferred use case requiring further research.
- A custom **MCP server / knowledge repository** built from ServiceNow's AICT/AIRC documentation (since official docs were updated ~June 12, more recent than general AI model knowledge) was demoed and got a strongly positive reaction.

---

## 3. Did It Go Well?

**Yes — clearly positive**, but with substantive direction-setting feedback rather than "ship it as-is."

- **Raja** (first time seeing it): *"it's awesome"* — found the governance/application story clear from a customer-demonstration standpoint. Flagged that the ServiceNow/AICT backend mechanics are invisible in the demo ("all sort of behind the scenes") and wants a separate technical deep-dive session.
- **Kuppusami:** Reiterated prior praise — the team is now "comfortable with the platform" and able to "go broad." Pushed hard on **narrative structure**, not technical gaps.
- **MCP/knowledge-repo work:** Got an enthusiastic reaction — Kuppusami called it a **differentiation/amplifier opportunity** (not commercial) and connected it to a broader idea about building internal documentation repositories to dramatically speed up team problem-solving.

---

## 4. Feedback & Issues Raised

### 4.1 Core structural feedback — the "4-step before/after" framework

Kuppusami's main piece of feedback, building on Tanush's "three-layer model" (Process → Risk → Control):

> For every use case, walk through:
> 1. **Normal business process** — where AI/agents add value
> 2. **The risk** — how the agent's capabilities could be exploited (show the damage/impact **before** any control is applied)
> 3. **The control** — what was put in place to prevent it
> 4. **Re-attempt the same exploit after the control** — prove it now fails

**Key point:** Don't skip the "before" damage demonstration — that contrast is what sells the value of the control. This directly extends last week's "rogue agent" framing.

### 4.2 Stop selling the technology — sell the platform and outcome

- Don't walk customers through ACLs, agent configs, or "nuts and bolts."
- Lead with: **business problem → risk → control → benefit/differentiation.**
- The pitch should land on: *"This is possible because of the ServiceNow AI Control Tower platform, and we have the expertise to set it up for you"* — not a feature tour.
- Quote: *"Don't sell the technology. Don't sell the nuts and bolts. Don't show them all the tools that you have in your tool bag."*

### 4.3 Sharpen storytelling — in parallel with continued technical build-out

Explicitly **"both, not either/or."** Continue building depth, but invest real, dedicated time in the narrative layer separately.

### 4.4 Terminology fixes

| Issue | Resolution needed |
|---|---|
| "Good/bad agent" | ✅ Already renamed to **secured scheduling agent / rogue scheduling agent** |
| Misnamed "SUD" use case mid-demo (corrected live by Raja/Kuppusami — it's actually the **PII** use case) | Needs cleanup across scripts/materials so terminology is consistent |
| "Queue" vs. "case load" for clinician dashboard | Open — Raja asked about correct terminology; still to be resolved |

### 4.5 Tanush's technical flag — supply chain risk

Now Assist Guardian's prompt-injection protection covers the **native ServiceNow orchestration layer**, but does **not** cover model-specific prompt-injection weaknesses in third-party LLMs (e.g., Claude, OpenAI) if those are ever introduced. Since CareAtlas currently uses native Agent Studio (not external LLM providers), this risk may not currently apply — but should be explicitly scoped in/out as use cases are refined.

### 4.6 Fairness monitoring gap (acknowledged, not yet solved)

ServiceNow's GRC **does not auto-correct** fairness/predictive-parity deviations — remediation is manual via incident/case management. Confirmed against official documentation: **no automated bias-correction mechanism exists in AIRC out of the box.** This is a genuine platform boundary, not a gap in the build — good to cite confidently with the customer as "platform does X out of the box, our expertise fills the rest."

Kuppusami separately flagged a broader, **deferred** question: how do you validate/test third-party or self-trained agents before bringing them into the business (relevant to future data-poisoning use case)? **Not for this sprint** — explicitly saved for later.

### 4.7 Regulatory framework — resolved in the meeting

For the North America equivalent of the EU AI Act consent/purpose use case:
- **42 CFR Part 2**
- **HIPAA / HITECH / HITRUST**
- **Massachusetts state regulations** (added by Sivashankar)

These map directly to the "Consent and Purpose" use case (Use Case 6/7).

---

## 5. ServiceNow Mechanism Verification

Cross-checked the demoed mechanisms against official ServiceNow AICT/AIRC/Now Assist documentation:

| Demoed feature | Official ServiceNow mechanism | Verified |
|---|---|---|
| PII redaction ("Gen AI filter") | Now Assist Guardian sensitive-topic/PII guardrails; AI Gateway "Activate PII check" (if MCP-routed) | ✅ |
| Regulation / RAM classification → auto risk-control mapping | **Post Assessment Actions** (`sn_smart_imp_auto`) — matches almost exactly, including the FRIA "Yes → bias risk mapped" example | ✅ |
| Excessive agency / least privilege, "rogue agent" | **ACLs + Role Masking + User Identity** (three-layer model in AI Agent Studio); **Supervised execution mode** for human-approval steps | ✅ |
| "Test ACL for agent" / terminal response | **"Test access" test type** in AI Agent Studio → results open in **Access Analyzer** | ✅ |
| Prompt injection scanning + case management | **Now Assist Guardian** Offensiveness/Prompt Injection guardrails (Log / Block and log); dedicated **Prompt Injection dashboard** in Now Assist Center (not yet used — potential demo enhancement) | ✅ |
| Tanush's supply-chain/third-party LLM concern | Confirmed accurate — Guardian protects the native orchestration layer only; third-party LLM connections introduce uncovered risk | ✅ |
| Fairness auto-correction gap | Confirmed — no documented automated debiasing mechanism in AIRC | ✅ (gap confirmed, not a build miss) |

---

## 6. Next Actionable Items

| # | Action | Owner | Notes / Deadline |
|---|--------|-------|----|
| 1 | Send all **7 use cases** (including 2 in-progress) to Kuppusami | Gautham | For story planning |
| 2 | Finalize the **2 remaining use cases** (consent/purpose completion + 7th) | Gautham + team | Before app freeze |
| 3 | Rework **all 7 use case narratives** using the 4-step before/after framework | Gautham + Tanush | Use Tanush's 3-layer model slide as template |
| 4 | Research North America regulatory equivalents (42 CFR Part 2 / HIPAA / HITRUST / Mass. regs) for consent & purpose use case | Gautham (ask Sivashankar if stuck) | In progress |
| 5 | Clean up terminology inconsistencies (PII vs. SUD, queue vs. case load) | Gautham | Before next demo |
| 6 | **Application/build freeze** | Team | **Wednesday, July 1 (US time)** |
| 7 | Story prep + delivery rehearsal | Gautham + Kuppusami | Thursday–Friday |
| 8 | **Full internal dry-run demo** | Full team | **Saturday, July 4** |
| 9 | If green-lit internally → demo to **Jack** | Gautham + Kuppusami | **Monday, June 29** *(per opening of meeting — confirm sequencing with item 8)* |
| 10 | If Jack approves → demo to customer (**Blue Cross Blue Shield, Vermont**) | Team | ~1 week after Jack demo |
| 11 | Schedule **story-walkthrough session with Kuppusami** before declaring use cases "done" | Gautham | Tentatively "tomorrow evening" — time not yet confirmed by Kuppusami |
| 12 | Schedule **separate technical deep-dive** on AICT/AIRC backend mechanics | Gautham + Raja | Not yet scheduled |
| 13 | Dedicated time for Gautham to learn AICT/GRC foundations more deeply | Gautham | **Approved by Kuppusami, but only after July 4 deadline** — not before |
| 14 | Consider activating the **Prompt Injection dashboard** in Now Assist Center for live monitoring evidence in the demo | Gautham | Optional enhancement, not yet built |

> **Note on timeline sequencing:** Kuppusami's opening remarks referenced "a demo with Jack on Monday" while later in the same call he set the internal dry-run for "next Saturday" (July 4) — after Wednesday's build freeze. Worth confirming with Kuppusami directly whether the Jack demo is **before or after** the July 4 internal rehearsal, since the stated order in the second half of the call (freeze → rehearse → internal demo → Jack) postdates Monday, June 29.

---

## 7. Side Item (Unrelated to CareAtlas)

Sivashankar mentioned a drafted email to **"Arctic Wolf"** pending Raja's review — flagged at the very end of the call, not connected to this project.

---

*Document prepared from the June 27, 2026 meeting transcript and verified ServiceNow AICT/AIRC/Now Assist documentation.*

