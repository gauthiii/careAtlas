import { useState } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { redactPii, type RedactionResult } from '../../data/useCaseDemoData'
import { DemoTag } from './DemoTag'

const SAMPLE =
  "Patient Olivia Kumar (DOB 04/12/1986) can be reached at olivia.kumar@example.com or 415-555-0137. Insurance ID BCBS1029384756."

/**
 * UC1 · Privacy — "PII leak attempt → redacted" before/after box.
 * Wall 2 of the privacy defense: a Gen AI content filter scrubs any identifier
 * out of model output before it is shown or logged.
 */
export function PiiRedactionDemo() {
  const [text, setText] = useState(SAMPLE)
  const [result, setResult] = useState<RedactionResult | null>(null)

  return (
    <section className="rounded-xl border border-[#d7e5ec] bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h3 className="m-0 text-sm font-bold text-[#102033]">PII leak attempt → redacted</h3>
            <p className="m-0 text-[11px] font-semibold text-[#53687b]">
              UC1 · Privacy · OWASP LLM02 — Gen AI output filter (Wall 2)
            </p>
          </div>
        </div>
        <DemoTag />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-lg border border-[#cbdde6] bg-white px-3 py-2 text-sm text-[#102033] outline-none focus:border-[#0f5f8c]"
        aria-label="Candidate model output"
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setResult(redactPii(text))}
          className="inline-flex items-center gap-2 rounded-md bg-[#143A57] px-3 py-2 text-xs font-bold text-white hover:bg-[#1d4d73]"
        >
          Run privacy filter <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            setText(SAMPLE)
            setResult(null)
          }}
          className="rounded-md border border-[#cbdde6] bg-white px-3 py-2 text-xs font-semibold text-[#53687b] hover:bg-slate-50"
        >
          Reset
        </button>
      </div>

      {result && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[#f3a19c] bg-[#fff4f3] p-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#a22828]">Before — raw output</div>
            <p className="m-0 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#7a1f1f]">{text}</p>
          </div>
          <div className="rounded-lg border border-[#a7dfbf] bg-[#f0fbf5] p-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#0f6b4f]">After — filtered output</div>
            <p className="m-0 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#0f4d3a]">{result.redacted}</p>
          </div>
          <div className="md:col-span-2">
            {result.hits.length === 0 ? (
              <div className="rounded-md border border-[#a7dfbf] bg-[#f0fbf5] px-3 py-2 text-xs font-semibold text-[#0f6b4f]">
                No PII detected — output is clean.
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#53687b]">Redacted:</span>
                {result.hits.map((h) => (
                  <span
                    key={h.label}
                    className="rounded-full border border-[#f3a19c] bg-[#feeceb] px-2 py-0.5 text-[10px] font-bold text-[#a22828]"
                  >
                    {h.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
