# "Before the Control" Demo Gaps — what to build so the contrast lands

**Why this exists:** Kuppusami's #1 structural feedback — *"Before the control, you should be able to
show the damage, the loss, the negative impact. After the control, how you are protecting it."*
Today the demo mostly jumps to the *after* (the control working). This is the checklist of the
**"before" exploit/damage demos** that must exist so each use case has a real contrast.

**Legend:** ✅ exists & usable · 🟡 partial (asset exists, not framed as "before") · ⬜ to build.

---

| UC | "Before-damage" beat to show | Existing asset | Status | Build task |
|---|---|---|---|---|
| **UC1 Privacy** | **Rogue agent returns raw PII** (insurance ID / DOB) before ACL is applied | `SchedulingAgentCompareModal.tsx`, `RoleBasedRedactionDemo.tsx`, `AiRedactionComparisonCard.tsx` | 🟡 | Frame the rogue side as the explicit **"before"**: show the leak first, then the secured deny. (R2) |
| **UC2 Risk** | **Rogue agent executes a high-impact action with no gate** (cancel appt / write note / self-approve) | `SchedulingAgentCompareModal.tsx`, `ApprovalGateDemo.tsx` | 🟡 | Add a clear rogue "no-approval" run *before* showing the approval gate stop. (R3) |
| **UC3 Regulation** | **Ungoverned agent** — system record only, no risk tier / no impact assessment / no mapped controls | `RegulatoryClassificationBadge.tsx` (shows `Unverified`) | 🟡 | Stage a second agent with **nothing completed** next to DG1; show the exposure before classification. (R7) |
| **UC5 Security** | **Injection reaches the agent and it obeys** (instruction-override / exfil) in an unguarded path | `InjectionTesterDemo.tsx` (currently shows blocked only) | ⬜ | Add a "guardrail OFF" simulated run where the payload **succeeds**, then turn it on → blocked + AI Case. (R4) |
| **UC6 Fairness** | **Skewed allocation shown live** (13.1pp over-allocation) as the harm, before remediation | `FairnessDebiasDemo.tsx`, `useFairnessData.ts` | 🟡 | Lead with the **skew/harm** state; debias toggle is the "after." Add **raise-remediation-incident** as the controlled response. (R5 + S4) |
| **UC10 Consent** | **Agent processes a non-consented patient** (pre-ConsentGate) | `ConsentEnforcementPanel.tsx`, `demo/ConsentPage.tsx` | ⬜ | Show a "pre-gate" path where the Notes Agent summarises a non-consenting patient, then the gate blocks + opens incident. (R6) |

---

## Build priority (by contrast impact & effort)

1. **UC5 injection "obeys" simulation** (⬜, highest narrative payoff — the attack actually working is dramatic).
2. **UC10 pre-gate processing** (⬜ — needs the representative patient seeded with consent OFF, S6).
3. **UC1 / UC2 rogue framing** (🟡 — assets exist; mostly relabel + sequence as "before").
4. **UC6 skew-first + remediation incident** (🟡 + S4 endpoint).
5. **UC3 ungoverned-agent contrast** (🟡 — depends on S2 NA reframe).

## Guardrails for building the "before" safely
- The "before" runs are **demo simulations** of the unguarded path — do **not** disable live ACLs,
  the live ConsentGate, or the live guardrail on the real instance to stage them. Use the
  rogue agent / a "guardrail OFF" demo flag so the controlled paths stay intact for the "after."
- Every "after" must still resolve to a **real live record** (ACL deny, AI Case, consent incident,
  fairness metric) — the simulation is only for the *damage* half.

## Tie-back
These map 1:1 to React tasks **R2–R7** and backend **S4/S6** in `plan-of-action.md`, and to the
**②/④** beats in `usecase-narratives-4step.md`.
