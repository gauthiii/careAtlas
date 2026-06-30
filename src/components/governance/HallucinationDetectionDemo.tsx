import { useState } from 'react'
import { Activity, ShieldAlert, ShieldCheck, Siren } from 'lucide-react'
import {
  HALLUCINATION_PRESETS,
  HALLUCINATION_RULE_NAMES,
  scanHallucination,
  type HallucinationScanResult,
} from '../../data/useCaseDemoData'
import { flagHallucinationEvent } from '../../services/serviceNow'
import { DemoTag } from './DemoTag'

export function HallucinationDetectorDemo() {
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [customInput, setCustomInput] = useState(HALLUCINATION_PRESETS[0].input)
  const [customOutput, setCustomOutput] = useState(HALLUCINATION_PRESETS[0].llmOutput)
  const [reasonCategory, setReasonCategory] = useState(HALLUCINATION_PRESETS[0].reasonCategory)
  const [result, setResult] = useState<HallucinationScanResult | null>(null)
  const [logging, setLogging] = useState(false)
  const [logged, setLogged] = useState(false)

  function applyPreset(index: number) {
    const p = HALLUCINATION_PRESETS[index]
    setSelectedPreset(index)
    setCustomInput(p.input)
    setCustomOutput(p.llmOutput)
    setReasonCategory(p.reasonCategory)
    setResult(null)
    setLogged(false)
  }

  function runScan() {
    const r = scanHallucination(customInput, customOutput, reasonCategory)
    setResult(r)
    setLogged(false)
  }

  async function logToServiceNow() {
    if (!result) return
    setLogging(true)
    try {
      await flagHallucinationEvent({
        original_input: customInput,
        llm_raw_output: customOutput,
        consistency_score: result.consistencyScore,
        urgency_input: result.inputUrgency,
        urgency_claimed: result.outputUrgency,
        specialty_input: result.inputSpecialty,
        specialty_claimed: result.outputSpecialty,
        matched_patterns: result.matchedRules.map(r => r.rule).join(', '),
        action_taken: result.verdict,
      })
      setLogged(true)
    } catch (err) {
      console.error('Hallucination log failed:', err)
    }
    setLogging(false)
  }

  const verdictStyle =
    result?.verdict === 'blocked'
      ? { wrap: 'border-[#f3a19c] bg-[#fff4f3] text-[#a22828]', Icon: ShieldAlert, label: 'Blocked' }
      : result?.verdict === 'held'
        ? { wrap: 'border-amber-300 bg-amber-50 text-amber-700', Icon: Siren, label: 'Held for review' }
        : { wrap: 'border-[#a7dfbf] bg-[#f0fbf5] text-[#0f6b4f]', Icon: ShieldCheck, label: 'Passed' }

  return (
    <section className="rounded-xl border border-[#d7e5ec] bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fdf0e8] text-[#a25f0f]">
            <Activity size={18} />
          </span>
          <div>
            <h3 className="m-0 text-sm font-bold text-[#102033]">Test LLM output integrity</h3>
            <p className="m-0 text-[11px] font-semibold text-[#53687b]">
              UC13 · Security · OWASP LLM09 — semantic consistency scan on scheduling agent output
            </p>
          </div>
        </div>
        <DemoTag />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {HALLUCINATION_PRESETS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => applyPreset(i)}
            className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition ${
              selectedPreset === i
                ? 'border-[#143A57] bg-[#143A57] text-white'
                : 'border-[#cbdde6] bg-slate-50 text-[#53687b] hover:bg-slate-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#6b7c8f]">
        Patient input (reason text)
      </label>
      <textarea
        value={customInput}
        onChange={e => { setCustomInput(e.target.value); setResult(null) }}
        rows={2}
        className="mb-3 w-full resize-none rounded-lg border border-[#cbdde6] bg-white px-3 py-2 text-sm text-[#102033] outline-none focus:border-[#0f5f8c]"
      />

      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#6b7c8f]">
        LLM raw output (JSON)
      </label>
      <textarea
        value={customOutput}
        onChange={e => { setCustomOutput(e.target.value); setResult(null) }}
        rows={2}
        className="mb-3 w-full resize-none rounded-lg border border-[#cbdde6] bg-[#f8fcff] px-3 py-2 font-mono text-xs text-[#102033] outline-none focus:border-[#0f5f8c]"
      />

      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#6b7c8f]">
        Reason category
      </label>
      <select
        value={reasonCategory}
        onChange={e => { setReasonCategory(e.target.value); setResult(null) }}
        className="mb-3 w-full rounded-lg border border-[#cbdde6] bg-white px-3 py-2 text-sm text-[#102033] outline-none focus:border-[#0f5f8c]"
      >
        {['general_checkup', 'follow_up', 'urgent', 'mental_health', 'chronic', 'specialist'].map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runScan}
          className="inline-flex items-center gap-2 rounded-md bg-[#143A57] px-3 py-2 text-xs font-bold text-white hover:bg-[#1d4d73]"
        >
          <Activity size={14} /> Scan output
        </button>
        {result && result.verdict !== 'passed' && (
          <button
            type="button"
            onClick={logToServiceNow}
            disabled={logging || logged}
            className="inline-flex items-center gap-2 rounded-md border border-[#cbdde6] bg-white px-3 py-2 text-xs font-bold text-[#0f5f8c] hover:bg-[#edf5fa] disabled:opacity-50"
          >
            {logged ? '✓ Logged to ServiceNow' : logging ? 'Logging…' : 'Log to ServiceNow'}
          </button>
        )}
      </div>

      {result && (
        <div className={`mt-4 rounded-lg border p-3 ${verdictStyle.wrap}`}>
          <div className="mb-2 flex items-center gap-2 font-bold">
            <verdictStyle.Icon size={16} /> {verdictStyle.label}
            <span className="ml-auto font-mono text-xs opacity-70">
              score {result.consistencyScore.toFixed(2)}
            </span>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2 rounded-md bg-white/50 p-2 text-[11px]">
            <div><div className="font-bold opacity-60">Expected urgency</div><div className="font-mono">{result.inputUrgency}</div></div>
            <div><div className="font-bold opacity-60">LLM claimed urgency</div><div className="font-mono">{result.outputUrgency}</div></div>
            <div><div className="font-bold opacity-60">Expected specialty</div><div className="font-mono">{result.inputSpecialty}</div></div>
            <div><div className="font-bold opacity-60">LLM claimed specialty</div><div className="font-mono">{result.outputSpecialty}</div></div>
          </div>
          <p className="m-0 text-xs font-semibold">{result.action}</p>
          {result.matchedRules.length > 0 && (
            <div className="mt-2 grid gap-1.5">
              {result.matchedRules.map((r, i) => (
                <div key={i} className="rounded-md border border-current/20 bg-white/60 px-2.5 py-1.5 text-[11px]">
                  <span className="font-bold">{r.rule}</span>
                  <span className="ml-1 opacity-80">— {r.explanation}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-[#e5eef3] pt-3">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#6b7c8f]">
          Semantic rules checked on every LLM response
        </div>
        <div className="flex flex-wrap gap-1.5">
          {HALLUCINATION_RULE_NAMES.map(name => (
            <span key={name} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-[#40566b]">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}