import { type ReactNode, useState } from 'react'
import { AlertTriangle, ShieldCheck, ChevronRight, FlaskConical, Radio } from 'lucide-react'

/**
 * BeforeAfterDemo — the 4-step "before/after" storytelling frame requested in the
 * June 27 demo feedback (Tanush's 3-layer model: Process → Risk → Control).
 *
 * Layout, matching `Sample_AI_Use_Case_Process_Flows.pdf`:
 *   1. Process strip  — 5 boxes; the AI step is red (risk), the human/control step is green.
 *   2. Risk cards     — three ways the AI step can be exploited (the "before" damage).
 *   3. Control bar    — the platform-native control, in one line.
 *   4. Before / After — a toggle. "Before" is a CLIENT-SIDE SIMULATION of the unguarded
 *      path (live controls on the instance are never disabled). "After" renders the
 *      existing live-wired demo, which ends on a real ServiceNow record.
 */

export type StepTone = 'normal' | 'risk' | 'control'

export interface ProcessStep {
  label: string
  sub?: string
  tone?: StepTone
}

export interface RiskCard {
  title: string
  body: string
  /** e.g. "OWASP LLM02" / "NIST Harmful Bias" */
  ref?: string
}

interface BeforeAfterDemoProps {
  /** "Critical risk" / "High risk" pill shown top-right of the process strip. */
  riskLevel?: string
  /** One-line description of where the critical risk sits. */
  processCaption?: string
  process: ProcessStep[]
  /** Heading above the risk cards, e.g. "AI risks at step 3". */
  risksHeading?: string
  risks: RiskCard[]
  /** The control bar text (one line — the platform-native control). */
  control: string
  /** Simulated "damage" view (the exploit working, before any control). */
  before: ReactNode
  /** The live-wired demo (the control working, ending on a real record). */
  after: ReactNode
  beforeLabel?: string
  afterLabel?: string
}

const TONE: Record<StepTone, string> = {
  normal: 'border-[#dbe7ef] bg-[#f4f8fb] text-[#143A57]',
  risk: 'border-red-300 bg-red-50 text-red-700',
  control: 'border-emerald-300 bg-emerald-50 text-emerald-700',
}

export function BeforeAfterDemo({
  riskLevel,
  processCaption,
  process,
  risksHeading = 'AI risks at this step',
  risks,
  control,
  before,
  after,
  beforeLabel = 'Before the control',
  afterLabel = 'After the control',
}: BeforeAfterDemoProps) {
  const [view, setView] = useState<'before' | 'after'>('before')

  return (
    <div className="space-y-6">
      {/* 1. Process strip */}
      <section className="rounded-xl border border-[#d7e5ec] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="m-0 max-w-[42rem] text-sm text-[#53687b]">
            {processCaption ??
              'The AI step adds the value — and carries the critical risk. Watch the damage before the control, then the same attempt after it.'}
          </p>
          {riskLevel && (
            <span className="inline-flex flex-shrink-0 items-center rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700">
              {riskLevel}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-stretch gap-2">
          {process.map((step, i) => (
            <div key={i} className="flex items-stretch gap-2">
              <div className={`min-w-[8.5rem] flex-1 rounded-xl border px-3 py-2.5 ${TONE[step.tone ?? 'normal']}`}>
                <div className="text-sm font-bold">
                  {i + 1}. {step.label}
                </div>
                {step.sub && <div className="mt-0.5 text-[11px] opacity-80">{step.sub}</div>}
              </div>
              {i < process.length - 1 && (
                <span className="flex items-center text-[#9bb3c4]">
                  <ChevronRight size={18} />
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 2. Risk cards */}
      <section>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-red-700">
          <AlertTriangle size={15} /> {risksHeading}
        </h4>
        <div className="grid grid-cols-3 gap-3 max-[820px]:grid-cols-1">
          {risks.map((r, i) => (
            <div key={i} className="rounded-xl border border-red-200 bg-red-50/60 p-4">
              <div className="text-sm font-bold text-red-700">{r.title}</div>
              <p className="mt-1 text-[13px] leading-snug text-[#7a3b3b]">{r.body}</p>
              {r.ref && <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-red-400">{r.ref}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* 3. Control bar */}
      <section className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
        <span className="mt-0.5 text-emerald-600">
          <ShieldCheck size={20} />
        </span>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Control</span>
          <p className="m-0 mt-0.5 text-sm font-semibold leading-snug text-[#1b5e4a]">{control}</p>
        </div>
      </section>

      {/* 4. Before / After toggle */}
      <section className="rounded-xl border border-[#d7e5ec] bg-white p-5 shadow-sm">
        <div className="mb-4 inline-flex rounded-lg border border-[#d7e5ec] bg-[#f4f8fb] p-1">
          <button
            type="button"
            onClick={() => setView('before')}
            className={`rounded-md px-4 py-1.5 text-sm font-bold transition ${
              view === 'before' ? 'bg-red-600 text-white shadow-sm' : 'text-[#7a3b3b] hover:text-red-700'
            }`}
          >
            ② {beforeLabel}
          </button>
          <button
            type="button"
            onClick={() => setView('after')}
            className={`rounded-md px-4 py-1.5 text-sm font-bold transition ${
              view === 'after' ? 'bg-emerald-600 text-white shadow-sm' : 'text-[#1b5e4a] hover:text-emerald-700'
            }`}
          >
            ④ {afterLabel}
          </button>
        </div>

        {view === 'before' ? (
          <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
              <FlaskConical size={12} /> Simulation — no live control is disabled on the instance
            </div>
            {before}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              <Radio size={12} /> Live — the control enforced by ServiceNow, ending on a real record
            </div>
            {after}
          </div>
        )}
      </section>
    </div>
  )
}

/**
 * SimExchange — a compact simulated chat showing a rogue/unguarded agent obeying an
 * attack and the resulting damage. Used by the "before" panes that are chat-shaped.
 */
export function SimExchange({
  agent,
  prompt,
  response,
  impact,
}: {
  agent: string
  prompt: string
  response: string
  impact: string
}) {
  return (
    <div className="space-y-2.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[#6b7c8f]">{agent} · no governance applied</div>
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-[#143A57] px-3.5 py-2 text-sm text-white">
        {prompt}
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-red-200 bg-white px-3.5 py-2 text-sm text-[#40566b]">
        {response}
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
        <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" /> {impact}
      </div>
    </div>
  )
}
