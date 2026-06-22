# CareAtlas — June 26 Stakeholder Demonstration Plan

**Instance:** ven04690.service-now.com · **Application:** CareAtlas (React/Vite + FastAPI)
**Scope:** AI Control Tower (AICT) + AI Risk & Compliance (AIRC)
**Demo date:** 2026-06-26
**Verification method:** live read-only REST probes against `ven04690` (`/api/now/table`, `/api/now/stats`) on 2026-06-21. Counts below are real row counts returned by the instance.

---

## Verdict at a Glance

**8 of 9 use cases are LIVE-POSSIBLE today.** The only blocked item is **UC4 (Model Risk Lifecycle)** — the `sn_model_risk_mgmt` application is not installed/entitled on the instance (zero matching tables, zero matching scope). That is a licensing/procurement question, not a build question.

---

## Master Plan Table

| # | Use Case | Possible? | Live evidence on ven04690 | What it requires | What needs to be done | Complexity | Speed to deliver |
|---|----------|-----------|---------------------------|------------------|------------------------|------------|------------------|
| 1 | **Stop the Injection** (Prompt Injection Defense · LLM01) | ✅ Yes | `sys_gen_ai_filter`=7, `sys_gen_ai_filter_sample`=249, `sys_generative_ai_metric` present, `sn_ai_governance_automation_rule`=3, `sn_ai_case_mgmt_ai_case` table present (0 rows) | Gen AI content filter + sample phrases; metric logging; automation rule → AI Case; backend `/governance/guardrail/scan` endpoint + dashboard wiring | Tune filter for instruction-override / exfil patterns; wire automation rule to raise AI Case on trip; build scan endpoint + dashboard panel | 🔴 Medium-High | 🐢 Slowest (net-new build) |
| 2 | **The Agent That Did Too Much** (Excessive Agency · LLM06) | ✅ Yes | `sys_user` present, `sys_security_acl` present; ACL test UI + probe logic already scaffolded (~70%) | Scoped service account(s); field/table ACLs (PII deny, cross-table write deny); deny-write probes; human-approval gate branch | Create real ACL records on-instance; add deny-write probes to `/acl/test`; add approval-gate branch in `/agents/execute` | 🟡 Low-Medium | ⚡ Fast (mostly built) |
| 3 | **Nothing Leaves That Shouldn't** (Sensitive Info Disclosure · LLM02) | ✅ Yes | `sys_security_acl` present, `u_ai_decision_log` present (anonymized token field exists & populated) | Reuse UC2 deny rules; output-side PII redaction guardrail; privacy-controls summary endpoint + dashboard panel | Confirm output-redaction guardrail active; build privacy-controls summary endpoint + dashboard panel | 🟡 Low-Medium | ⚡ Fast |
| 4 | **The Model Has a Performance Review Too** (Model Risk Lifecycle) | ❌ **BLOCKED** | `sn_model_risk_mgmt` **NOT FOUND** — 0 tables, 0 scope match on instance | `sn_model_risk_mgmt` app (Model Inventory, Model Risk Workspace, workflow settings, roles) | **Procurement first:** confirm ServiceNow Store entitlement, install w/ admin, assign roles, load demo data. Cannot demo on June 26 unless installed in time | 🔴 Medium (conditional) | 🚫 Not deliverable without install |
| 5 | **Nothing Ships Without a Green Light** (Pre-Deployment Gate) | ✅ Yes | `sn_smart_imp_auto_assessment_action`=54, `sn_smart_imp_auto_rule`=32, `sn_grc_ai_gov_ai_system`=110 | Published "AI impact assessment" template; Risk Assessment Methodology auto-classification; Post Assessment Actions; AIRC manager approve/block role | Publish delivered template (ships Draft); run one intake end-to-end through Pre-deployment Review gate | 🟡 Low-Medium | ⚡ Fast (config + demo data, no code) |
| 6 | **Show Me Every AI Touching a Patient Record** (Shadow AI Inventory) | ✅ Yes | `sn_aia_agent`=160, `alm_ai_system_digital_asset`=333, `sn_grc_ai_gov_ai_system`=110; frontend modal/hook already built | Managed/unmanaged split (live); `ShadowAiWorkflowModal.tsx` + `useUnmanagedAISystems.ts` (exist) | Wire before/after narrative to existing data; pull one shadow agent into intake | 🟢 Low | ⚡⚡ Fastest (least net-new work) |
| 7 | **Pull the Plug** (MCP Server Kill Switch) | ✅ Yes | `sn_mcp_server`=1 ("Dynatrace MCP server"), `sn_mcp_server_registry`=2 — a registered server exists to demo against | AI Gateway + AI Control Tower Pro Plus; server-level "Pause AI Gateway transactions" control | Confirm Pro Plus entitlement; click-through pause/resume on the registered MCP server (no code) | 🟢 Low | ⚡⚡ Fastest (operate existing control) |
| 8 | **Follow the Trail** (Access Map Incident Investigation) | ✅ Yes | `sn_grc_ai_gov_ai_system`=110, `sn_grc_ai_gov_ai_system_entity_map`=241, `sn_ai_case_mgmt_ai_case` present | AICT Security & Privacy → Access Map; agent node detail; AI Case w/ "Adversarial attack" sub-type | Confirm "Adversarial attack" subtype choice; rehearse Access Map walkthrough; document findings in an AI Case | 🟡 Low-Medium | ⚡ Fast (data exists live) |
| 9 | **Known Bad Patterns, Caught Automatically** (Output Injection Detection) | ✅ Yes | `sn_data_discovery_data_pattern`=39 — **confirmed live patterns:** SQL-query-injection, Html-Tag-injection, Eval-Function-Audit, Script-Tag-injection, Terminal-RCE | AICT Security & Privacy → Agentic Output Injection Detection panel; deterministic pattern rules | Confirm the detection panel/capability is surfaced under Security & Privacy; demo a flagged output against the named patterns | 🟡 Medium (conditional) | ⚡ Fast (patterns already present) |

**Legend — Complexity:** 🟢 Low · 🟡 Low-Medium / Medium · 🔴 Medium-High
**Legend — Speed:** ⚡⚡ Fastest · ⚡ Fast · 🐢 Slowest · 🚫 Blocked

---

## Recommended Demo Sequence (June 26)

UC6 (breadth — "what do we have") → UC5 (process — "what stops it shipping") → UC1–3 (technical depth) → UC7–9 (incident response — "when prevention fails") → UC4 noted as roadmap/pending procurement.

---

## Per-Use-Case Verification Notes

- **UC1 — POSSIBLE.** Filter infra is live (7 filters, 249 samples). Note: earlier docs cited `sys_gen_ai_guardian_provider` — that table does not exist; verified mechanism is `sys_gen_ai_filter` + `sys_generative_ai_metric`. `sn_ai_case_mgmt_ai_case` exists but has 0 rows (demo will create the first).
- **UC2 — POSSIBLE.** Both `sys_user` and `sys_security_acl` confirmed. ~70% already scaffolded in the ACL test UI; remaining work is on-instance ACL records + deny-write probes + approval gate.
- **UC3 — POSSIBLE.** `u_ai_decision_log` exists with the anonymized patient-token field. Reuses UC2 deny rules; main net-new is the output-redaction guardrail confirmation + dashboard panel.
- **UC4 — BLOCKED (only blocked case).** No `sn_model_risk_mgmt` tables and no matching scope on ven04690. Must be procured/installed before it can be built or demoed. Treat as roadmap item for June 26.
- **UC5 — POSSIBLE.** Post Assessment Actions (54) and automation rules (32) are live; 110 AI assets exist. Almost entirely config + demo data, no custom code.
- **UC6 — POSSIBLE & lowest-effort.** 160 agents, 333 digital assets, 110 governed AI systems live; frontend already built. Strongest "wow with least build" opener.
- **UC7 — POSSIBLE.** A registered MCP server ("Dynatrace MCP server") exists, so the pause/resume control has a live target. Confirm AI Control Tower Pro Plus entitlement before the live click-through.
- **UC8 — POSSIBLE.** Access Map data is live (110 systems, 241 entity-map edges). Confirm the "Adversarial attack" AI Case subtype choice is configured before the demo.
- **UC9 — POSSIBLE.** All five named deterministic patterns confirmed live in `sn_data_discovery_data_pattern` (39 total). Confirm the Agentic Output Injection Detection panel is surfaced under Security & Privacy.

---

## Open Action Items Before June 26

1. **UC4:** Decide install-or-defer for `sn_model_risk_mgmt` (ServiceNow Store entitlement check). Currently not installed — the only hard blocker.
2. **UC7 / UC9:** Confirm AI Control Tower Pro Plus / AI Security & Privacy entitlements so the existing capabilities surface in the UI for a live click-through.
3. **UC8:** Verify the "Adversarial attack" AI Case subtype is selectable.
4. **UC1/2/3:** Complete the net-new backend endpoints (`/governance/guardrail/scan`, deny-write probes, privacy-controls summary) and dashboard wiring — these are the only items requiring code by June 26.
