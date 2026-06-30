// ---------------------------------------------------------------------------
// Focus Five — client-side demo data + helpers
//
// Deterministic mock data and pure helper logic backing the use-case UI while
// the ServiceNow-backed endpoints are still being built. Nothing here calls the
// network; every value mirrors a real table/field documented in the
// `Plan md files/UC*.md` specs and verified live on ven04690 (2026-06-23).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// UC1 · Privacy — Sensitive Information Disclosure (OWASP LLM02)
// ---------------------------------------------------------------------------

/** PII fields on u_patient denied to the agent service accounts (Wall 1). */
export const DENIED_PII_FIELDS = [
  'u_first_name',
  'u_last_name',
  'u_email',
  'u_phone',
  'u_date_of_birth',
  'u_insurance_id',
] as const

export const PRIVACY_CONTROLS = {
  piiAclStatus: 'enforced' as 'enforced' | 'partial' | 'off',
  deniedFields: DENIED_PII_FIELDS.length,
  redactionOn: true,
  activeFilters: 3, // sys_gen_ai_filter active=true
  decisionLogRows: 17, // u_ai_decision_log
  anonymizationRate: 100, // % of rows keyed on u_patient_id_anon
}

export type RedactionResult = {
  redacted: string
  hits: { label: string; sample: string }[]
}

/**
 * Wall 2 — scrub recognizable PII out of a model output. Pure + deterministic.
 * Mirrors a PII-type Gen AI content filter scoped to the triage/summary agents.
 */
export function redactPii(text: string): RedactionResult {
  const patterns: { label: string; re: RegExp; mask: string }[] = [
    { label: 'Email', re: /[\w.+-]+@[\w-]+\.[\w.-]+/g, mask: '[REDACTED_EMAIL]' },
    {
      label: 'Phone',
      re: /(?:\+?\d{1,2}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g,
      mask: '[REDACTED_PHONE]',
    },
    { label: 'Date of birth', re: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, mask: '[REDACTED_DOB]' },
    { label: 'Insurance ID', re: /\b[A-Z]{2,4}\d{6,12}\b/g, mask: '[REDACTED_INSURANCE_ID]' },
    {
      label: 'Patient name',
      re: /\b(?:Olivia Kumar|James Whitfield|Maria Gonzalez|Aiden O'Brien)\b/g,
      mask: '[REDACTED_NAME]',
    },
  ]

  const hits: RedactionResult['hits'] = []
  let redacted = text
  for (const { label, re, mask } of patterns) {
    const matches = redacted.match(re)
    if (matches && matches.length > 0) {
      hits.push({ label, sample: matches[0] })
      redacted = redacted.replace(re, mask)
    }
  }
  return { redacted, hits }
}

// ---------------------------------------------------------------------------
// UC2 · Risk — Excessive Agency via ACL least-privilege (OWASP LLM06)
// ---------------------------------------------------------------------------

export type DeniedWriteProbe = {
  account: string
  target: string
  detail: string
}

/** Deny-WRITE probes proving each agent cannot act beyond its job. */
export const DENIED_WRITE_PROBES: DeniedWriteProbe[] = [
  {
    account: 'svc-scheduling-agent',
    target: 'write u_appointment.u_notes',
    detail: 'Scheduling agent cannot write a clinical note.',
  },
  {
    account: 'svc-notes-agent',
    target: 'write u_patient',
    detail: 'Notes agent cannot mutate the patient record.',
  },
  {
    account: 'svc-scheduling-agent',
    target: 'approve u_patient.u_registration_status',
    detail: 'Scheduling agent cannot self-approve a registration.',
  },
]

/** Intents that must stop for a human before an agent may act. */
export const HIGH_IMPACT_INTENTS = [
  'approve registration',
  'approve the registration',
  'write a clinical note',
  'write clinical note',
  'delete',
  'override',
  'escalate to urgent',
]

export function isHighImpactIntent(text: string): boolean {
  const t = text.toLowerCase()
  return HIGH_IMPACT_INTENTS.some((phrase) => t.includes(phrase))
}

// ---------------------------------------------------------------------------
// UC3 · Regulation — NIST AI RMF conformance + AI Impact Assessment classification
// ---------------------------------------------------------------------------

export type RegulatoryTier = 'High' | 'Medium' | 'Low' | 'Unacceptable' | 'To be determined' | 'Limited' | 'Minimal' | 'Unverified'

export type RegulatoryClassification = {
  agent: string
  tier: RegulatoryTier
  assessment: 'Completed' | 'In review' | 'Draft'
  friaAttached: boolean
}

export const REGULATORY_CLASSIFICATIONS: Record<string, RegulatoryClassification> = {
  'Triage Agent': { agent: 'Triage Agent', tier: 'High', assessment: 'Completed', friaAttached: true },
  'Scheduling Ranker': { agent: 'Scheduling Ranker', tier: 'Limited', assessment: 'Completed', friaAttached: false },
  'Identity Verifier': { agent: 'Identity Verifier', tier: 'High', assessment: 'In review', friaAttached: true },
  'Appointment Summarizer': {
    agent: 'Appointment Summarizer',
    tier: 'Limited',
    assessment: 'Draft',
    friaAttached: false,
  },
  'Legacy Slot Optimizer': {
    agent: 'Legacy Slot Optimizer',
    tier: 'Minimal',
    assessment: 'Draft',
    friaAttached: false,
  },
}

/** Best-effort tier from a free-form agent / asset name (keyword heuristic). */
export function classifyByName(name: string): RegulatoryClassification {
  const exact = REGULATORY_CLASSIFICATIONS[name]
  if (exact) return exact
  const n = name.toLowerCase()
  if (n.includes('triage') || n.includes('identity') || n.includes('diagnos')) {
    return { agent: name, tier: 'High', assessment: 'In review', friaAttached: true }
  }
  if (n.includes('schedul') || n.includes('summar') || n.includes('remind') || n.includes('note')) {
    return { agent: name, tier: 'Limited', assessment: 'Draft', friaAttached: false }
  }
  return { agent: name, tier: 'Minimal', assessment: 'Draft', friaAttached: false }
}

// ---------------------------------------------------------------------------
// UC5 · Security — Prompt-injection defense + output-pattern detection
// ---------------------------------------------------------------------------

export type GuardrailVerdict = 'blocked' | 'flagged' | 'clean'

export type GuardrailScanResult = {
  verdict: GuardrailVerdict
  matchedPatterns: { name: string; surface: 'input' | 'output' }[]
  action: string
  aiCaseOpened: boolean
}

/** Output patterns scanned on every agent response (sn_data_discovery_data_pattern). */
const OUTPUT_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'SQL-query-injection', re: /(union\s+select|drop\s+table|or\s+1=1|;\s*--)/i },
  { name: 'Script-Tag-injection', re: /<script[\s>]/i },
  { name: 'Html-Tag-injection', re: /<(img|iframe|svg)[\s>]/i },
  { name: 'Eval-Function-Audit', re: /\beval\s*\(/i },
  { name: 'Terminal-RCE', re: /(rm\s+-rf|curl\s+http|wget\s+http|bash\s+-c|\/bin\/sh)/i },
]

/** Input guardrail phrasing (instruction-override + data-exfiltration). */
const INPUT_INJECTION_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'Instruction-override', re: /(ignore (your|previous|all).*instructions|disregard (the|your) (rules|policy))/i },
  { name: 'Privilege-escalation', re: /(mark me urgent|set.*priority.*urgent|make me (an )?admin)/i },
  { name: 'Data-exfiltration', re: /(dump (the )?(full )?record|exfiltrate|send.*all.*(records|data)|reveal.*(patient|pii))/i },
]

/**
 * Scan candidate text against the input guardrail + output patterns.
 * Deterministic stand-in for POST /governance/guardrail/scan.
 */
export function scanGuardrail(text: string): GuardrailScanResult {
  const matched: GuardrailScanResult['matchedPatterns'] = []
  for (const p of INPUT_INJECTION_PATTERNS) {
    if (p.re.test(text)) matched.push({ name: p.name, surface: 'input' })
  }
  for (const p of OUTPUT_PATTERNS) {
    if (p.re.test(text)) matched.push({ name: p.name, surface: 'output' })
  }

  const hasInput = matched.some((m) => m.surface === 'input')
  if (matched.length === 0) {
    return { verdict: 'clean', matchedPatterns: [], action: 'Allowed — no guardrail trip.', aiCaseOpened: false }
  }
  if (hasInput) {
    return {
      verdict: 'blocked',
      matchedPatterns: matched,
      action: 'Blocked before the model acted · AI Case opened (sn_ai_case_mgmt_ai_case).',
      aiCaseOpened: true,
    }
  }
  return {
    verdict: 'flagged',
    matchedPatterns: matched,
    action: 'Flagged on output scan · routed to security review.',
    aiCaseOpened: false,
  }
}

export const OUTPUT_PATTERN_NAMES = OUTPUT_PATTERNS.map((p) => p.name)

// ---------------------------------------------------------------------------
// UC6 · Fairness — non-discriminatory scheduling (NIST AI RMF · Harmful Bias)
// ---------------------------------------------------------------------------

export type FairnessGroup = { group: string; biased: number; debiased: number; expected: number }

/** Appointment-outcome allocation (%) by demographic group. */
export const FAIRNESS_BY_ETHNICITY: FairnessGroup[] = [
  { group: 'Asian', biased: 32, debiased: 23, expected: 23 },
  { group: 'Black', biased: 20, debiased: 21, expected: 21 },
  { group: 'Mixed', biased: 24, debiased: 23, expected: 23 },
  { group: 'White', biased: 27, debiased: 28, expected: 28 },
  { group: 'Other', biased: 11, debiased: 13, expected: 13 },
]

export const FAIRNESS_BY_GENDER: FairnessGroup[] = [
  { group: 'Female', biased: 41, debiased: 49, expected: 50 },
  { group: 'Male', biased: 56, debiased: 49, expected: 49 },
  { group: 'Other', biased: 3, debiased: 2, expected: 1 },
]

export const FAIRNESS_BY_AGE: FairnessGroup[] = [
  { group: '18–34', biased: 38, debiased: 31, expected: 30 },
  { group: '35–54', biased: 34, debiased: 35, expected: 35 },
  { group: '55–74', biased: 20, debiased: 24, expected: 25 },
  { group: '75+', biased: 8, debiased: 10, expected: 10 },
]

/** Largest absolute skew (percentage points) for a group set, given a mode. */
export function maxSkew(groups: FairnessGroup[], mode: 'biased' | 'debiased'): number {
  return Math.max(...groups.map((g) => Math.abs(g[mode] - g.expected)))
}

// ---------------------------------------------------------------------------
// UC13 · Security – AI Output Integrity & Hallucination Detection (OWASP LLM09)
// ---------------------------------------------------------------------------

export type HallucinationVerdict = 'passed' | 'held' | 'blocked'

export type HallucinationMatch = {
  rule: string
  explanation: string
}

export type HallucinationScanResult = {
  verdict: HallucinationVerdict
  consistencyScore: number
  matchedRules: HallucinationMatch[]
  action: string
  inputUrgency: string
  outputUrgency: string
  inputSpecialty: string
  outputSpecialty: string
}

export const HALLUCINATION_PRESETS = [
  {
    label: 'Sample 1 — Urgency fabrication',
    input: 'I have been feeling a bit tired lately and want a general check-up.',
    reasonCategory: 'general_checkup',
    llmOutput: '{"urgency":"high","specialty":"oncology","appointment_type":"in_person"}',
  },
  {
    label: 'Sample 2 — Specialty mismatch',
    input: 'I need a routine follow-up after my last visit.',
    reasonCategory: 'follow_up',
    llmOutput: '{"urgency":"medium","specialty":"cardiothoracic_surgery","appointment_type":"in_person"}',
  },
  {
    label: 'Sample 3 — Malformed JSON',
    input: 'I would like to see someone about my anxiety.',
    reasonCategory: 'mental_health',
    llmOutput: 'Sure! I recommend cardiology immediately for your anxiety. Urgency: critical.',
  },
  {
    label: 'Sample 4 — Clean output (should pass)',
    input: 'I need a routine appointment to check my blood pressure.',
    reasonCategory: 'general_checkup',
    llmOutput: '{"urgency":"low","specialty":"general_practice","appointment_type":"in_person"}',
  },
]

const SPECIALTY_MAP: Record<string, string> = {
  general_checkup: 'general_practice',
  follow_up: 'general_practice',
  urgent: 'general_practice',
  mental_health: 'mental_health',
  chronic: 'general_practice',
  specialist: 'specialist',
}

const HIGH_ACUITY = ['oncology', 'neurosurgery', 'cardiothoracic', 'cardiothoracic_surgery', 'transplant']

const URGENCY_KEYWORDS = /pain|urgent|severe|emergency|worried|scared|chest|breathing|collapse/i

function inferUrgency(input: string, category: string): string {
  if (/chest pain|can't breathe|breathing|severe|emergency|collapse/i.test(input)) return 'high'
  if (category === 'urgent') return 'high'
  if (category === 'chronic' || category === 'mental_health') return 'medium'
  return 'low'
}

export function scanHallucination(
  inputText: string,
  llmOutput: string,
  reasonCategory: string,
): HallucinationScanResult {
  const rules: HallucinationMatch[] = []
  let score = 0.0

  const expectedUrgency = inferUrgency(inputText, reasonCategory)
  const expectedSpecialty = SPECIALTY_MAP[reasonCategory] ?? 'general_practice'

  let outputUrgency = ''
  let outputSpecialty = ''

  // Rule 1: JSON structure
  let parsed: Record<string, string> | null = null
  try {
    const clean = llmOutput.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    score = Math.max(score, 0.90)
    rules.push({ rule: 'Malformed JSON', explanation: 'LLM output is not valid JSON — cannot be safely acted upon.' })
  }

  if (parsed) {
    outputUrgency = (parsed.urgency ?? '').toLowerCase()
    outputSpecialty = (parsed.specialty ?? '').toLowerCase()

    // Rule 2: Missing required fields
    if (!parsed.urgency || !parsed.specialty || !parsed.appointment_type) {
      score = Math.max(score, 0.75)
      rules.push({ rule: 'Missing required fields', explanation: 'urgency, specialty, or appointment_type absent from LLM response.' })
    }

    // Rule 3: Urgency escalation without input evidence
    if (outputUrgency === 'high' && expectedUrgency === 'low') {
      const hasKeywords = URGENCY_KEYWORDS.test(inputText)
      const bump = hasKeywords ? 0.55 : 0.82
      score = Math.max(score, bump)
      rules.push({
        rule: 'Urgency escalation',
        explanation: hasKeywords
          ? 'LLM claimed high urgency; input contains some concerning words but category is low-urgency.'
          : 'LLM claimed high urgency with no supporting keywords in the patient input.',
      })
    }

    // Rule 4: High-acuity specialty without clinical evidence
    if (HIGH_ACUITY.some(s => outputSpecialty.includes(s))) {
      score = Math.max(score, 0.80)
      rules.push({
        rule: 'High-acuity specialty fabricated',
        explanation: `LLM returned "${outputSpecialty}" — a high-acuity specialty very unlikely to match a portal booking input.`,
      })
    }

    // Rule 5: General specialty mismatch
    if (expectedSpecialty !== 'specialist' && outputSpecialty && outputSpecialty !== expectedSpecialty) {
      if (!HIGH_ACUITY.some(s => outputSpecialty.includes(s))) {
        score = Math.max(score, 0.55)
        rules.push({
          rule: 'Specialty mismatch',
          explanation: `Expected "${expectedSpecialty}" for category "${reasonCategory}" but LLM returned "${outputSpecialty}".`,
        })
      }
    }
  }

  let verdict: HallucinationVerdict
  let action: string
  if (score >= 0.85) {
    verdict = 'blocked'
    action = 'Output blocked. Scheduling fallback to default specialty for this reason category. SecOps incident raised.'
  } else if (score >= 0.60) {
    verdict = 'held'
    action = 'Output held for human review. Scheduling proceeded with safe defaults. Governance officer notified.'
  } else {
    verdict = 'passed'
    action = 'Output passed semantic validation. Scheduling logic received LLM response.'
  }

  return {
    verdict,
    consistencyScore: score,
    matchedRules: rules,
    action,
    inputUrgency: expectedUrgency,
    outputUrgency: outputUrgency || '(not parsed)',
    inputSpecialty: expectedSpecialty,
    outputSpecialty: outputSpecialty || '(not parsed)',
  }
}

export const HALLUCINATION_RULE_NAMES = [
  'Malformed JSON',
  'Missing required fields',
  'Urgency escalation',
  'High-acuity specialty fabricated',
  'Specialty mismatch',
]