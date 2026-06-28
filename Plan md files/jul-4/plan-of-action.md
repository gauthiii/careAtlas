# Plan of Action — Week of June 28 → July 4

**Goal:** All application/build work **done by Wed July 1**; July 2–3 for story; **dry-run July 4.**
**Scope:** 6 use cases (UC1 Privacy · UC2 Risk · UC3 Regulation · UC5 Security · UC6 Fairness · UC10 Consent).
**Regulatory anchor:** NIST AI RMF + HIPAA + 42 CFR Part 2 (NA-only). EU AI Act / FRIA retired.
**App:** React/Vite (`src/*`) + FastAPI (`server/app/*`) · **Instance:** `ven04690.service-now.com`.

> **Guiding principle for every task:** we are not adding capability — all 6 are live. We are
> (1) building the *before-the-control damage* contrast, (2) re-labelling EU→NA, and (3) cleaning
> loose ends + terminology. Keep changes out-of-the-box / config-first; minimise custom logic.

---

> **Progress — 2026-06-28:** **A1 complete + made interactive.** The reusable `BeforeAfterDemo`
> component (R1) is built and wired into all six demo pages (R2–R7), and the "before" pane is now an
> interactive **`SimChat` type-and-send console** (type a prompt or click a sample chip → Send → the
> rogue/unguarded result appears; no result pre-shown; the "Simulation" badge was removed per
> feedback). `tsc` + `npm run build` pass clean; both servers run locally for review. The damage is
> generated client-side (no live control disabled); the "after" panes keep the existing live-wired
> demos. **Remaining:** R8–R11 (copy/loose-ends) and the ServiceNow/backend track (S1–S9) are not started.

## 1. React side — work breakdown

| ID | Status | Task | Files (primary) | Effort | Depends on |
|---|---|---|---|---|---|
| R1 | ✅ Done | **Before/after toggle** + interactive **`SimChat` type-and-send console** for the "before" pane (sample chips → Send → result) | `components/governance/BeforeAfterDemo.tsx` (new, exports `BeforeAfterDemo` + `SimChat`), reused on each `demo/*Page.tsx` | 0.5 d | — |
| R2 | ✅ Done | **UC1 Privacy** "before": rogue agent reads PII (sim) → then ACL-secured agent denied (live) | `demo/PrivacyPage.tsx`, `RoleBasedRedactionDemo.tsx`, `PiiRedactionDemo.tsx` | 0.5 d | R1 |
| R3 | ✅ Done | **UC2 Risk** "before": rogue agent performs high-impact action with no gate (sim) → then approval gate stops secured agent (live) | `demo/RiskPage.tsx`, `ApprovalGateDemo.tsx` | 0.5 d | R1 |
| R4 | ✅ Done | **UC5 Security** "before": injection **obeyed** by agent (sim) → then blocked + AI Case opened (live) | `demo/SecurityPage.tsx`, `InjectionTesterDemo.tsx` | 0.5 d | R1 |
| R5 | 🟡 Partial | **UC6 Fairness** "before": skewed allocation shown (13.1pp, sim) → debias toggle (live). **"Raise remediation incident" button still pending** (needs S4) | `demo/FairnessPage.tsx`, `FairnessDebiasDemo.tsx` | 0.5 d | R1, S4 |
| R6 | ✅ Done | **UC10 Consent** "before": agent processes non-consented patient (sim) → ConsentGate blocks + incident (live). *(Live doctor-side block still needs A7 seed.)* | `demo/ConsentPage.tsx`, `ConsentEnforcementPanel.tsx` | 0.5 d | R1, A7 seed |
| R7 | ✅ Done | **UC3 Regulation** "before": ungoverned/unclassified agent (sim) vs governed High-risk agent w/ AI Impact Assessment (live). *(S2 NA reframe separate.)* | `demo/RegulationPage.tsx` | 0.5 d | S2 |
| R8 | ⬜ | **Retire EU AI Act → NIST AI RMF + HIPAA + 42 CFR Part 2** in all UI copy (badges, demo data, agenda) | `RegulatoryClassificationBadge.tsx`, `data/useCaseDemoData.ts`, `GovernanceAgenda26Page.tsx`, `demo/RegulationPage.tsx`, `services/serviceNow.ts` | 0.5 d | — |
| R9 | ⬜ | **Terminology:** remove any "SUD" from labels; align "queue" wording per resolved term | `data/*`, `staff/DoctorQueuePage.tsx`, agenda pages | 0.25 d | A9 decision |
| R10 | ⬜ | **Consent regulatory basis** copy: surface 42 CFR Part 2 / HIPAA on consent demo page | `demo/ConsentPage.tsx`, `ConsentEnforcementPanel.tsx` | 0.25 d | R8 |
| R11 | ⬜ | Fix `fetchConsentCoverage` loose end (wire to new endpoint or remove the dead call) | `services/serviceNow.ts` | 0.25 d | S5 |

**React subtotal: ~4.5 dev-days · done: R1–R4, R6, R7 (+R5 partial) ≈ 3.5 d · remaining: R5 button, R8–R11 ≈ 1 d.**

---

## 2. ServiceNow / backend side — work breakdown

| ID | Task | Where | Effort | Notes |
|---|---|---|---|---|
| S1 | **Confirm UC3 prereqs:** demo user holds `ai_risk_and_compliance_manager`; AIRC ≥ 22.0.3; "Migrate to Advanced Risk Assessments" decision (one-way) | ServiceNow admin | 0.25 d | Blocker for re-running NA assessment; if blocked, demo read-only evidence only |
| S2 | **Re-frame UC3 assessment as NA:** use AI Impact Assessment + NIST-aligned questionnaire (not EU AI Act/FRIA); confirm `Triage Appointment DG1` = High-risk, AIA attached, tasks present | AIRC Assessment Workspace + `server/app/servicenow.py` regulation evidence | 0.5 d | Live count today: 111 AI systems; verify DG1 fields |
| S3 | **UC4-style decision (UC1 Wall-2):** either activate the `sys_gen_ai_filter` "CareAtlas PII Output Guard" on a runtime output path, OR formally scope it as platform-native (record active, not invoked) | `sys_gen_ai_filter` + `server/app/servicenow.py` | 0.5 d | Recommend: scope as platform-native for July 1; wire later. Avoids risky last-minute runtime change |
| S4 | **UC6 manual remediation endpoint:** raise an incident/case from a fairness skew alert (the controlled human workflow) | `server/app/main.py` + `servicenow.py` (`sn_si_incident` or case) | 0.5 d | Directly answers "no auto-correct" boundary |
| S5 | **Implement `GET /api/governance/consent-coverage`** (or remove caller) | `server/app/main.py`, `servicenow.py` | 0.25 d | Pairs with R11 |
| S6 | **Seed UC10 doctor-side representative patient** with `notes_summarisation` consent OFF for a live block | `u_patient` data | 0.25 d | Pairs with R6/A7 |
| S7 | **Retire EU AI Act in backend models/strings** | `server/app/models.py`, `servicenow.py` | 0.25 d | Pairs with R8 |
| S8 | *(Optional)* Activate **Prompt Injection dashboard** in Now Assist Center | ServiceNow config | 0.25 d | UC5 enhancement only |
| S9 | **Freeze verification:** re-run read-only probe script; lock the live numbers quoted in the story | `server/scripts/*audit*readonly.sh` | 0.25 d | On Jul 1 |

**ServiceNow/backend subtotal: ~3.0 dev-days (S8 optional).**

---

## 3. Structured Work Breakdown (by day)

```
SUN Jun 28  ── Build wave 1 (the contrast that sells)
  ✅ R1 Before/after component            (DONE 06-27, commit 12d4306)
  ✅ R2 UC1 before-damage                 (DONE 06-27)
  ✅ R3 UC2 before-damage                 (DONE 06-27)
  ✅ R4 UC5 before-damage                 (DONE 06-27)
  ⬜ S1 UC3 prereq confirm                (0.25d)   ← unblock S2 early
  ↳ NOTE: also delivered early — R6 (UC10 before) ✅ and R7 (UC3 before) ✅

MON Jun 29  ── Build wave 2 (regulation + remaining UCs)
  ⬜ R8 EU→NA retire (UI)                 (0.5d)
  ⬜ S2 UC3 NA reframe + verify DG1       (0.5d)
  ✅ R7 UC3 before-damage                 (DONE 06-27)
  ⬜ S4 UC6 remediation endpoint          (0.5d)

TUE Jun 30  ── Build wave 3 (consent + fairness + loose ends)
  🟡 R5 UC6 before ✅ + remediation button ⬜ (button needs S4)
  ✅ R6 UC10 before  (DONE 06-27) · ⬜ S6 seed (0.25d)
  ⬜ S3 UC1 Wall-2 decision (scope/native)(0.5d)
  ⬜ S5 consent-coverage endpoint + R11   (0.25d+0.25d)
  ⬜ R10 consent reg basis copy           (0.25d)
  ⬜ R9/A9 terminology cleanup            (0.25d)
  ⬜ S7 backend EU→NA strings             (0.25d)

WED Jul 1   ── FREEZE
  Integration + full 6-UC smoke run (all from 3 portals)
  S9 lock live numbers; regression of approval/consent/injection paths
  (S8 optional PI dashboard if time)

THU Jul 2   ── Story: N1 4-step rework, N2 Tanush template align, N3 sequencing
FRI Jul 3   ── Story: N5 Kuppusami walkthrough; rehearse; N4 send 6 UCs / N6 reg write-up
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
