import { useCallback, useEffect, useState, useRef } from 'react'
import {
  AlertTriangle,
  Fingerprint,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldX,
  Siren,
  Download,
  RectangleHorizontal,
  RectangleVertical,
} from 'lucide-react'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'

import { PortalPage } from '../../components/portal/PortalShell'
import { cn } from '../../lib/cn'
import { PriorityBadge } from '../../components/governance/SnowIncidentBadges'
import { ApprovalLogPanel } from '../../components/governance/ApprovalLogPanel'
import {
  fetchLlm02AuditLog,
  fetchConsentViolations,
  fetchFairnessIncidents,
  fetchSecurityKpis,
  type Llm02AuditEntry,
  type ConsentViolationsResponse,
  type FairnessIncidentsResponse,
  type SecurityKpis,
} from '../../services/serviceNow'

const TABS = [
  { id: 'llm02', label: 'LLM02 Audit Log' },
  { id: 'consent', label: 'Consent Violations' },
  { id: 'fairness', label: 'Fairness Incidents' },
  { id: 'security', label: 'Injection Alert Cases' },
  { id: 'approval', label: 'Agent Approval Log' },
] as const

type TabId = typeof TABS[number]['id']

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  return isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

export function GovernanceLlm02AuditPage() {
  const [activeTab, setActiveTab] = useState<TabId>('llm02')

  // LLM02 state
  const [entries, setEntries] = useState<Llm02AuditEntry[]>([])
  const [llmLoading, setLlmLoading] = useState(true)
  const [llmError, setLlmError] = useState('')

  // Consent state
  const [consentData, setConsentData] = useState<ConsentViolationsResponse | null>(null)
  const [consentState, setConsentState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [consentError, setConsentError] = useState('')

  // Fairness state
  const [fairnessData, setFairnessData] = useState<FairnessIncidentsResponse | null>(null)
  const [fairnessState, setFairnessState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [fairnessError, setFairnessError] = useState('')

  // Security state
  const [securityKpis, setSecurityKpis] = useState<SecurityKpis | null>(null)
  const [securityLoading, setSecurityLoading] = useState(true)
  const [securityError, setSecurityError] = useState<string | null>(null)

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
      pdf.save(`audit-log-${activeTab}-${orientation}.pdf`)
    } catch (err) {
      console.error('Audit log PDF export failed', err)
    } finally {
      setExporting(false)
    }
  }

  const loadLlm02 = useCallback(async () => {
    setLlmLoading(true)
    setLlmError('')
    try {
      setEntries(await fetchLlm02AuditLog())
    } catch (err) {
      setLlmError(err instanceof Error ? err.message : 'Failed to load the audit log.')
    } finally {
      setLlmLoading(false)
    }
  }, [])

  const loadConsent = useCallback(() => {
    setConsentState('loading')
    setConsentError('')
    fetchConsentViolations()
      .then((d) => { setConsentData(d); setConsentState('ok') })
      .catch((e: Error) => { setConsentError(e.message); setConsentState('error') })
  }, [])

  const loadFairness = useCallback(() => {
    setFairnessState('loading')
    setFairnessError('')
    fetchFairnessIncidents()
      .then((d) => { setFairnessData(d); setFairnessState('ok') })
      .catch((e: Error) => { setFairnessError(e.message); setFairnessState('error') })
  }, [])

  const loadSecurity = useCallback(() => {
    setSecurityLoading(true)
    setSecurityError(null)
    fetchSecurityKpis()
      .then((d) => { setSecurityKpis(d); setSecurityLoading(false) })
      .catch((e: Error) => { setSecurityError(e.message); setSecurityLoading(false) })
  }, [])

  useEffect(() => { void loadLlm02() }, [loadLlm02])
  useEffect(() => { loadConsent() }, [loadConsent])
  useEffect(() => { loadFairness() }, [loadFairness])
  useEffect(() => { loadSecurity() }, [loadSecurity])

  return (
    <PortalPage
      label="AI Governance Officer"
      title="Audit Log"
      intro="Consolidated audit log across all AI governance use cases — LLM02 flagged events, consent violations, fairness incidents, and injection alert cases."
    >
      <section className="min-w-0 px-6 pb-10">
        {/* Export toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cfe0ea] bg-white px-4 py-3 shadow-[0_4px_16px_rgba(25,64,93,0.07)]">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#102033]">Export audit log</div>
            <div className="text-xs text-[#53687b]">
              Saves the current tab view as a PDF document.
            </div>
          </div>
          <div className="flex items-center gap-3">
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
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl px-4 py-2 !text-[14px] !font-bold text-[#143A57] border border-[#143A57]"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-[#cfe0ea] bg-[#f5f9fb] p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 rounded-xl px-4 py-2 text-sm font-bold transition',
                activeTab === tab.id
                  ? 'bg-[#143A57] text-white shadow-sm'
                  : 'text-[#53687b] hover:text-[#102033]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div ref={pageRef} className="bg-white p-6 -mx-6 -mt-6 rounded-2xl">

          {/* ── Tab: LLM02 Audit Log ── */}
          {activeTab === 'llm02' && (
            <>
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
                      {llmLoading ? '—' : entries.length} flagged {entries.length === 1 ? 'event' : 'events'}
                    </div>
                    <div className="mt-0.5 text-sm text-[#53687b]">
                      Source table: u_ai_action_audit_log · identity: governance_user_identity
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void loadLlm02()}
                  disabled={llmLoading}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-[#8a2f2f] transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {llmLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Refresh
                </button>
              </div>

              {llmError && (
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#f2c9c9] bg-[#fff4f4] p-4 text-sm font-semibold text-[#8a2f2f]">
                  <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                  <span>{llmError}</span>
                </div>
              )}

              {llmLoading ? (
                <div className="grid place-items-center rounded-2xl border border-[#e3edf3] bg-white py-16 text-sm font-bold text-[#53687b]">
                  <Loader2 size={20} className="mb-2 animate-spin text-[#b42318]" />
                  Loading audit log…
                </div>
              ) : entries.length === 0 && !llmError ? (
                <div className="grid place-items-center rounded-2xl border border-dashed border-[#cfdbe4] bg-white py-16 text-center">
                  <ShieldX size={26} className="mb-2 text-[#8aa0b3]" />
                  <div className="text-sm font-black text-[#102033]">No LLM02 events flagged yet</div>
                  <div className="mt-1 max-w-[420px] text-xs font-semibold text-[#53687b]">
                    When a request for patient PII is blocked on the AI Agents page, it will be recorded here.
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[#e3edf3] bg-white shadow-[0_4px_16px_rgba(25,64,93,0.07)]">
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
            </>
          )}

          {/* ── Tab: Consent Violations ── */}
          {activeTab === 'consent' && (
            <div className="rounded-xl border border-[#d7e5ec] bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[#fdecec] text-[#c0392b]">
                    <Siren size={18} />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-[#102033]">Consent Violation Incidents</h3>
                    <p className="mt-0.5 text-sm text-[#53687b]">
                      Live Security Incidents ·{' '}
                      <code className="text-xs">category=consent_purpose_violation</code>
                      {consentState === 'ok' && consentData ? ` · ${consentData.count_30_days} in last 30 days` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadConsent}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0ea] bg-white px-3 py-1.5 text-xs font-bold text-[#0f5f8c] transition-colors hover:border-[#0f5f8c] hover:bg-[#f5f9fb]"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>

              {consentState === 'loading' && (
                <div className="flex items-center gap-2 py-8 text-sm text-[#53687b]">
                  <Loader2 size={16} className="animate-spin" /> Loading incidents from ServiceNow...
                </div>
              )}
              {consentState === 'error' && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Could not load consent violations. {consentError}
                </div>
              )}
              {consentState === 'ok' && consentData && consentData.recent.length === 0 && (
                <div className="rounded-lg border border-[#d7e5ec] bg-[#f8fbfc] px-4 py-6 text-center text-sm text-[#53687b]">
                  No consent-violation incidents yet.
                </div>
              )}
              {consentState === 'ok' && consentData && consentData.recent.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#e5eef3] text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#6b7c8f]">
                        <th className="px-3 py-2">Number</th>
                        <th className="px-3 py-2">Opened</th>
                        <th className="px-3 py-2">Short description</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consentData.recent.map((row, i) => (
                        <tr key={i} className="border-b border-[#eef3f7] last:border-0">
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-bold text-[#143A57]">{row.number || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[#53687b]">{row.opened_at || '—'}</td>
                          <td className="px-3 py-2.5 font-semibold text-[#102033]">{row.short_description || '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">In Progress</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Fairness Incidents ── */}
          {activeTab === 'fairness' && (
            <div className="rounded-xl border border-[#d7e5ec] bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[#fdecec] text-[#c0392b]">
                    <Siren size={18} />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-[#102033]">Fairness Remediation Incidents</h3>
                    <p className="mt-0.5 text-sm text-[#53687b]">
                      Live Security Incidents ·{' '}
                      <code className="text-xs">short_description STARTSWITH [CareAtlas] Fairness alert</code>
                      {fairnessState === 'ok' && fairnessData ? ` · ${fairnessData.count_30_days} in last 30 days` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadFairness}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0ea] bg-white px-3 py-1.5 text-xs font-bold text-[#0f5f8c] transition-colors hover:border-[#0f5f8c] hover:bg-[#f5f9fb]"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>

              {fairnessState === 'loading' && (
                <div className="flex items-center gap-2 py-8 text-sm text-[#53687b]">
                  <Loader2 size={16} className="animate-spin" /> Loading incidents from ServiceNow...
                </div>
              )}
              {fairnessState === 'error' && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Could not load fairness incidents. {fairnessError}
                </div>
              )}
              {fairnessState === 'ok' && fairnessData && fairnessData.recent.length === 0 && (
                <div className="rounded-lg border border-[#d7e5ec] bg-[#f8fbfc] px-4 py-6 text-center text-sm text-[#53687b]">
                  No fairness remediation incidents yet.
                </div>
              )}
              {fairnessState === 'ok' && fairnessData && fairnessData.recent.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#e5eef3] text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#6b7c8f]">
                        <th className="px-3 py-2">Number</th>
                        <th className="px-3 py-2">Opened</th>
                        <th className="px-3 py-2">Short description</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fairnessData.recent.map((row, i) => (
                        <tr key={i} className="border-b border-[#eef3f7] last:border-0">
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-bold text-[#143A57]">{row.number || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[#53687b]">{row.opened_at || '—'}</td>
                          <td className="px-3 py-2.5 font-semibold text-[#102033]">{row.short_description || '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">In Progress</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Injection Alert Cases ── */}
          {activeTab === 'security' && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fdecec] text-[#a22828]">
                    <Siren size={16} />
                  </span>
                  <div>
                    <h3 className="m-0 text-sm font-bold text-[#102033]">Injection Alert Cases</h3>
                    <p className="m-0 text-[11px] text-[#53687b]">
                      Live from <span className="font-mono">sn_ai_case_mgmt_ai_case</span> · case_type = adversarial_attacks
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {securityKpis && (
                    <span className="rounded-full border border-[#d7e5ec] bg-[#f4f8fb] px-2.5 py-0.5 text-[11px] font-bold text-[#143A57]">
                      {securityKpis.ai_cases_open} open
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={loadSecurity}
                    className="text-[11px] font-bold text-[#0397AE] hover:underline"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#d7e5ec] bg-white overflow-hidden">
                {securityLoading && (
                  <div className="py-8 text-center text-sm text-[#53687b]">Loading cases…</div>
                )}
                {securityError && !securityLoading && (
                  <div className="py-6 text-center text-sm text-[#a22828]">
                    Failed to load cases: {securityError}
                  </div>
                )}
                {!securityLoading && !securityError && securityKpis && securityKpis.recent_cases.length === 0 && (
                  <div className="py-8 text-center text-sm text-[#53687b]">
                    No adversarial AI Cases yet.
                  </div>
                )}
                {!securityLoading && !securityError && securityKpis && securityKpis.recent_cases.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e5eef3] bg-[#f4f8fb] text-left">
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#53687b]">Case #</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#53687b]">Description</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#53687b]">Priority</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#53687b]">Opened</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityKpis.recent_cases.map((c, i) => (
                        <tr
                          key={c.number}
                          className={`border-b border-[#f0f6fa] ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafcfd]'}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <ShieldAlert size={13} className="shrink-0 text-[#a22828]" />
                              <span className="font-mono text-xs font-bold text-[#143A57]">{c.number}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#40566b] max-w-[380px]">
                            {c.short_description}
                          </td>
                          <td className="px-4 py-3">
                            <PriorityBadge priority={c.priority} />
                          </td>
                          <td className="px-4 py-3 text-xs text-[#6b7c8f]">
                            {formatDate(c.created_on)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!securityLoading && securityKpis && (
                  <div className="border-t border-[#e5eef3] bg-[#f4f8fb] px-4 py-2.5 text-[10px] text-[#6b7c8f]">
                    Showing last {securityKpis.recent_cases.length} cases ·{' '}
                    <span className="font-mono">sn_ai_governance_automation_rule</span> active ·{' '}
                    {securityKpis.active_injection_filters} injection filter{securityKpis.active_injection_filters !== 1 ? 's' : ''} ·{' '}
                    {securityKpis.injection_output_patterns} output patterns
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Agent Approval Log ── */}
          {activeTab === 'approval' && <ApprovalLogPanel />}

        </div>
      </section>
    </PortalPage>
  )
}

function AuditRow({ entry }: { entry: Llm02AuditEntry }) {
  return (
    <div className="grid grid-cols-[170px_minmax(160px,1fr)_140px_120px_minmax(220px,1.4fr)] items-start gap-3 px-5 py-4 text-sm max-[900px]:grid-cols-1 max-[900px]:gap-1.5">
      <div className="font-bold text-[#102033]">
        <span className="hidden max-[900px]:inline text-[0.62rem] font-black uppercase tracking-widest text-[#8aa0b3]">Timestamp · </span>
        {entry.timestamp || '—'}
        {entry.log_id && (
          <div className="mt-0.5 text-[0.66rem] font-semibold text-[#8aa0b3] [overflow-wrap:anywhere]">
            {entry.log_id}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0ea] bg-[#eef6fb] px-2 py-1 text-[0.72rem] font-bold text-[#0f5f8c] [overflow-wrap:anywhere]">
          <Fingerprint size={12} />
          {entry.agent_identity || '—'}
        </span>
      </div>
      <div className="text-[0.78rem] font-semibold text-[#53687b]">
        {entry.action_type || 'Sensitive info request'}
      </div>
      <div>
        <FinalActionBadge value={entry.final_action} />
      </div>
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
