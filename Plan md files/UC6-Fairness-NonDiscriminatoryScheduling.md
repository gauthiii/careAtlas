# Use Case 6 — Fairness & Ethics: Non-Discriminatory Scheduling

**Category:** Fairness & Ethics · **Reg:** EU AI Act Art. 10 · **Demo date:** 2026-06-26
**Instance:** `ven04690.service-now.com` · **App:** CareAtlas (`server/app/*`, `src/*`)
**Live-verified:** 2026-06-23 (read-only curl with `server/.env`, user `interface_gautham`)

---

## 1. Talk to me like a baby — what is this?

Pretend the scheduling robot hands out appointment slots like candy.

We must make sure it does **not** secretly give **worse** candy (longer waits, worse slots) to patients because of their **gender, ethnicity, or age**. That would be unfair — and a hospital can be **sued or shut down** for it.

So we don't just *promise* the robot is fair. We **measure** it:
- Split appointment outcomes into groups (men/women, age bands, ethnicities).
- Watch if one group gets a worse deal.
- The platform **rings a bell the moment the numbers skew** — continuously, not once a year.

---

## 2. What problem we are solving

The scheduling/triage agent producing systematically worse outcomes (longer waits, lower priority, fewer slots) for patients grouped by gender, ethnicity, or age — i.e. **algorithmic bias and discrimination**.

---

## 3. The real things on the instance (verified live, 2026-06-23)

| Table | Live count | Why it matters |
|-------|-----------|----------------|
| `sn_risk_definition` (bias hits) | 2 of 661 | *Algorithmic Bias and Discrimination* + *Data Bias* delivered |
| `sn_grc_metric_m2m_definition_risk_statement` | **21** | Fairness metric definitions |
| `sys_generative_ai_metric` | **9,423** | Outcome data to monitor |

**Verified demographic fields on `u_patient`:** `u_gender`, `u_ethnicity`, `u_date_of_birth` (age band).
**Already built in the app:** a **"Scheduling Fairness Monitor"** and a **"Fairness skew"** KPI render on the governance dashboard (currently demo data, including a "statistically significant skew detected" example). **This UC wires that monitor to live grouped outcomes — it is not built from scratch.**

---

## 4. Steps on the ServiceNow instance

1. **Run the scheduling/triage agent's AI impact assessment.** Confirm **Post Assessment Actions** auto-map *Algorithmic Bias and Discrimination* + *Data Bias* (`sn_risk_definition`) to its `sn_grc_ai_gov_ai_system` record.
2. **Attach the fairness metric definitions** (`sn_grc_metric_m2m_definition_risk_statement`, 21) to monitor outcome distribution across demographic groups.
3. **Define + attest a fairness control** — *"scheduling outcomes monitored for demographic skew."*

> This is the EU AI Act **Article 10** (data governance / non-discrimination) evidence behind UC3.

---

## 5. Steps on the CareAtlas app (document only)

> Net-new ≈ 0.5–1 day (monitor + fields already exist).

- **Backend** — [server/app/main.py](../server/app/main.py): add a read endpoint that returns **outcome distribution by group** — appointment outcomes split by `u_gender` / age band (from `u_date_of_birth`) / `u_ethnicity`. **No PII — grouped aggregates only.**
- **Frontend** — [src/pages/governance/GovernanceDashboardPage.tsx](../src/pages/governance/GovernanceDashboardPage.tsx): wire the existing **"Scheduling Fairness Monitor"** + **"Fairness skew"** KPI to the real fairness-by-group panel.
- **Frontend** — [src/components/governance/SchedulingAgentCompareModal.tsx](../src/components/governance/SchedulingAgentCompareModal.tsx) / [GovernanceDemoPage.tsx](../src/pages/governance/GovernanceDemoPage.tsx): add a **"before/after debiasing"** view.

---

## 6. Curl proof (run live before the demo)

```bash
set -a; . ./server/.env; set +a
SNOW="$SNOW_INSTANCE"; U="$SNOW_USERNAME"; P="$SNOW_PASSWORD"

# Bias risk statements are delivered and live
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_risk_definition?sysparm_query=nameLIKEbias^ORnameLIKEdiscrim&sysparm_fields=name"

# Fairness metric definitions present
curl -s -u "$U:$P" "https://$SNOW/api/now/stats/sn_grc_metric_m2m_definition_risk_statement?sysparm_count=true"
```

---

## 7. The demo moment

We open the scheduling agent's risk register → *Algorithmic Bias and Discrimination* with a **fairness control attached**. The dashboard shows appointment outcomes **balanced across gender / age / ethnicity groups**. Then we trigger the **skew alert** — the platform flags the imbalance the moment it appears. *"We measure fairness continuously, not once."*
