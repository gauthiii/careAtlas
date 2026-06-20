import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Fingerprint,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldX,
} from 'lucide-react'

import { PortalPage } from '../../components/portal/PortalShell'
import { cn } from '../../lib/cn'
import { fetchLlm02AuditLog, type Llm02AuditEntry } from '../../services/serviceNow'

export function GovernanceLlm02AuditPage() {
  const [entries, setEntries] = useState<Llm02AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setEntries(await fetchLlm02AuditLog())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the audit log.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <PortalPage
      label="AI Governance Officer"
      title="Audit log for LLM02"
      intro="Every request blocked under LLM02 — Sensitive Information Disclosure is recorded here from the u_ai_action_audit_log table in ServiceNow. These are attempts to surface patient PII that the governance guardrail intercepted and flagged."
    >
      <section className="min-w-0 px-6 pb-10">
        {/* Toolbar + summary */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f1c4c4] bg-gradient-to-r from-[#7f1d1d] to-[#b42318] px-5 py-4 text-white shadow-[0_8px_24px_rgba(127,29,29,0.22)]">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-white/15">
              <ShieldAlert size={24} />
            </span>
            <div>
              <div className="text-[0.72rem] font-bold uppercase tracking-widest text-white/60">
                LLM02 — Sensitive Information Disclosure
              </div>
              <div className="text-2xl font-black tracking-tight">
                {loading ? '—' : entries.length} flagged {entries.length === 1 ? 'event' : 'events'}
              </div>
              <div className="mt-0.5 text-sm text-white/70">
                Source table: u_ai_action_audit_log · identity: governance_user_identity
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#f2c9c9] bg-[#fff4f4] p-4 text-sm font-semibold text-[#8a2f2f]">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="grid place-items-center rounded-2xl border border-[#e3edf3] bg-white py-16 text-sm font-bold text-[#53687b]">
            <Loader2 size={20} className="mb-2 animate-spin text-[#b42318]" />
            Loading audit log…
          </div>
        ) : entries.length === 0 && !error ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-[#cfdbe4] bg-white py-16 text-center">
            <ShieldX size={26} className="mb-2 text-[#8aa0b3]" />
            <div className="text-sm font-black text-[#102033]">No LLM02 events flagged yet</div>
            <div className="mt-1 max-w-[420px] text-xs font-semibold text-[#53687b]">
              When a request for patient PII is blocked on the AI Agents page, it will be recorded here.
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#e3edf3] bg-white shadow-[0_4px_16px_rgba(25,64,93,0.07)]">
            {/* Table header */}
            <div className="grid grid-cols-[170px_minmax(160px,1fr)_140px_120px_minmax(220px,1.4fr)] gap-3 border-b border-[#eef3f7] bg-[#f8fbfc] px-5 py-3 text-[0.66rem] font-black uppercase tracking-[0.06em] text-[#607487] max-[900px]:hidden">
              <span>Timestamp</span>
              <span>Agent identity</span>
              <span>Action</span>
              <span>Final action</span>
              <span>Reason</span>
            </div>

            <div className="divide-y divide-[#f0f5f8]">
              {entries.map((entry) => (
                <AuditRow key={entry.sys_id || entry.log_id} entry={entry} />
              ))}
            </div>
          </div>
        )}
      </section>
    </PortalPage>
  )
}

function AuditRow({ entry }: { entry: Llm02AuditEntry }) {
  return (
    <div className="grid grid-cols-[170px_minmax(160px,1fr)_140px_120px_minmax(220px,1.4fr)] items-start gap-3 px-5 py-4 text-sm max-[900px]:grid-cols-1 max-[900px]:gap-1.5">
      {/* Timestamp */}
      <div className="font-bold text-[#102033]">
        <span className="hidden max-[900px]:inline text-[0.62rem] font-black uppercase tracking-widest text-[#8aa0b3]">Timestamp · </span>
        {entry.timestamp || '—'}
        {entry.log_id && (
          <div className="mt-0.5 text-[0.66rem] font-semibold text-[#8aa0b3] [overflow-wrap:anywhere]">
            {entry.log_id}
          </div>
        )}
      </div>

      {/* Agent identity */}
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0ea] bg-[#eef6fb] px-2 py-1 text-[0.72rem] font-bold text-[#0f5f8c] [overflow-wrap:anywhere]">
          <Fingerprint size={12} />
          {entry.agent_identity || '—'}
        </span>
      </div>

      {/* Action type — the table's restricted choice list has no PII-read value,
          so these guardrail rows store it blank; show a meaningful label here. */}
      <div className="text-[0.78rem] font-semibold text-[#53687b]">
        {entry.action_type || 'Sensitive info request'}
      </div>

      {/* Final action badge */}
      <div>
        <FinalActionBadge value={entry.final_action} />
      </div>

      {/* Reason */}
      <div className="text-xs leading-relaxed text-[#53687b] [overflow-wrap:anywhere]">
        {entry.rejection_reason || '—'}
      </div>
    </div>
  )
}

function FinalActionBadge({ value }: { value: string }) {
  const blocked = value.toLowerCase().includes('block')
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-bold',
        blocked ? 'bg-[#fdeaea] text-[#b42318]' : 'bg-[#eef6fb] text-[#0f5f8c]',
      )}
    >
      <ShieldX size={11} />
      {value || 'blocked'}
    </span>
  )
}
