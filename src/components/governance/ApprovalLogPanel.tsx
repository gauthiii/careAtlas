import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw, ScrollText, XCircle } from 'lucide-react'
import { fetchApprovalLog, type ApprovalLogEntry } from '../../services/serviceNow'

/**
 * UC2 · Risk — persisted human-approval-gate decisions.
 *
 * Reads the live audit trail from ServiceNow (u_ai_action_audit_log, identity
 * "human_approval_gate"): every high-impact agent intent that stopped for a human,
 * with the approve/deny decision and the approver. Proves the gate isn't just a
 * UI state — the decision is recorded.
 */
export function ApprovalLogPanel() {
  const [rows, setRows] = useState<ApprovalLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchApprovalLog(25))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mb-5 rounded-xl border border-[#d7e5ec] bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#eef3f7] text-[#40566b]">
            <ScrollText size={18} />
          </span>
          <div>
            <div className="text-sm font-bold text-[#102033]">Agent action &amp; approval log</div>
            <p className="m-0 text-[11px] font-semibold text-[#53687b]">
              UC2 · Risk · OWASP LLM06 — high-impact intents stopped for a human, recorded in
              u_ai_action_audit_log.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f7ef] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0f6b4f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" /> Live · ServiceNow
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="grid h-7 w-7 place-items-center rounded-md border border-[#cbdde6] bg-white text-[#53687b] hover:bg-slate-50"
            aria-label="Refresh approval log"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-[#53687b]">
          <Loader2 size={16} className="animate-spin" /> Loading approval decisions…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[#f3a19c] bg-[#fff4f3] px-3 py-2 text-xs font-semibold text-[#a22828]">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-4 text-center text-sm font-bold text-[#53687b]">
          No approval decisions recorded yet. Trigger one from the Risk demo page.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#e0e8ee]">
          {rows.map((r, i) => {
            const approved = r.decision === 'approved'
            const denied = r.decision === 'denied'
            return (
              <div
                key={r.sys_id || i}
                className={`flex items-start gap-3 px-3 py-2.5 ${i % 2 === 0 ? 'bg-[#f8fbfc]' : 'bg-white'}`}
              >
                <span
                  className={`mt-0.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    approved
                      ? 'bg-[#e7f7ef] text-[#0f6b4f]'
                      : denied
                        ? 'bg-[#feeceb] text-[#a22828]'
                        : 'bg-[#eef3f7] text-[#53687b]'
                  }`}
                >
                  {approved ? <CheckCircle2 size={11} /> : denied ? <XCircle size={11} /> : null}
                  {r.decision}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[12.5px] font-semibold leading-snug text-[#37495a]">{r.detail}</p>
                  <p className="m-0 mt-0.5 font-mono text-[10.5px] text-[#8aa0b2]">{r.timestamp}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
