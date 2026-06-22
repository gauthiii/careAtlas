# Use Case 9 — "Known Bad Patterns, Caught Automatically" · Step-by-Step Build Guide

**Agentic Output Injection Detection — Deterministic, Not Probabilistic · Security Incident Response**
**Demo date:** 2026-06-26 · **Instance:** `ven04690.service-now.com` · **App:** CareAtlas (React/Vite + FastAPI)
**Audience for this doc:** someone with ZERO prior knowledge. Every click, command, regex, and `sys_id` is spelled out. Follow top to bottom.

---

## 0. Read this first — what we are showing, in one breath

An AI agent generates some output. That output gets sent to another system (a database, a browser, a terminal). What if the agent's output secretly contains a **SQL injection string, a `<script>` tag, or a shell command**? If nobody checks, that dangerous string flows downstream and detonates.

UC9 shows we catch it — **deterministically** (with hard rules, not an LLM's "I think this looks bad"):

1. **BEFORE:** an agent's output contains a known-dangerous pattern (e.g. `; DROP TABLE patients`) and nothing rule-based catches it. ❌
2. **AFTER:** our detector matches the output against **six named, deterministic patterns** — `SQL-query-injection`, `Script-Tag-injection`, `Html-Tag-injection`, `Eval-Function-Audit`, `Terminal-RCE`, `Non-printable-class` — **blocks it**, writes a **governance audit record**, and opens a formal **AI Case**. ✅

> **Key word: deterministic.** UC1 (prompt injection) uses a *probabilistic* guardrail (an LLM judging input). UC9 is the opposite — **rule-based pattern matching on output**. The pitch: "We don't *hope* a model flags it. A known-bad pattern is caught every single time, the same way, with proof." That contrast with UC1 is the whole point.

---

## 1. The single most important fact (read twice)

We probed the live instance hard. Here is the decisive truth so nobody wastes the day:

> **ServiceNow's native "Agentic Output Injection Detection" panel is EMPTY on this instance and will stay empty without heavy, possibly license-gated configuration.**
>
> The six patterns exist as *definitions*, but **nothing is wired to scan or display**:
> - `sn_data_discovery_active_data_pattern` = **0 rows** (no pattern is activated for scanning)
> - `sn_data_discovery_policy` = **0 rows** (no discovery policy configured)
> - `sn_data_discovery_job_history` = **0 rows** (no scan has ever run)
> - `sn_data_discovery_finding` / `_granular_finding` = **0 rows** (no findings exist)
>
> The native panel only populates after you configure a discovery policy, activate the patterns, point them at a target table, run a scan, AND let a data-collection job surface it — uncertain to achieve by June 26.

**Therefore the live check runs in our own FastAPI backend** — exactly like the shipped LLM01/LLM02 guardrails. ServiceNow holds the **config-of-record** (the six real pattern definitions) and the **evidence** (audit row + AI Case).

### Our chosen architecture (locked) — "Hybrid" (same shape as UC1)

| Layer | What it does | Why |
|-------|--------------|-----|
| **A. FastAPI backend scan** | Deterministic regex match on agent OUTPUT using the **exact six ServiceNow regexes** (copied verbatim, §3). Fires live in the demo. | Reliable, instant, no licensing risk. Mirrors shipped LLM01/02. |
| **B. ServiceNow patterns (config-of-record)** | Show the six `sn_data_discovery_data_pattern` records live — same names, same regexes. | Proves these are the platform's own deterministic patterns, not ones we invented. |
| **C. Evidence on a catch** | Write a row to `u_ai_action_audit_log` AND open an **AI Case** (sub-type **Adversarial attacks**). | The "incident raised" story; consistent with UC1/UC8. |

> **Plain-English summary:** Our backend does the catching with ServiceNow's own rules. ServiceNow shows those rules and keeps the paperwork. 100% live, 0% dependent on an empty native panel.

> **The good news that makes this honest:** the backend isn't using *made-up* patterns — it copies ServiceNow's **exact verbatim regexes** (we pulled them from the instance, §3.3). So when you show the six SN pattern records on stage, they literally match what the backend ran.

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

# 2.2 The six pattern definitions exist (expect 6 rows)
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_data_discovery_data_pattern?sysparm_query=nameINHtml-Tag-injection,SQL-query-injection,Eval-Function-Audit,Non-printable-class,Script-Tag-injection,Terminal-RCE&sysparm_fields=name&sysparm_limit=10" -H "Accept: application/json"

# 2.3 Evidence table present (currently 12+ rows)
curl -s -u "$U:$P" "https://$SNOW/api/now/stats/u_ai_action_audit_log?sysparm_count=true" -H "Accept: application/json"

# 2.4 AI Case table present + adversarial sub-type record exists
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_grc_case_mgmt_case_type/88a5a11d7befd21005de3782f38cb63a?sysparm_fields=name" -H "Accept: application/json"
```

✅ All good → proceed. ❌ Any failure → see §8 Troubleshooting.

---

## 3. Ground truth — what exists (already verified, don't re-investigate)

**On the instance (`ven04690`, verified 2026-06-22):**
- `sn_data_discovery_data_pattern` — 39 rows; **the six injection patterns are present**, scope = "AI Security and Privacy", `out_of_the_box = true`, each with an `expression` (regex).
- Detection plumbing is **all empty** (see §1) — native panel won't show data.
- `u_ai_action_audit_log` — the audit table LLM01/LLM02 already write to. Key columns: `u_agent_identity`, `u_action_type`, `u_final_action`, `u_rejection_reason`, `u_patient_id_anon`, `u_log_id`, `u_timestamp`.
- AI Case: `sn_ai_case_mgmt_ai_case` (extends `sn_grc_case_mgmt_case`). Sub-type field `case_subtype` → `sn_grc_case_mgmt_case_type`; **"Adversarial attacks" = `88a5a11d7befd21005de3782f38cb63a`**. Create gotcha: a business rule rejects future/missing dates — use **past** `date_of_occurrence` + `discovered_date`.

**In the CareAtlas code (already built — we EXTEND, never rebuild):**
- `server/app/servicenow.py` (~line 811): `create_guardrail_audit_log()` / `fetch_guardrail_audit_logs()` — the pattern we clone.
- `server/app/main.py` (lines 326–349): `/governance/llm02/flag` + `/governance/llm02/audit-log` — the endpoint pattern we clone. (If UC1 was built, you'll also see `/governance/llm01/scan` — clone that even more directly.)
- `src/services/serviceNow.ts` (lines 312–328): `flagLlm02Event` / `fetchLlm02AuditLog` — the frontend client pattern.
- `src/pages/governance/GovernanceDemoPage.tsx` — the launchpad for the "Try it" box.
- `src/pages/governance/GovernanceLlm02AuditPage.tsx` — the audit-log page to mirror.

### 3.3 The six ServiceNow regexes — VERBATIM (copy these exactly into the backend)
Pulled live from `sn_data_discovery_data_pattern.expression`. These are ServiceNow's own rules:

| Pattern name | Regex (verbatim from instance) |
|--------------|--------------------------------|
| `SQL-query-injection` | `(?xi);\s* \b(SELECT\|INSERT\|UPDATE\|DELETE\|DROP\|ALTER\|EXEC)\b` |
| `Script-Tag-injection` | `(?i)<\s*script[^>]*>.*?<\s*\/\s*script\s*>` |
| `Html-Tag-injection` | `(?i)<\s*(img\|svg\|iframe\|object\|embed\|link\|body\|video\|audio)[^>]*(on[a-z]+\s*=)` |
| `Eval-Function-Audit` | `\b(?:eval\s*\(\|new\s+Function\s*\(\|\[\s*['"]eval['"]\s*\]\s*\()` |
| `Terminal-RCE` | `\b(cmd\.exe\|powershell\|bash\|sh\|zsh\|ls\|rm\|cp\|mv\|dir\|del\|copy\|sudo\|python\|node\|git)\b` |
| `Non-printable-class` | `\p{C}` (Unicode "other/control" class; in Python use the `regex` module or a control-char check — see §5.3 note) |

---

## 4. SERVICENOW SIDE — almost nothing to do

> The patterns already exist. Your only SN tasks: confirm they're visible (config-of-record) and pre-create a backup AI Case. ~25 min total.

### Step 1 — Confirm the six patterns are visible (10 min)
1. ServiceNow → top nav filter → open table **`sn_data_discovery_data_pattern.list`**.
2. Filter **Name** contains `injection` OR `RCE` OR `Eval` OR `Script` OR `Non-printable`.
3. Open **SQL-query-injection** → confirm the **Expression** field shows `(?xi);\s* \b(SELECT|INSERT|...)\b`.
4. **Screenshot the list of six + one expression** — this is your "platform-native config-of-record" slide.

### Step 2 — Pre-create the backup AI Case (10 min) — guaranteed fallback
Verified-working payload (same path as UC8; created/deleted on probe). Dates must be in the **past**:

```bash
curl -s -u "$U:$P" -X POST \
  "https://$SNOW/api/now/table/sn_ai_case_mgmt_ai_case?sysparm_exclude_reference_link=true" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{
        "name":"Agentic output injection blocked — CareAtlas agent",
        "description":"An AI agent output contained a known-dangerous pattern (SQL-query-injection) and was blocked by the deterministic output-injection detector before reaching a downstream system. Patterns are ServiceNow AI Security & Privacy data patterns. Raised for governance review.",
        "case_subtype":"88a5a11d7befd21005de3782f38cb63a",
        "date_of_occurrence":"2026-06-20 14:00:00",
        "discovered_date":"2026-06-21 09:00:00",
        "breach":"to_be_determined"
      }' | python3 -m json.tool | head -30
```
Note the returned **number** (e.g. `ACS000xxxx`). Open it in the UI, confirm **Sub-type = Adversarial attacks**, keep it as your safety net.

> ℹ️ **(Optional / STRETCH only) native panel activation:** to light up the real Agentic Output Injection Detection panel you'd create an `sn_data_discovery_policy`, add the six patterns to `sn_data_discovery_active_data_pattern`, target a table holding agent output, run the scan, and run the data-collection job. This is uncertain + possibly license-gated — **do NOT put it on the critical path.** Leave it for after the live demo is proven.

---

## 5. CAREATLAS APP SIDE — backend then frontend

> Clone the LLM01/LLM02 path. If UC1 (`/governance/llm01/scan`) already exists, this is near-identical. ~3.5 hours.

### 5.1 Decide the "filter key"
Stamp every LLM09 row with a distinct identity so it's queryable separately: `u_agent_identity = "llm09_output_injection"`, `u_final_action = "blocked"`. (LLM01 used `llm01_injection_guardrail`, LLM02 `governance_user_identity` — all distinct, never collide.)

### 5.2 (Optional, 5 min) Add an `u_action_type` choice
For nicer labels, add value `output_injection_blocked` to `u_ai_action_audit_log.u_action_type`. If you skip it, leave the field unset (like LLM02 does).

### 5.3 Backend — add the scan + evidence functions
**File:** `server/app/servicenow.py`. Paste near the existing guardrail block. **The patterns are ServiceNow's verbatim regexes (§3.3).**

```python
# ---------------------------------------------------------------------------
# LLM09 — Agentic Output Injection Detection (deterministic, rule-based)
# Patterns copied VERBATIM from ServiceNow sn_data_discovery_data_pattern
# Evidence table reused: u_ai_action_audit_log
# ---------------------------------------------------------------------------
import re

LLM09_AGENT_IDENTITY = "llm09_output_injection"
LLM09_FINAL_ACTION_BLOCKED = "blocked"

# (name, compiled_regex) — names + expressions match the instance exactly.
_LLM09_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("SQL-query-injection",  re.compile(r"(?xi);\s* \b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC)\b")),
    ("Script-Tag-injection", re.compile(r"(?i)<\s*script[^>]*>.*?<\s*/\s*script\s*>")),
    ("Html-Tag-injection",   re.compile(r"(?i)<\s*(img|svg|iframe|object|embed|link|body|video|audio)[^>]*(on[a-z]+\s*=)")),
    ("Eval-Function-Audit",  re.compile(r"""\b(?:eval\s*\(|new\s+Function\s*\(|\[\s*['"]eval['"]\s*\]\s*\()""")),
    ("Terminal-RCE",         re.compile(r"\b(cmd\.exe|powershell|bash|sh|zsh|ls|rm|cp|mv|dir|del|copy|sudo|python|node|git)\b")),
    # Non-printable-class: SN uses \p{C}. Python's stdlib `re` lacks \p{C};
    # match Unicode "Other/Control" chars by category instead.
    ("Non-printable-class",  None),
]

def _has_nonprintable(text: str) -> bool:
    import unicodedata
    return any(unicodedata.category(ch).startswith("C") and ch not in "\t\n\r" for ch in (text or ""))

def scan_output_for_injection(text: str) -> dict[str, Any]:
    """Deterministic output-injection scan. Returns verdict + matched pattern names."""
    matches = [name for name, rx in _LLM09_PATTERNS if rx is not None and rx.search(text or "")]
    if _has_nonprintable(text):
        matches.append("Non-printable-class")
    return {
        "verdict": "blocked" if matches else "allowed",
        "matched_patterns": sorted(set(matches)),
        "action": "blocked" if matches else "passed",
    }

async def create_output_injection_audit_log(
    settings: Settings, *, output_text: str, matched_patterns: list[str],
    http_client: httpx.AsyncClient | None = None,
) -> dict[str, str]:
    """Write an LLM09 block to u_ai_action_audit_log (mirrors create_guardrail_audit_log)."""
    reason = (
        "Blocked under LLM09 — Agentic Output Injection. Agent output matched "
        f"ServiceNow deterministic data patterns: {', '.join(matched_patterns) or 'n/a'}. "
        "Output was blocked before reaching a downstream system; event flagged for review."
    )
    payload = {
        "u_agent_identity": LLM09_AGENT_IDENTITY,
        "u_final_action": LLM09_FINAL_ACTION_BLOCKED,
        "u_rejection_reason": reason,
        "u_patient_id_anon": "REDACTED",
        # "u_action_type": "output_injection_blocked",  # uncomment if you added the choice (5.2)
        "u_val_agent_auth": "false",
    }
    async def run(client):
        return await client.post(
            f"{settings.snow_base_url}/api/now/table/u_ai_action_audit_log",
            json=payload, headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password))
    if http_client is not None:
        response = await run(http_client)
    else:
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            response = await run(client)
    if not response.is_success:
        _raise_snow_error(response)
    return _map_audit_log(response.json().get("result", {}))

async def open_output_injection_ai_case(
    settings: Settings, *, matched_patterns: list[str],
    http_client: httpx.AsyncClient | None = None,
) -> dict[str, str]:
    """Open a formal AI Case (sub-type Adversarial attacks). Dates MUST be in the past."""
    payload = {
        "name": "Agentic output injection blocked — CareAtlas agent",
        "description": (
            "An AI agent's output contained known-dangerous patterns "
            f"({', '.join(matched_patterns)}) and was blocked before reaching a downstream system. "
            "Patterns match ServiceNow AI Security & Privacy data patterns. Raised automatically."
        ),
        "case_subtype": "88a5a11d7befd21005de3782f38cb63a",       # Adversarial attacks
        "date_of_occurrence": "2026-06-20 14:00:00",              # keep in the PAST (business rule)
        "discovered_date": "2026-06-21 09:00:00",
        "breach": "to_be_determined",
    }
    async def run(client):
        return await client.post(
            f"{settings.snow_base_url}/api/now/table/sn_ai_case_mgmt_ai_case?sysparm_exclude_reference_link=true",
            json=payload, headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(settings.snow_username, settings.snow_password))
    if http_client is not None:
        response = await run(http_client)
    else:
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            response = await run(client)
    if not response.is_success:
        _raise_snow_error(response)
    r = response.json().get("result", {})
    return {"sys_id": _field_value(r.get("sys_id")), "number": _field_best(r.get("number"))}

async def fetch_output_injection_logs(
    settings: Settings, *, limit: int = 200, http_client: httpx.AsyncClient | None = None,
) -> list[dict[str, str]]:
    """Return LLM09 rows, newest first (mirrors fetch_guardrail_audit_logs)."""
    params = {
        "sysparm_query": (f"u_agent_identity={LLM09_AGENT_IDENTITY}"
                          f"^u_final_action={LLM09_FINAL_ACTION_BLOCKED}^ORDERBYDESCsys_created_on"),
        "sysparm_display_value": "all", "sysparm_limit": str(limit),
    }
    async def run(client):
        return await client.get(
            f"{settings.snow_base_url}/api/now/table/u_ai_action_audit_log",
            params=params, headers={"Accept": "application/json"},
            auth=(settings.snow_username, settings.snow_password))
    if http_client is not None:
        response = await run(http_client)
    else:
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            response = await run(client)
    if not response.is_success:
        _raise_snow_error(response)
    return [_map_audit_log(x) for x in response.json().get("result", [])]
```

> **Two honest notes:** (1) `Non-printable-class` uses `\p{C}` which Python's stdlib `re` doesn't support — the helper `_has_nonprintable` covers it via `unicodedata`. (2) Confirm `_map_audit_log`, `_field_value`, `_field_best`, `_raise_snow_error` exist in this file (they do — used by LLM01/02). Reuse, don't redefine.

### 5.4 Backend — add the endpoints
**File:** `server/app/main.py`. Clone lines 326–349; add the new function names to the import block (~lines 79–89).

```python
@api.post("/governance/llm09/scan")
async def post_scan_llm09(
    body: dict[str, Any] | None = None,
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Scan agent OUTPUT for known-bad patterns. On a block: audit + open AI Case."""
    output_text = str((body or {}).get("output_text") or "")
    result = scan_output_for_injection(output_text)
    if result["verdict"] == "blocked":
        try:
            result["audit"] = await create_output_injection_audit_log(
                settings, output_text=output_text, matched_patterns=result["matched_patterns"])
            result["ai_case"] = await open_output_injection_ai_case(
                settings, matched_patterns=result["matched_patterns"])
        except ServiceNowError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    return result

@api.get("/governance/llm09/audit-log")
async def get_llm09_audit_log(
    settings: Settings = Depends(get_settings),
) -> list[dict[str, Any]]:
    """Return LLM09 output-injection block records, newest first."""
    try:
        return await fetch_output_injection_logs(settings)
    except ServiceNowError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
```

**Local test (backend running — see §7):**
```bash
# BLOCKED — SQL injection in output. Expect verdict=blocked + matched + audit + ai_case number.
curl -s -X POST http://localhost:8000/api/governance/llm09/scan \
  -H "Content-Type: application/json" \
  -d '{"output_text":"Here is your summary; DROP TABLE patients;"}' | python3 -m json.tool

# BLOCKED — script tag
curl -s -X POST http://localhost:8000/api/governance/llm09/scan \
  -H "Content-Type: application/json" \
  -d '{"output_text":"<script>fetch(evil)</script>"}' | python3 -m json.tool

# ALLOWED — clean clinical text
curl -s -X POST http://localhost:8000/api/governance/llm09/scan \
  -H "Content-Type: application/json" \
  -d '{"output_text":"Patient reports mild headache; advise rest and fluids."}' | python3 -m json.tool
```

### 5.5 Frontend — API client
**File:** `src/services/serviceNow.ts`. Clone `flagLlm02Event`/`fetchLlm02AuditLog`.

```typescript
export type Llm09ScanResult = {
  verdict: 'blocked' | 'allowed'
  matched_patterns: string[]
  action: string
  audit?: Llm02AuditEntry
  ai_case?: { sys_id: string; number: string }
}

export async function scanLlm09(outputText: string): Promise<Llm09ScanResult> {
  const res = await fetch(`${API_BASE}/governance/llm09/scan`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ output_text: outputText }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as Llm09ScanResult
}

export async function fetchLlm09AuditLog(): Promise<Llm02AuditEntry[]> {
  const res = await fetch(`${API_BASE}/governance/llm09/audit-log`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as Llm02AuditEntry[]
}
```

### 5.6 Frontend — the "Test agent output" demo box
**File:** `src/pages/governance/GovernanceDemoPage.tsx`. Add a card at the top of the `<section>`:
- a `<textarea>` pre-filled with `Here is your summary; DROP TABLE patients;`
- a row of quick-fill buttons for each pattern (SQL / `<script>` / `rm -rf` / `eval(`) so you can show several catches
- a **Scan output** button calling `scanLlm09(text)`
- result panel: if `blocked`, red **"🛑 BLOCKED — deterministic match"** banner listing `matched_patterns` (e.g. "SQL-query-injection"), plus **"AI Case opened: {ai_case.number}"** linking to `https://ven04690.service-now.com/now/nav/ui/classic/params/target/sn_ai_case_mgmt_ai_case.do?sys_id={ai_case.sys_id}`. If `allowed`, neutral "✓ Passed — no known-bad pattern."

Also add a launch card to the `demoLinks` array pointing at the patterns list (config-of-record):
```typescript
  {
    label: 'Output Injection Patterns',
    description: 'AI Security & Privacy — the 6 deterministic data patterns',
    href: `${SNOW_BASE}/now/nav/ui/classic/params/target/sn_data_discovery_data_pattern_list.do`,
    icon: ScanSearch,   // import from lucide-react
  },
```
Mirror styling from `GovernanceLlm02AuditPage.tsx`. Run `npm run dev` and confirm.

### 5.7 (Stretch, skip if tight) Live KPI + dedicated LLM09 audit page
Wire a dashboard KPI to `fetchLlm09AuditLog().length`, and/or clone `GovernanceLlm02AuditPage.tsx` → `GovernanceLlm09AuditPage.tsx`. Stretch only.

---

## 6. Verification — prove it end-to-end

```bash
# 1. LLM09 rows exist after a blocked scan
curl -s -u "$U:$P" "https://$SNOW/api/now/table/u_ai_action_audit_log?sysparm_query=u_agent_identity=llm09_output_injection^ORDERBYDESCsys_created_on&sysparm_fields=u_log_id,u_final_action,u_rejection_reason,sys_created_on&sysparm_limit=5" -H "Accept: application/json" | python3 -m json.tool

# 2. AI Case opened (sub-type adversarial)
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_ai_case_mgmt_ai_case?sysparm_query=case_subtype=88a5a11d7befd21005de3782f38cb63a^ORDERBYDESCsys_created_on&sysparm_fields=number,name,case_subtype&sysparm_display_value=all&sysparm_limit=5" -H "Accept: application/json" | python3 -m json.tool

# 3. The six SN patterns (config-of-record) are present
curl -s -u "$U:$P" "https://$SNOW/api/now/table/sn_data_discovery_data_pattern?sysparm_query=nameINHtml-Tag-injection,SQL-query-injection,Eval-Function-Audit,Non-printable-class,Script-Tag-injection,Terminal-RCE&sysparm_fields=name&sysparm_limit=10" -H "Accept: application/json" | python3 -m json.tool
```

**What you point at on stage:** CareAtlas Demo page → paste `; DROP TABLE patients;` → **BLOCKED**, matched pattern `SQL-query-injection`, AI Case number appears → click it → opens in ServiceNow → then show the six `sn_data_discovery_data_pattern` records: "these are ServiceNow's own deterministic patterns — same names, same regexes our detector just used."

---

## 7. Work Breakdown Schedule — 1 focused day (~7 hours)

> Ordered so a working demo exists early; later items are polish. If UC1 is already built, halve tasks 2–6 (you're cloning, not authoring).

| # | Task | Where | Est. | Depends | Done = |
|---|------|-------|------|---------|--------|
| 0 | Verify access (4 curls §2) | terminal | 0:15 | — | all pass; 6 patterns present |
| 1 | Pre-create backup AI Case (adversarial sub-type) | curl (§4.2) | 0:15 | 0 | `ACS000xxxx` exists, sub-type confirmed |
| 2 | Backend: scan + audit + AI-case + fetch functions (verbatim regexes) | `servicenow.py` (§5.3) | 1:15 | 0 | file saves, no import errors |
| 3 | Backend: `/llm09/scan` + `/llm09/audit-log` endpoints | `main.py` (§5.4) | 0:30 | 2 | blocked/allowed curls behave |
| 4 | **Milestone: backend demo works headless** (curl shows BLOCKED + AI Case) | terminal | 0:15 | 3 | ✅ first working demo |
| 5 | Frontend: API client `scanLlm09` / `fetchLlm09AuditLog` | `serviceNow.ts` (§5.5) | 0:25 | 3 | typechecks |
| 6 | Frontend: "Test agent output" demo box + patterns launch card | `GovernanceDemoPage.tsx` (§5.6) | 1:15 | 5 | box blocks + shows AI Case link |
| 7 | **Milestone: full UI click-through works** | browser | 0:15 | 6 | ✅ stage-ready |
| 8 | Confirm the 6 SN patterns visible + screenshot config-of-record | ServiceNow (§4.1) | 0:20 | 0 | screenshot saved |
| 9 | End-to-end verification + backup screenshots | §6 | 0:25 | 7,8 | all 3 curls pass |
| 10 | Rehearse the 3-min narrative (emphasize deterministic vs UC1 probabilistic) | §10 | 0:20 | 9 | timed, smooth |
| — | **STRETCH**: live KPI / dedicated LLM09 page (§5.7) | frontend | 0:40 | 7 | KPI shows real count |
| — | **STRETCH**: attempt native panel activation (§4 note) | ServiceNow | 0:60 | 8 | panel shows a finding (uncertain) |

**Critical path to a working demo = 0 → 1 → 2 → 3 → 4 (~2:30).** Protect it first; everything after improves the show.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| §2 auth ≠ 200 | wrong creds / instance asleep | re-check `server/.env`; open instance in a browser |
| AI Case create fails: "Validate date of occurrence and discovery" | dates missing or in the **future** | use **past** `date_of_occurrence` + `discovered_date`, discovery ≥ occurrence |
| `scan` returns `allowed` for bad output | output didn't match a regex | use a canonical payload (`; DROP TABLE x;`, `<script>…</script>`, `rm -rf /`); regexes are verbatim from SN |
| Native panel empty | no policy/active-pattern/scan (expected, §1) | don't rely on it; the backend + 6 pattern records carry the demo |
| `\p{C}` regex error in Python | stdlib `re` lacks `\p{C}` | use the `_has_nonprintable` helper (already in §5.3), or `pip install regex` |
| Frontend can't reach API | backend down / proxy | uvicorn on :8000; check `vite.config.ts` proxy / `VITE_API_BASE_URL` |
| Patterns list URL 404s | instance slug differs | open via `sn_data_discovery_data_pattern.list`, copy real URL into the card `href` |

---

## 9. How to run CareAtlas locally
```bash
# Backend
cd CareAtlas/server && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
# Frontend (separate terminal)
cd CareAtlas && npm install && npm run dev   # http://localhost:5173, proxies /api -> :8000
```

---

## 10. The 3-minute demo script (say this on stage)

1. **(20s)** "Agents don't just receive attacks — their *output* can carry them. A summary that secretly contains `DROP TABLE` or a `<script>` tag is dangerous the moment it reaches a database or browser. OWASP-style output handling."
2. **(30s)** "Unlike prompt injection, which we catch *probabilistically* with an LLM, this is **deterministic** — hard rules. A known-bad pattern is caught every time, identically."
3. **(40s)** Demo box → paste `Here is your summary; DROP TABLE patients;` → **Scan output** → red **BLOCKED**, matched **SQL-query-injection**. Try `<script>…</script>` and `rm -rf /` too — each blocked instantly.
4. **(40s)** Point at **"AI Case opened: AICASE…"** → click → opens live in ServiceNow with sub-type **Adversarial attacks**: "Blocked AND escalated to a formal incident automatically."
5. **(40s)** Open the **Output Injection Patterns** list in ServiceNow → show the six `sn_data_discovery_data_pattern` records: "These are ServiceNow's own deterministic patterns — same names, same regexes our detector just used. We're enforcing the platform's rules, live."
6. **(close)** "Before: a dangerous string slips downstream hoping a probabilistic check flags it. After: caught deterministically, blocked, audited, and a case opened — every time."

---

## 11. Quick reference — verified IDs & facts

- **Instance:** `ven04690.service-now.com` · creds in `CareAtlas/server/.env`
- **Six patterns** (`sn_data_discovery_data_pattern`, scope "AI Security and Privacy", OOTB): `SQL-query-injection`, `Script-Tag-injection`, `Html-Tag-injection`, `Eval-Function-Audit`, `Terminal-RCE`, `Non-printable-class` — regexes verbatim in §3.3
- **Detection plumbing empty:** `sn_data_discovery_active_data_pattern`/`_policy`/`_job_history`/`_finding` all = 0 → native panel won't show data
- **Evidence table:** `u_ai_action_audit_log` (reused); LLM09 filter key `u_agent_identity = llm09_output_injection`
- **AI Case:** `sn_ai_case_mgmt_ai_case`; sub-type `case_subtype` → **Adversarial attacks** `88a5a11d7befd21005de3782f38cb63a`; create needs **past** occurrence+discovery dates
- **Clone targets:** backend `servicenow.py` ~L811 + `main.py` L326–349; frontend `serviceNow.ts` L312–328; pages `GovernanceDemoPage.tsx`, `GovernanceLlm02AuditPage.tsx`

---

*Every table name, column, regex, reference record `sys_id`, and the AI-Case create payload in this document was verified against the live `ven04690` instance and the ServiceNow Zurich AI Control Tower documentation ("AI Control Tower Dashboard" → Security & Privacy → Agentic Output Injection Detection) on 2026-06-22. The native-panel limitation (empty detection plumbing) was confirmed by direct row-count probes and is stated as fact, not assumed; the backend-driven approach is the explicit mitigation.*
