# Plan of Action — Week of June 28 → July 4

**Goal:** All application/build work **done by Wed July 1**; July 2–3 for story; **dry-run July 4.**
**Scope:** 6 use cases (UC1 Privacy · UC2 Risk · UC3 Regulation · UC5 Security · UC6 Fairness · UC10 Consent).
**Regulatory anchor:** NIST AI RMF + HIPAA + 42 CFR Part 2 (NA-only). EU AI Act / FRIA retired.
**App:** React/Vite (`src/*`) + FastAPI (`server/app/*`) · **Instance:** `ven04690.service-now.com`.

> **Guiding principle for every task:** we are not adding capability — all 6 are live. We are
> (1) building the *before-the-control damage* contrast, (2) re-labelling EU→NA, and (3) cleaning
> loose ends + terminology. Keep changes out-of-the-box / config-first; minimise custom logic.

---

> **Progress — 2026-06-28 (end of day): ALL REACT WORK COMPLETE. BACKEND S1–S7 COMPLETE.**
> R1–R12 all done. S1 (UC3 prereq verified), S2 (DG1 High-risk confirmed), S3 (Wall-2 decided:
> platform-native), S4 (UC6 remediation endpoint live — SIR0010010 created on instance), S5 (A6
> resolved), S6 (A7 done), S7 (FRIA→AI Impact Assessment query updated). `tsc` + `npm run build`
> clean. **Remaining build work:** S8 (optional: PI dashboard), S9 (freeze verify on Jul 1).
> **Story track (Jul 2–3):** N1 written; N2–N6 pending.

## 1. React side — work breakdown

| ID | Status | Task | Files (primary) | Effort | Depends on |
|---|---|---|---|---|---|
| R1 | ✅ Done | **Before/after toggle** + interactive **`SimChat` type-and-send console** for the "before" pane (sample chips → Send → result) | `components/governance/BeforeAfterDemo.tsx` (new, exports `BeforeAfterDemo` + `SimChat`), reused on each `demo/*Page.tsx` | 0.5 d | — |
| R2 | ✅ Done | **UC1 Privacy** "before": rogue agent reads PII (sim) → then ACL-secured agent denied (live) | `demo/PrivacyPage.tsx`, `RoleBasedRedactionDemo.tsx`, `PiiRedactionDemo.tsx` | 0.5 d | R1 |
| R3 | ✅ Done | **UC2 Risk** "before": rogue agent performs high-impact action with no gate (sim) → then approval gate stops secured agent (live) | `demo/RiskPage.tsx`, `ApprovalGateDemo.tsx` | 0.5 d | R1 |
| R4 | ✅ Done | **UC5 Security** "before": injection **obeyed** by agent (sim) → then blocked + AI Case opened (live) | `demo/SecurityPage.tsx`, `InjectionTesterDemo.tsx` | 0.5 d | R1 |
| R5 | ✅ Done | **UC6 Fairness** "before": skewed allocation shown (13.1pp, sim) → debias toggle (live). **"Raise remediation incident" button wired** — calls `POST /api/governance/fairness/remediation`, links to live incident number. | `demo/FairnessPage.tsx`, `FairnessDebiasDemo.tsx` | 0.5 d | R1, S4 |
| R6 | ✅ Done | **UC10 Consent** "before": agent processes non-consented patient (sim) → ConsentGate blocks + incident (live). *(Live doctor-side block still needs A7 seed.)* | `demo/ConsentPage.tsx`, `ConsentEnforcementPanel.tsx` | 0.5 d | R1, A7 seed |
| R7 | ✅ Done | **UC3 Regulation** "before": ungoverned/unclassified agent (sim) vs governed High-risk agent w/ AI Impact Assessment (live). *(S2 NA reframe separate.)* | `demo/RegulationPage.tsx` | 0.5 d | S2 |
| R8 | ✅ Done | **Retire EU AI Act → NIST AI RMF + HIPAA + 42 CFR Part 2** in all UI copy — `GovernanceAgenda26Page.tsx` EU refs retired; other files were already clean. | `GovernanceAgenda26Page.tsx` | 0.5 d | — |
| R9 | ✅ Done | **Terminology:** "SUD" confirmed absent from all code. "Clinic queue" confirmed correct clinical term — no change needed. | — | 0.25 d | A9 resolved |
| R10 | ✅ Done | **Consent regulatory basis** copy: `ConsentPage.tsx` intro now surfaces "42 CFR Part 2 · HIPAA Purpose Limitation · HITECH". | `demo/ConsentPage.tsx` | 0.25 d | — |
| R11 | ✅ Done | **A6** — removed the dead `fetchConsentCoverage()` + `ConsentCoverageResponse` (unused). | `services/serviceNow.ts` | 0.25 d | — |
| R12 | ✅ Done | **A7** — `DoctorConsentBlockDemo` on the consent page: live Notes-agent block vs Scheduling-agent allow on a dedicated opted-out patient (by sys_id). | `components/governance/DoctorConsentBlockDemo.tsx` (new), `demo/ConsentPage.tsx` | 0.25 d | A7 seed |

**React subtotal: ✅ ALL DONE — R1–R12 complete. No remaining React work.**

---

## 2. ServiceNow / backend side — work breakdown

| ID | Task | Where | Effort | Notes |
|---|---|---|---|---|
| S1 | **Confirm UC3 prereqs:** demo user holds `ai_risk_and_compliance_manager`; AIRC ≥ 22.0.3; "Migrate to Advanced Risk Assessments" decision (one-way) | ServiceNow admin | 0.25 d | ✅ **Done** — `sn_grc_ai_gov.ai_risk_and_compliance_manager` confirmed on `interface_gautham`. Decision: fall back to read-only evidence (no one-way migration). |
| S2 | **Re-frame UC3 assessment as NA:** confirm `Triage Appointment DG1` = High-risk, AIA attached, tasks present | AIRC Assessment Workspace | 0.5 d | ✅ **Done** — DG1 verified: `inherent_rating=High (7.11)`, `risk_classification=High`, 5 assessment tasks live. Demo shows read-only evidence. |
| S3 | **UC1 Wall-2 decision:** scope as platform-native (decided) | talk-track | — | ✅ **Decided** — `CareAtlas PII Output Guard` (sys_gen_ai_filter) is active; framed as platform capability in talk-track. No runtime wiring this cycle. |
| S4 | **UC6 manual remediation endpoint:** raise an incident/case from a fairness skew alert | `server/app/main.py` + `servicenow.py` | 0.5 d | ✅ **Done** — `POST /api/governance/fairness/remediation` raises live `sn_si_incident` (category=`fairness_bias_alert`); tested live → SIR0010010 created on instance. |
| S5 | ~~Implement `GET /api/governance/consent-coverage`~~ | — | — | ✅ **Resolved (A6)** — caller removed instead (it was dead code); no endpoint needed |
| S6 | **Seed UC10 opted-out patient** with `notes_summarisation` OFF for a live doctor-side block | `u_patient` data | 0.25 d | ✅ **Done (A7)** — *Giuseppe Hernandez* (`8e93bda2…`) set to `scheduling,reminders,triage`; verified Notes blocked / Scheduling allowed |
| S7 | **Retire EU AI Act in backend models/strings** | `server/app/servicenow.py` | 0.25 d | ✅ **Done** — FRIA template query in `servicenow.py` updated to "AI Impact Assessment"; now returns 6 accurate active actions (vs 48 EU-framed). Total 54 Post Assessment Actions unchanged. |
| S8 | *(Optional)* Activate **Prompt Injection dashboard** in Now Assist Center | ServiceNow config | 0.25 d | ⬜ Optional — 25 AI Cases live is sufficient for July 4; defer unless time permits |
| S9 | **Freeze verification:** re-run read-only probe; lock live numbers for story | `server/scripts/*audit*readonly.sh` | 0.25 d | ⬜ Do on **Jul 1** freeze day |

**ServiceNow/backend subtotal: S1–S7 done · S8 optional · S9 on Jul 1.**

---

## 3. Structured Work Breakdown (by day)

```
SUN Jun 28  ── ALL BUILD WORK COMPLETE ✅
  ✅ R1  Before/after component + SimChat  (DONE 06-27, commit 12d4306)
  ✅ R2  UC1 before-damage                 (DONE 06-27)
  ✅ R3  UC2 before-damage                 (DONE 06-27)
  ✅ R4  UC5 before-damage                 (DONE 06-27)
  ✅ R6  UC10 before-damage                (DONE 06-27)
  ✅ R7  UC3 before-damage                 (DONE 06-27)
  ✅ R11 dead fetchConsentCoverage removed (DONE 06-27)
  ✅ R12 DoctorConsentBlockDemo + seed     (DONE 06-27)
  ✅ R5  UC6 remediation button            (DONE 06-28)
  ✅ R8  EU→NA retire (UI)                 (DONE 06-28)
  ✅ R9  Terminology confirmed (no change) (DONE 06-28)
  ✅ R10 Consent regulatory basis copy     (DONE 06-28)
  ✅ S1  UC3 prereq confirmed              (DONE 06-28)
  ✅ S2  DG1 High-risk verified read-only  (DONE 06-28)
  ✅ S3  Wall-2 decided: platform-native   (DONE 06-28)
  ✅ S4  UC6 remediation endpoint (live)   (DONE 06-28, SIR0010010)
  ✅ S5  consent-coverage removed (A6)     (DONE 06-27)
  ✅ S6  Giuseppe Hernandez seeded (A7)    (DONE 06-27)
  ✅ S7  Backend EU→NA strings             (DONE 06-28)

TUE Jun 30  ── Integration pass
  Smoke-test all 6 UCs end-to-end from all 3 portals (patient / doctor / governance)
  Regression: approval gate, ConsentGate, injection block

WED Jul 1   ── FREEZE
  S9: re-probe all 7 ServiceNow tables; lock live numbers for story
  S8 (optional): PI dashboard in Now Assist Center if time

THU Jul 2   ── Story
  N4 send 6 UCs to Kuppusami (do first)
  N2 get Tanush's 3-layer slide
  N3 demo re-sequencing (hook → agenda → 6 UCs → close)

FRI Jul 3   ── Story
  N5 Kuppusami walkthrough + rehearse
  N6 NA regulatory write-up (42 CFR / HIPAA / HITECH / HITRUST / Mass.) mapped per UC

SAT Jul 4   ── Internal dry-run → (if green) Jack
```

---

## 4. Effort estimate summary

| Track | Effort | Notes |
|---|---|---|
| React | ~4.5 dev-days | Mostly the reusable before/after contrast + EU→NA copy |
| ServiceNow / backend | ~3.0 dev-days | S8 optional; S1 is a verify-or-escalate gate |
| **Build total** | **~7.5 dev-days** | Fits Sun–Wed (4 calendar days) **with ≥2 people in parallel** (React + ServiceNow split) |
| Story (Jul 2–3) | ~2 days | N1–N6 |

> **Staffing call:** ~7.5 dev-days across 4 calendar days **requires 2 builders running in parallel**
> (one React, one ServiceNow/backend). With a single builder this slips past July 1 — flag to
> Kuppusami/Raja now. Tanush/Sanjana are review/input only per the Jun 20 constraint.

---

## 5. Critical path & risks

| Risk | Impact | Mitigation |
|---|---|---|
| **S1 role/version blocker** (no `ai_risk_and_compliance_manager` / AIRC < 22.0.3) | UC3 can't re-run NA assessment | Fall back to **read-only live evidence** of the existing High-risk DG1 classification; don't attempt the one-way migration mid-cycle |
| **S3 runtime PII filter change risks breakage** near freeze | UC1 regression | **Recommended:** scope Wall-2 as platform-native for July 1 (ACL + anonymized log already enforce privacy live); wire runtime filter in a later cycle |
| Single-builder capacity | Misses July 1 freeze | Parallelise React vs ServiceNow; cut S8 (optional) and R7-as-live (use evidence view) first |
| Story not pre-walked with Kuppusami | Rework after "done" | N5 walkthrough **before** declaring done (his explicit ask) |
| Live numbers drift between build and demo | Credibility hit | S9 locks numbers at freeze; re-probe morning of Jul 4 |

---

## 6. Definition of done (per use case, for July 4)

Each of the 6 must demonstrate the **full 4-step arc** from at least the patient/doctor + governance seats:
1. Normal AI-assisted process shown.
2. **Before:** the exploit/damage shown (rogue/ungated path).
3. The control explained as **platform-native** (one line, no plumbing tour).
4. **After:** same exploit re-attempted → fails, with a **live ServiceNow record** as proof.

Plus: NA regulatory labels only, terminology clean, and the close lands on
*"the platform makes this possible — we have the expertise to set it up for you."*
