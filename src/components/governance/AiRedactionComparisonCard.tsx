import { useEffect, useState } from 'react'
import { Bot, Loader2, Lock, ShieldCheck } from 'lucide-react'
import {
  fetchPatientAccessComparison,
  type PatientAccessComparison,
} from '../../services/serviceNow'

interface Props {
  /** Exact record to compare. Prefer sysId; q is a name/email/id search fallback. */
  lookup: { sysId?: string; q?: string }
  /** Heading shown at the top of the card. */
  title: string
  /** One-line framing under the heading. */
  intro: string
  /** Column label for the authorized/full view (e.g. "You", "You (clinician)"). */
  fullLabel: string
  /** Column label for the restricted AI agent view. */
  agentLabel?: string
}

/**
 * UC1 · Privacy — reusable side-by-side of one patient record as seen by an
 * authorized identity vs the restricted AI scheduling agent. The redaction is
 * enforced by ServiceNow's field-level ACL (the agent's response never contains
 * the PII), surfaced here for the patient and clinician portals.
 */
export function AiRedactionComparisonCard({
  lookup,
  title,
  intro,
  fullLabel,
  agentLabel = 'AI scheduling agent',
}: Props) {
  const [data, setData] = useState<PatientAccessComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    fetchPatientAccessComparison({ sysId: lookup.sysId, q: lookup.q })
      .then((d) => {
        if (active) setData(d)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Lookup failed')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [lookup.sysId, lookup.q])

  return (
    <section className="rounded-xl border border-[#d7e5ec] bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h3 className="m-0 text-sm font-bold text-[#102033]">{title}</h3>
            <p className="m-0 text-[11px] font-semibold text-[#53687b]">{intro}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f7ef] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0f6b4f]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" /> Live · ServiceNow
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-[#53687b]">
          <Loader2 size={16} className="animate-spin" /> Reading the record as each identity…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[#f3a19c] bg-[#fff4f3] px-3 py-2 text-xs font-semibold text-[#a22828]">
          {error}
        </div>
      ) : data ? (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-2 border-b border-[#e0e8ee] pb-2 text-[10px] font-bold uppercase tracking-wide text-[#6b7c8f]">
            <span>Field</span>
            <span className="flex items-center gap-1 text-[#0f6b4f]">
              <ShieldCheck size={11} /> {fullLabel}
            </span>
            <span className="flex items-center gap-1 text-[#a22828]">
              <Bot size={11} /> {agentLabel}
            </span>
          </div>

          <div>
            {data.fields.map((f, i) => {
              const redacted = f.redacted_for_restricted
              return (
                <div
                  key={f.key}
                  className={`grid grid-cols-[1.1fr_1fr_1fr] items-center gap-2 px-1 py-2 ${
                    i % 2 === 0 ? 'bg-[#f8fbfc]' : 'bg-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#37495a]">
                    {f.label}
                    {f.category === 'pii' ? (
                      <span className="rounded bg-[#eef3f7] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#6b7c8f]">
                        PII
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[12px] text-[#102033]">
                    {f.privileged_value || <span className="text-[#9aabba]">—</span>}
                  </span>
                  {redacted ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[12px] font-bold text-[#a22828]">
                      <Lock size={11} /> ████
                    </span>
                  ) : (
                    <span className="font-mono text-[12px] text-[#102033]">
                      {f.restricted_value || <span className="text-[#9aabba]">—</span>}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#a7dfbf] bg-[#f0fbf5] px-3 py-2 text-xs font-semibold text-[#0f6b4f]">
            <ShieldCheck size={15} className="mt-0.5 flex-shrink-0" />
            <span>
              {data.redacted_count} PII field{data.redacted_count === 1 ? '' : 's'} withheld from{' '}
              {agentLabel} by the ServiceNow field-level ACL — its response never contained them.
            </span>
          </div>
        </>
      ) : null}
    </section>
  )
}
