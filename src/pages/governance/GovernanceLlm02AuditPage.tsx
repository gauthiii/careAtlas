import { useCallback, useEffect, useState, useRef } from 'react'
import {
  AlertTriangle,
  Fingerprint,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldX,
  Download,
  RectangleHorizontal,
  RectangleVertical,
} from 'lucide-react'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'

import { PortalPage } from '../../components/portal/PortalShell'
import { cn } from '../../lib/cn'
import { fetchLlm02AuditLog, type Llm02AuditEntry } from '../../services/serviceNow'

export function GovernanceLlm02AuditPage() {
  const [entries, setEntries] = useState<Llm02AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const pageRef = useRef<HTMLDivElement>(null)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (exporting || !pageRef.current) return
    setExporting(true)
    try {
      const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4', compress: true })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 28

      const canvas = await html2canvas(pageRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      })
      const img = canvas.toDataURL('image/jpeg', 0.85)
      const availW = pageW - margin * 2
      const availH = pageH - margin * 2
      const ratio = Math.min(availW / canvas.width, availH / canvas.height)
      const w = canvas.width * ratio
      const h = canvas.height * ratio
      pdf.addImage(img, 'JPEG', (pageW - w) / 2, margin, w, h)

      pdf.save(`llm02-audit-log-${orientation}.pdf`)
    } catch (err) {
      console.error('Audit log PDF export failed', err)
    } finally {
      setExporting(false)
    }
  }

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
        {/* Export toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cfe0ea] bg-white px-4 py-3 shadow-[0_4px_16px_rgba(25,64,93,0.07)]">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#102033]">Export audit log</div>
            <div className="text-xs text-[#53687b]">
              Saves the current LLM02 audit log view as a PDF document.
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Orientation toggle */}
            <div className="flex items-center rounded-xl border border-[#cfe0ea] bg-[#f5f9fb] p-0.5">
              {(
                [
                  { value: 'portrait', label: 'Portrait', icon: RectangleVertical },
                  { value: 'landscape', label: 'Landscape', icon: RectangleHorizontal },
                ] as const
              ).map((opt) => {
                const OptIcon = opt.icon
                const active = orientation === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOrientation(opt.value)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 !text-[14px] !font-bold transition',
                      active
                        ? 'bg-[#143A57] text-white shadow-sm'
                        : 'text-[#53687b] hover:text-[#102033]',
                    )}
                  >
                    <OptIcon size={14} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
            {/* Export button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || loading || entries.length === 0}
              className="flex items-center gap-2 rounded-xl px-4 py-2 !text-[14px] !font-bold text-[#143A57] border border-[#143A57]"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
        </div>

        <div ref={pageRef} className="bg-white p-6 -mx-6 -mt-6 rounded-2xl">
       {/* Toolbar + summary */}
<div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f1c4c4] bg-[#fff4f4] px-5 py-4">
  <div className="flex items-center gap-3">
    <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl">
      <ShieldAlert size={24} className="text-[#b42318]" />
    </span>
    <div>
      <div className="text-[0.72rem] font-bold uppercase tracking-widest text-[#8a2f2f]">
        LLM02 — Sensitive Information Disclosure
      </div>
      <div className="text-2xl font-bold tracking-tight text-[#102033]">
        {loading ? '—' : entries.length} flagged {entries.length === 1 ? 'event' : 'events'}
      </div>
      <div className="mt-0.5 text-sm text-[#53687b]">
        Source table: u_ai_action_audit_log · identity: governance_user_identity
      </div>
    </div>
  </div>
  <button
    type="button"
    onClick={() => void load()}
    disabled={loading}
    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-[#8a2f2f] transition disabled:cursor-not-allowed disabled:opacity-60"
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
        </div>
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
