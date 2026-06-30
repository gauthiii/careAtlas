# "Before the Control" Demo Gaps — what to build so the contrast lands

**Why this exists:** Kuppusami's #1 structural feedback — *"Before the control, you should be able to
show the damage, the loss, the negative impact. After the control, how you are protecting it."*
Today the demo mostly jumps to the *after* (the control working). This is the checklist of the
**"before" exploit/damage demos** that must exist so each use case has a real contrast.

**Legend:** ✅ built & in app · 🟡 partial · ⬜ to build.

> **Status 2026-06-28 — all six "before" demos are BUILT and made INTERACTIVE** (via the reusable
> `BeforeAfterDemo` + `SimChat` components). Each `demo/*Page.tsx` shows the process strip + risk
> cards + control bar + a ②Before/④After toggle. The "before" pane is now a **type-and-send console**
> (`SimChat`): the user types a prompt or clicks a sample chip, hits **Send**, and only then does the
> rogue/unguarded result appear — no result is pre-shown, and the earlier "Simulation" badge was
> removed per feedback. "After" panes keep the existing live-wired demos. The damage is still
> generated client-side (no live control is ever disabled on the instance). Two small companions
> remain, tracked elsewhere: the UC6 **remediation-incident button** (S4) and the UC10 **live
> doctor-side block seed** (A7).

---

| UC | "Before-damage" beat to show | Status | Notes |
|---|---|---|---|
| **UC1 Privacy** | Rogue agent returns raw PII (insurance ID / DOB) before ACL | ✅ Built (interactive) | `SimChat` in `demo/PrivacyPage.tsx` — type/send → rogue leak; "after" = RoleBasedRedaction + PiiRedaction (live) |
| **UC2 Risk** | Rogue agent executes a high-impact action with no gate | ✅ Built (interactive) | `SimChat` — send "cancel appt / approve registration" → executes ungated; "after" = ApprovalGateDemo (live) |
| **UC3 Regulation** | Ungoverned agent — no tier / no impact assessment / no controls | ✅ Built (interactive) | `SimChat` — ask for risk tier → ungoverned-agent cards as result; "after" = live evidence panel |
| **UC5 Security** | Injection reaches the agent and it **obeys** | ✅ Built (interactive) | `SimChat` — send an injection → agent obeys + leaks; "after" = InjectionTesterDemo + AI Cases (live) |
| **UC6 Fairness** | Skewed allocation (13.1pp) shown as the harm, before remediation | 🟡 Built (button pending) | `SimChat` — ask for fairness breakdown → skew cards as result; debias "after" (live). **raise-remediation-incident button still pending S4** |
| **UC10 Consent** | Agent processes a non-consented patient (pre-ConsentGate) | ✅ Built (interactive) | `SimChat` — ask to process an opted-out patient → processes anyway; "after" = ConsentEnforcementPanel + incidents (live). *Live doctor-side block still needs A7 seed.* |

---

## Remaining companions (not the "before" demo itself)

1. **UC6 raise-remediation-incident button** — the controlled human response to a skew alert (needs backend S4). ⬜ pending.
2. ~~UC10 live doctor-side block~~ — ✅ **Done (A7)**: dedicated opted-out patient (*Giuseppe Hernandez*, `8e93bda2…`, `notes_summarisation` off) + `DoctorConsentBlockDemo` on the consent page — Notes agent blocks live (real `consent_purpose_violation` incident), Scheduling agent works. Targeted by sys_id, so the representative-patient demos are unaffected.

## Guardrails for building the "before" safely
- The "before" runs are **demo simulations** of the unguarded path — do **not** disable live ACLs,
  the live ConsentGate, or the live guardrail on the real instance to stage them. Use the
  rogue agent / a "guardrail OFF" demo flag so the controlled paths stay intact for the "after."
- Every "after" must still resolve to a **real live record** (ACL deny, AI Case, consent incident,
  fairness metric) — the simulation is only for the *damage* half.

## Tie-back
These map 1:1 to React tasks **R2–R7** and backend **S4/S6** in `plan-of-action.md`, and to the
**②/④** beats in `usecase-narratives-4step.md`.
