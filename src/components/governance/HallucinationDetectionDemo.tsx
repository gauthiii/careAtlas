import { FormEvent, useRef, useState } from 'react'
import { Activity, Bot, Loader2, Send, ShieldAlert, ShieldCheck, Siren, TriangleAlert } from 'lucide-react'
import {
  checkHallucinationLive,
  flagHallucinationEvent,
  type HallucinationLiveCheckResponse,
} from '../../services/serviceNow'
import { HALLUCINATION_RULE_NAMES, scanHallucination } from '../../data/useCaseDemoData'

const REASON_CATEGORIES = [
  'general_checkup', 'follow_up', 'urgent', 'mental_health', 'chronic', 'specialist',
]

const HINTS = [
  'I have been feeling a bit tired lately and want a general check-up.',
  'I need a routine follow-up after my last visit.',
  'I would like to see someone about my anxiety.',
  'I have had chest pains for the past two days.',
]

const ROGUE_OUTPUTS = [
  '{"urgency":"high","specialty":"oncology","appointment_type":"in_person"}',
  '{"urgency":"critical","specialty":"neurosurgery","appointment_type":"in_person","flag":"immediate"}',
  'Sure! Based on your symptoms I strongly recommend cardiothoracic surgery immediately. Urgency: critical. This is an emergency.',
]

const AGENTS = [
  { id: 'scheduling', label: 'Scheduling Agent', desc: 'Real NowAssist scheduling agent · UC13' },
  { id: 'rogue', label: 'Rogue Triage Agent', desc: 'Simulated misbehaving agent · triggers hallucination' },
]

export function HallucinationDetectorDemo({ onFlagged }: { onFlagged?: () => void }) {
  const [agentId, setAgentId] = useState('scheduling')
  const [input, setInput] = useState(HINTS[0])
  const [reasonCategory, setReasonCategory] = useState(REASON_CATEGORIES[0])
  const [result, setResult] = useState<HallucinationLiveCheckResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const rogueIndex = useRef(0)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      if (agentId === 'rogue') {
        // Fake agent latency so it looks real
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))
        const rogueOutput = ROGUE_OUTPUTS[rogueIndex.current % ROGUE_OUTPUTS.length]
        rogueIndex.current += 1

        // Run client-side rules (mirrors Python backend logic)
        const scan = scanHallucination(text, rogueOutput, reasonCategory)

        // Shape into the same response type the UI expects
        const fakeResult: HallucinationLiveCheckResponse = {
          verdict: scan.verdict,
          consistency_score: scan.consistencyScore,
          matched_rules: scan.matchedRules,
          action: scan.action,
          input_urgency: scan.inputUrgency,
          output_urgency: scan.outputUrgency,
          input_specialty: scan.inputSpecialty,
          output_specialty: scan.outputSpecialty,
          agent_output: rogueOutput,
          audit_logged: false,
        }

        // Log non-passing results to ServiceNow (real write)
        if (scan.verdict !== 'passed') {
          try {
            await flagHallucinationEvent({
              original_input: text,
              llm_raw_output: rogueOutput,
              consistency_score: scan.consistencyScore,
              urgency_input: scan.inputUrgency,
              urgency_claimed: scan.outputUrgency,
              specialty_input: scan.inputSpecialty,
              specialty_claimed: scan.outputSpecialty,
              matched_patterns: scan.matchedRules.map(r => r.rule).join(', '),
              action_taken: scan.verdict,
            })
            fakeResult.audit_logged = true
            onFlagged?.()
          } catch {
            // Log failure is non-fatal; result still shown
          }
        }

        setResult(fakeResult)
      } else {
        const res = await checkHallucinationLive(text, reasonCategory)
        setResult(res)
        if (res.verdict !== 'passed') onFlagged?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed')
    } finally {
      setBusy(false)
    }
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
            <h3 className="m-0 text-sm font-bold text-[#102033]">AI output integrity check</h3>
            <p className="m-0 text-[11px] font-semibold text-[#53687b]">
              UC13 · Security · OWASP LLM09 — live scheduling agent · real-time semantic scan
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f7ef] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0f6b4f]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" /> Live · ServiceNow
        </span>
      </div>

      {/* Agent selector */}
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#6b7c8f]">
        Agent
      </label>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {AGENTS.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => { setAgentId(a.id); setResult(null) }}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition ${
              agentId === a.id
                ? a.id === 'rogue'
                  ? 'border-red-400 bg-red-50 text-red-800'
                  : 'border-[#0f5f8c] bg-[#eef6fb] text-[#0f5f8c]'
                : 'border-[#cbdde6] bg-white text-[#53687b] hover:border-[#9ab8ca]'
            }`}
          >
            <span className={`mt-0.5 shrink-0 ${agentId === a.id && a.id === 'rogue' ? 'text-red-500' : ''}`}>
              {a.id === 'rogue' ? <TriangleAlert size={14} /> : <Bot size={14} />}
            </span>
            <div>
              <div className="text-[11px] font-bold leading-tight">{a.label}</div>
              <div className="mt-0.5 text-[10px] opacity-70 leading-tight">{a.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {agentId === 'rogue' && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" />
          <span>This is a simulated misbehaving agent. It will always return fabricated urgency or specialty — regardless of your input — to demonstrate what hallucination detection catches.</span>
        </div>
      )}

      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#6b7c8f]">
        Reason category
      </label>
      <select
        value={reasonCategory}
        onChange={e => { setReasonCategory(e.target.value); setResult(null) }}
        className="mb-3 w-full rounded-lg border border-[#cbdde6] bg-white px-3 py-2 text-sm text-[#102033] outline-none focus:border-[#0f5f8c]"
      >
        {REASON_CATEGORIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <form onSubmit={submit}>
        <div className="flex items-end gap-2 rounded-lg border border-[#cbdde6] bg-white p-2 focus-within:border-[#0f5f8c]">
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setResult(null) }}
            rows={2}
            className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-1 text-sm text-[#102033] outline-none"
            placeholder="Type a reason for visit…"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#143A57] text-white hover:bg-[#1d4d73] disabled:opacity-45"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {HINTS.map(h => (
          <button
            key={h}
            type="button"
            onClick={() => { setInput(h); setResult(null) }}
            className="rounded-full border border-[#cbdde6] bg-slate-50 px-2.5 py-1 text-[10.5px] font-semibold text-[#53687b] hover:bg-slate-100"
          >
            {h.length > 40 ? `${h.slice(0, 40)}…` : h}
          </button>
        ))}
      </div>

      {busy && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#cbdde6] bg-[#f8fcff] px-3 py-2.5 text-xs text-[#53687b]">
          <Loader2 size={13} className="animate-spin" />
          {agentId === 'rogue' ? 'Rogue Triage Agent responding…' : 'Scheduling Agent responding…'}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-[#f3a19c] bg-[#fff4f3] p-3 text-xs font-semibold text-[#a22828]">
          {error}
        </div>
      )}

      {result && (
        <>
          {result.agent_output && (
            <div className="mt-3 rounded-lg border border-[#cbdde6] bg-[#f8fcff] p-2.5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#6b7c8f]">
                Live agent response
              </div>
              <p className="m-0 whitespace-pre-wrap text-xs text-[#102033]">{result.agent_output}</p>
            </div>
          )}

          <div className={`mt-4 rounded-lg border p-3 ${verdictStyle.wrap}`}>
            <div className="mb-2 flex items-center gap-2 font-bold">
              <verdictStyle.Icon size={16} /> {verdictStyle.label}
              {agentId === 'rogue' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-300 px-2 py-0.5 text-[10px] font-bold text-red-700">
                  <TriangleAlert size={9} /> Rogue Triage Agent
                </span>
              )}
              <span className="ml-auto font-mono text-xs opacity-70">
                score {result.consistency_score.toFixed(2)}
              </span>
            </div>

            <div className="mb-2 grid grid-cols-2 gap-2 rounded-md bg-white/50 p-2 text-[11px]">
              <div>
                <div className="font-bold opacity-60">Expected urgency</div>
                <div className="font-mono">{result.input_urgency}</div>
              </div>
              <div>
                <div className="font-bold opacity-60">Agent implied urgency</div>
                <div className="font-mono">{result.output_urgency}</div>
              </div>
              <div>
                <div className="font-bold opacity-60">Expected specialty</div>
                <div className="font-mono">{result.input_specialty}</div>
              </div>
              <div>
                <div className="font-bold opacity-60">Agent implied specialty</div>
                <div className="font-mono">{result.output_specialty}</div>
              </div>
            </div>

            <p className="m-0 text-xs font-semibold">{result.action}</p>

            {result.matched_rules.length > 0 && (
              <div className="mt-2 grid gap-1.5">
                {result.matched_rules.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-current/20 bg-white/60 px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="font-bold">{r.rule}</span>
                    <span className="ml-1 opacity-80">— {r.explanation}</span>
                  </div>
                ))}
              </div>
            )}

            {result.audit_logged && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white/70 px-2 py-1 text-[11px] font-bold">
                ✓ Written to u_hallucination_log in ServiceNow
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-4 border-t border-[#e5eef3] pt-3">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#6b7c8f]">
          Semantic rules checked on every response
        </div>
        <div className="flex flex-wrap gap-1.5">
          {HALLUCINATION_RULE_NAMES.map(name => (
            <span
              key={name}
              className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-[#40566b]"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}