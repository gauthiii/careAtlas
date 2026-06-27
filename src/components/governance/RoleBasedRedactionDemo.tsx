import { useCallback, useEffect, useState } from 'react'
import { EyeOff, Loader2, Lock, Search, ShieldCheck, UserCog, Bot } from 'lucide-react'
import {
  fetchPatientAccessComparison,
  type AgentIdentity,
  type PatientAccessComparison,
} from '../../services/serviceNow'

type AgentKey = 'restricted' | 'privileged'

/**
 * UC1 · Privacy — live role-based redaction.
 *
 * Requests ONE real patient record from ServiceNow as two differently-scoped
 * non-human agents and lets the presenter toggle between them. The redaction is
 * enforced by the field-level ACL on the instance (role_patient_pii), not faked
 * in the browser: the restricted agent literally never receives the PII columns.
 */
export function RoleBasedRedactionDemo() {
  const [data, setData] = useState<PatientAccessComparison | null>(null)
  const [agent, setAgent] = useState<AgentKey>('restricted')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (q?: string) => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchPatientAccessComparison(q))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const identity: AgentIdentity | null = data ? data[agent] : null

  return (
    <section className="rounded-xl border border-[#d7e5ec] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h3 className="m-0 text-sm font-bold text-[#102033]">
              Request patient details as an AI agent — live role-based redaction
            </h3>
            <p className="m-0 text-[11px] font-semibold text-[#53687b]">
              UC1 · Privacy · OWASP LLM02 — enforced by ServiceNow field-level ACL (Wall 1)
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f7ef] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0f6b4f]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" /> Live · ServiceNow
        </span>
      </div>

      {/* Agent toggle */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <AgentToggleButton
          active={agent === 'restricted'}
          onClick={() => setAgent('restricted')}
          icon={<Bot size={16} />}
          title="Scheduling Agent"
          subtitle="No role_patient_pii"
          tone="danger"
        />
        <AgentToggleButton
          active={agent === 'privileged'}
          onClick={() => setAgent('privileged')}
          icon={<UserCog size={16} />}
          title="Clinical Agent"
          subtitle="Has role_patient_pii"
          tone="good"
        />
      </div>

      {/* Patient search */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void load(query)
        }}
        className="mb-4 flex gap-2"
      >
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8aa0b2]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient by name / email / ID (blank = sample patient)"
            className="w-full rounded-lg border border-[#cbdde6] bg-white py-2 pl-9 pr-3 text-sm text-[#102033] outline-none focus:border-[#0f5f8c]"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-[#143A57] px-3 py-2 text-xs font-bold text-white hover:bg-[#1d4d73]"
        >
          Request record
        </button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-[#53687b]">
          <Loader2 size={16} className="animate-spin" /> Requesting patient record from ServiceNow…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[#f3a19c] bg-[#fff4f3] px-3 py-2 text-xs font-semibold text-[#a22828]">
          {error}
        </div>
      ) : data && identity ? (
        <>
          {/* Identity banner */}
          <div
            className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
              identity.has_pii_role
                ? 'border-[#a7dfbf] bg-[#f0fbf5] text-[#0f6b4f]'
                : 'border-[#f3a19c] bg-[#fff4f3] text-[#a22828]'
            }`}
          >
            <div className="font-bold">
              Acting as: {identity.label}{' '}
              <span className="font-mono font-semibold">({identity.username})</span>
            </div>
            <div className="font-semibold opacity-90">
              Role: {identity.role} ·{' '}
              {identity.has_pii_role
                ? 'Authorized to read patient PII.'
                : 'PII columns stripped by field-level ACL.'}
            </div>
            {identity.note ? (
              <div className="mt-1 text-[11px] font-semibold opacity-80">⚠ {identity.note}</div>
            ) : null}
          </div>

          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7c8f]">
            Patient record · ref {data.patient_ref || '—'}
          </div>

          <div className="overflow-hidden rounded-lg border border-[#e0e8ee]">
            {data.fields.map((f, i) => {
              const value = agent === 'privileged' ? f.privileged_value : f.restricted_value
              const redacted = agent === 'restricted' && f.redacted_for_restricted
              return (
                <div
                  key={f.key}
                  className={`flex items-center justify-between gap-3 px-3 py-2 ${
                    i % 2 === 0 ? 'bg-[#f8fbfc]' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-[#37495a]">{f.label}</span>
                    {f.category === 'pii' ? (
                      <span className="rounded bg-[#eef3f7] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#6b7c8f]">
                        PII
                      </span>
                    ) : null}
                  </div>
                  {redacted ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[12.5px] font-bold text-[#a22828]">
                      <Lock size={12} /> ████ REDACTED
                    </span>
                  ) : (
                    <span className="font-mono text-[12.5px] text-[#102033]">
                      {value || <span className="text-[#9aabba]">—</span>}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-[#53687b]">
            <EyeOff size={13} />
            {agent === 'restricted'
              ? `${data.redacted_count} PII field${data.redacted_count === 1 ? '' : 's'} withheld from this agent by ServiceNow — the response never contained them.`
              : 'Full record returned — this agent holds role_patient_pii.'}
          </div>
        </>
      ) : null}
    </section>
  )
}

function AgentToggleButton({
  active,
  onClick,
  icon,
  title,
  subtitle,
  tone,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
  tone: 'good' | 'danger'
}) {
  const activeClasses =
    tone === 'good'
      ? 'border-[#0f6b4f] bg-[#f0fbf5] text-[#0f6b4f]'
      : 'border-[#a22828] bg-[#fff4f3] text-[#a22828]'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
        active ? activeClasses : 'border-[#d7e5ec] bg-white text-[#53687b] hover:border-[#b8cdd9]'
      }`}
    >
      <span
        className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${
          active ? 'bg-white/70' : 'bg-[#f1f5f8]'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold leading-tight">{title}</span>
        <span className="block font-mono text-[10.5px] font-semibold leading-tight opacity-80">
          {subtitle}
        </span>
      </span>
    </button>
  )
}
