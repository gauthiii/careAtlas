import {
  Activity,
  Bot,
  ClipboardList,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Siren,
  AlertTriangle,
  ArrowRight,
  Plus,
  ChartBar,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  PortalPage,
  PortalPanel,
} from '../../components/portal/PortalShell'
import { governanceDisplayName, useGovernanceAuth } from '../../contexts/GovernanceAuthContext'
import { useUnmanagedAISystems } from '../../hooks/useUnmanagedAISystems'
import { fetchAiDecisionLog, fetchFairnessData, fetchSecurityKpis, fetchHallucinationStats, type AiDecisionLogEntry, type FairnessData, type FairnessGroupItem, type SecurityKpis, type HallucinationStats } from '../../services/serviceNow'
import { PrivacyControlsPanel } from '../../components/governance/PrivacyControlsPanel'
import { ConsentEnforcementPanel } from '../../components/governance/ConsentEnforcementPanel'
import { RegulatoryClassificationBadge } from '../../components/governance/RegulatoryClassificationBadge'
import { DemoTag } from '../../components/governance/DemoTag'

function decisionCategory(entry: AiDecisionLogEntry): string {
  try {
    const parsed = JSON.parse(entry.reason_parsed) as { rawCategory?: string; specialtyRequired?: string }
    return parsed.rawCategory || parsed.specialtyRequired || 'scheduling'
  } catch {
    return 'scheduling'
  }
}

function arrayCount(value: string): number {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

export function GovernanceDashboardPage() {
  const { user } = useGovernanceAuth()
  const displayName = governanceDisplayName(user)
  const { systems, state: agentsState, refetch: refetchAgents } = useUnmanagedAISystems()
  const [decisionLog, setDecisionLog] = useState<AiDecisionLogEntry[]>([])
  const [isLogLoading, setIsLogLoading] = useState(true)
  const [logError, setLogError] = useState<string | null>(null)
  const [logRefreshKey, setLogRefreshKey] = useState(0)
  const [fairness, setFairness] = useState<FairnessData | null>(null)
  const [securityKpis, setSecurityKpis] = useState<SecurityKpis | null>(null)
  const [hallucinationStats, setHallucinationStats] = useState<HallucinationStats | null>(null)

  useEffect(() => {
    let active = true
    setIsLogLoading(true)
    setLogError(null)
    fetchAiDecisionLog(15)
      .then((entries) => {
        if (active) setDecisionLog(entries)
      })
      .catch((error: Error) => {
        if (active) setLogError(error.message)
      })
      .finally(() => {
        if (active) setIsLogLoading(false)
      })
    return () => {
      active = false
    }
  }, [logRefreshKey])

  useEffect(() => {
    fetchFairnessData()
      .then(setFairness)
      .catch(() => {/* silently keep null — fallback rendering handles it */})
    fetchSecurityKpis()
      .then(setSecurityKpis)
      .catch(() => {/* silently keep null */})
    fetchHallucinationStats()
      .then(setHallucinationStats)
      .catch(() => {/* silently keep null */})
  }, [logRefreshKey])

  function handleRefresh() {
    refetchAgents()
    setLogRefreshKey((k) => k + 1)
  }

  const registeredAgents = agentsState === 'ok' ? systems.length : null

  // Fallback used when the live endpoint hasn't loaded yet.
  const FALLBACK_ETHNICITY: FairnessGroupItem[] = [
    { group: 'Asian', pct: 32, expected: 23, count: 0, skewed: true },
    { group: 'Black', pct: 20, expected: 21, count: 0, skewed: false },
    { group: 'Mixed', pct: 24, expected: 23, count: 0, skewed: false },
    { group: 'White', pct: 27, expected: 28, count: 0, skewed: false },
    { group: 'Other', pct: 11, expected: 5, count: 0, skewed: true },
  ]
  const fairnessItems: FairnessGroupItem[] =
    fairness ? fairness.by_ethnicity : FALLBACK_ETHNICITY
  const skewAlert = fairness ? fairness.skew_alert : true
  const skewedGroup = fairnessItems.find((g) => g.skewed)

  return (
    <PortalPage
      label="AI Governance Officer"
      title="Control Tower evidence board"
      intro={`Signed in as ${displayName}. Consolidated governance view for agent inventory, shadow AI detection, fairness monitoring, prompt injection, access violations and Action Fabric audit evidence.`}
    >
      <div className="-mt-3 flex justify-end gap-2 px-6">
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#0397AE] px-[15px] font-bold text-[#0397AE] max-[720px]:w-full"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* KPI STRIP */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 p-6">
        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Registered agents
          </div>

          <div className="mt-2 text-2xl font-bold">
            {registeredAgents ?? '—'}
          </div>

          <div className="text-sm font-semibold text-emerald-600">
            Live from sn_aia_agent
          </div>
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Shadow AI detections
          </div>

          <div className="mt-2 text-2xl font-bold">
            1
          </div>

          <div className="text-sm font-semibold text-red-600">
            First seen today 09:08
          </div>
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Prompt injection alerts
          </div>

          <div className="mt-2 text-2xl font-bold">
            {securityKpis != null ? securityKpis.ai_cases_open : '—'}
          </div>

          <div className="text-sm font-semibold text-amber-600">
            {securityKpis != null
              ? `${securityKpis.active_injection_filters} filters · ${securityKpis.injection_output_patterns} patterns`
              : 'Loading…'}
          </div>
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Access violations
          </div>

          <div className="mt-2 text-2xl font-bold">
            2
          </div>

          <div className="text-sm font-semibold text-orange-600">
            PHI scope • Least privilege
          </div>
        </div>

        <div className={`rounded-xl border bg-white p-5 ${skewAlert ? 'border-red-300' : 'border-[#d7e5ec]'}`}>
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Fairness skew
          </div>

          <div className={`mt-2 text-xl font-bold ${skewAlert ? 'text-red-700' : 'text-emerald-700'}`}>
            {fairness ? `${fairness.max_skew_pp}pp` : skewAlert ? 'High' : 'Within range'}
          </div>

          <div className={`text-sm font-semibold ${skewAlert ? 'text-red-600' : 'text-emerald-600'}`}>
            {skewAlert && skewedGroup
              ? `${skewedGroup.group} cohort over-allocated`
              : 'No significant skew detected'}
          </div>
        </div>
      </section>

      {/* MAIN GRID */}
      <div className="grid grid-cols-[1fr_1fr] gap-8 max-[1200px]:grid-cols-1 p-6">
        {/* LEFT COLUMN */}
        <div className="space-y-8">
          {/* AGENT INVENTORY */}
          <PortalPanel
            title="Agent Inventory"
            icon={<Bot size={18} />}
          >
            <table className="w-full border-separate border-spacing-y-3 text-sm">
              <thead>
                <tr className="text-left">
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Identity</th>
                  <th>Risk</th>
                  <th>NIST AI RMF</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Scheduling Ranker</td>
                  <td>
                    <Badge success>Active</Badge>
                  </td>
                  <td>nih-schedule-01</td>
                  <td>
                    <Badge success>Low</Badge>
                  </td>
                  <td>
                    <RegulatoryClassificationBadge agentName="Scheduling Ranker" compact />
                  </td>
                </tr>

                <tr>
                  <td>Identity Verifier</td>
                  <td>
                    <Badge success>Active</Badge>
                  </td>
                  <td>nih-verify-02</td>
                  <td>
                    <Badge warning>Medium</Badge>
                  </td>
                  <td>
                    <RegulatoryClassificationBadge agentName="Identity Verifier" compact />
                  </td>
                </tr>

                <tr>
                  <td>Appointment Summarizer</td>
                  <td>
                    <Badge warning>Paused</Badge>
                  </td>
                  <td>nih-summary-03</td>
                  <td>
                    <Badge warning>Medium</Badge>
                  </td>
                  <td>
                    <RegulatoryClassificationBadge agentName="Appointment Summarizer" compact />
                  </td>
                </tr>

                <tr>
                  <td>Legacy Slot Optimizer</td>
                  <td>
                    <Badge danger>Quarantined</Badge>
                  </td>
                  <td>Unknown</td>
                  <td>
                    <Badge danger>High</Badge>
                  </td>
                  <td>
                    <RegulatoryClassificationBadge agentName="Legacy Slot Optimizer" compact />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-5 flex gap-3">
              <button className="bg-[#143A57] text-white px-4 py-2 rounded-md inline-flex items-center gap-2">
                View all agents <ArrowRight size={16} />
              </button>

              <button className="bg-[#143A57] text-white px-4 py-2 rounded-md inline-flex items-center gap-2">
               <Plus size={16} /> Register new agent
              </button>
            </div>
          </PortalPanel>

          {/* FAIRNESS MONITOR */}
          <PortalPanel
            title="Scheduling Fairness Monitor"
            icon={<Activity size={18} />}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              {fairness && (
                <span className="text-xs text-[#53687b]">
                  {fairness.total_appointments} appointments · by ethnicity
                </span>
              )}
              <DemoTag />
            </div>
            <div className="space-y-3">
              {fairnessItems.map((item) => (
                <div key={item.group}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className={item.skewed ? 'font-semibold text-red-700' : ''}>{item.group}</span>
                    <span className={item.skewed ? 'font-semibold text-red-700' : ''}>
                      {item.pct}%
                      <span className="ml-1 text-xs text-[#53687b]">(exp {item.expected}%)</span>
                    </span>
                  </div>
                  <div className="h-4 rounded-full bg-[#eef3f7]">
                    <div
                      className={`h-4 rounded-full ${item.skewed ? 'bg-[#e07a5f]' : 'bg-[#0397AE]'}`}
                      style={{ width: `${Math.min(item.pct * 3, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {skewAlert && skewedGroup && (
              <div className="mt-5 rounded-lg bg-[#fff7e6] p-3 text-sm text-[#946200]">
                Statistically significant skew detected in {skewedGroup.group} cohort.
                {fairness && ` Max deviation: ${fairness.max_skew_pp}pp above expected allocation.`}
              </div>
            )}
            {!skewAlert && fairness && (
              <div className="mt-5 rounded-lg bg-[#e7f6f0] p-3 text-sm text-[#12805c]">
                All demographic groups within ±5pp of expected allocation.
              </div>
            )}
          </PortalPanel>

          {/* PROMPT ALERTS */}
          <PortalPanel
            title="Prompt Injection Alerts"
            icon={<ShieldAlert size={18} />}
          >
            {securityKpis == null ? (
              <div className="py-4 text-center text-sm text-[#53687b]">Loading…</div>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-[#d7e5ec] bg-[#f4f8fb] p-3 text-center">
                    <div className="text-xl font-bold text-[#a22828]">{securityKpis.ai_cases_open}</div>
                    <div className="text-[10px] font-semibold uppercase text-[#53687b]">AI Cases open</div>
                  </div>
                  <div className="rounded-lg border border-[#d7e5ec] bg-[#f4f8fb] p-3 text-center">
                    <div className="text-xl font-bold text-[#0f6b4f]">{securityKpis.active_injection_filters}</div>
                    <div className="text-[10px] font-semibold uppercase text-[#53687b]">Active filters</div>
                  </div>
                  <div className="rounded-lg border border-[#d7e5ec] bg-[#f4f8fb] p-3 text-center">
                    <div className="text-xl font-bold text-[#143A57]">{securityKpis.injection_output_patterns}</div>
                    <div className="text-[10px] font-semibold uppercase text-[#53687b]">Output patterns</div>
                  </div>
                </div>

                {securityKpis.recent_cases.length > 0 && (
                  <table className="w-full border-separate border-spacing-y-2 text-sm text-left">
                    <thead>
                      <tr>
                        <th className="text-xs font-semibold text-[#53687b]">Case #</th>
                        <th className="text-xs font-semibold text-[#53687b]">Description</th>
                        <th className="text-xs font-semibold text-[#53687b]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityKpis.recent_cases.map((c) => (
                        <tr key={c.number}>
                          <td className="font-mono text-xs text-[#143A57]">{c.number}</td>
                          <td className="max-w-[200px] truncate text-xs text-[#40566b]">{c.short_description}</td>
                          <td>
                            {c.priority === '1' ? (
                              <Badge danger>Blocked</Badge>
                            ) : (
                              <Badge warning>Flagged</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="mt-3 text-[10px] text-[#6b7c8f]">
                  Live from <span className="font-mono">sn_ai_case_mgmt_ai_case</span> · case_type=adversarial_attacks ·{' '}
                  <span className="font-mono">sn_ai_governance_automation_rule</span> active
                </div>
              </>
            )}
          </PortalPanel>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
          {/* DATA PRIVACY & PII PROTECTION (UC1) */}
          <PrivacyControlsPanel />
           {/* CONSENT ENFORCEMENT — UC10 (shared component, also on /governance/demo/consent) */}
          <ConsentEnforcementPanel />

          {/* AI OUTPUT INTEGRITY — UC13 (hallucination detection stats) */}
          <PortalPanel title="AI Output Integrity (UC13)" icon={<ShieldCheck size={18} />}>
            {hallucinationStats == null ? (
              <div className="py-4 text-center text-sm text-[#53687b]">Loading…</div>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-4 gap-3">
                  <div className="rounded-lg border border-[#d7e5ec] bg-[#f4f8fb] p-3 text-center">
                    <div className="text-xl font-bold text-[#143A57]">{hallucinationStats.total}</div>
                    <div className="text-[10px] font-semibold uppercase text-[#53687b]">Scanned</div>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                    <div className="text-xl font-bold text-[#a22828]">{hallucinationStats.blocked}</div>
                    <div className="text-[10px] font-semibold uppercase text-[#53687b]">Blocked</div>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                    <div className="text-xl font-bold text-amber-700">{hallucinationStats.held}</div>
                    <div className="text-[10px] font-semibold uppercase text-[#53687b]">Held</div>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                    <div className="text-xl font-bold text-[#0f6b4f]">{hallucinationStats.pass_rate}%</div>
                    <div className="text-[10px] font-semibold uppercase text-[#53687b]">Pass rate</div>
                  </div>
                </div>
                <div className="text-[10px] text-[#6b7c8f]">
                  Last 30 days · live from <span className="font-mono">u_hallucination_log</span> · OWASP LLM09:2025
                </div>
              </>
            )}
          </PortalPanel>

          {/* SHADOW AI */}
          <PortalPanel
            title="Shadow AI Detection"
            icon={<Siren size={18} />}
          >
            <div className="rounded-xl border border-red-300 bg-red-50 p-4">
              <div className="flex items-center gap-2 font-bold text-red-700">
                <AlertTriangle size={16} />
                Unapproved endpoint detected
              </div>

              <div className="mt-2 text-sm text-red-700">
                https://legacy-slot-ai.local/api
              </div>

              <div className="mt-2 text-sm">
                First seen 09:08 AM • Not present in approved
                inventory • Caller: Appointment Summarizer
              </div>
            </div>

            <table className="w-full border-separate border-spacing-y-3 text-sm mt-4 text-left">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Jun 1</td>
                  <td>test-image.local/v2</td>
                  <td>
                    <Badge success>Resolved</Badge>
                  </td>
                </tr>

                <tr>
                  <td>May 28</td>
                  <td>openai-proxy.internal</td>
                  <td>
                    <Badge success>Resolved</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </PortalPanel>

          {/* EXPECTED VS ACTUAL */}
          <PortalPanel icon={<ChartBar size={18} />} title="Expected vs Actual Allocation (%)">
            <div className="space-y-4">
              {fairnessItems.map((item) => {
                const delta = item.pct - item.expected
                return (
                  <div
                    key={item.group}
                    className="grid grid-cols-[90px_1fr_80px] items-center gap-3"
                  >
                    <span className={item.skewed ? 'font-semibold text-red-700' : ''}>{item.group}</span>
                    <div className="relative h-3 rounded-full bg-[#edf2f5]">
                      {/* expected marker */}
                      <div
                        className="absolute top-0 h-3 w-0.5 bg-[#143A57] opacity-40"
                        style={{ left: `${Math.min(item.expected * 3, 100)}%` }}
                      />
                      {/* actual bar */}
                      <div
                        className={`h-3 rounded-full ${item.skewed ? 'bg-[#e07a5f]' : 'bg-[#0397AE]'}`}
                        style={{ width: `${Math.min(item.pct * 3, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs ${item.skewed ? 'font-bold text-red-700' : 'text-[#53687b]'}`}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}pp
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-[#53687b]">
              Vertical marker = expected %. Bar = actual %. Delta shown right.
              {fairness && ` Live from ${fairness.total_appointments} appointments.`}
            </p>
          </PortalPanel>

          {/* ACCESS VIOLATIONS */}
          <PortalPanel
            title="Agent Access Violations"
            icon={<Lock size={18} />}
          >
            <div className="mb-3 flex justify-end">
              <DemoTag />
            </div>
            <table className="w-full border-separate border-spacing-y-3 text-sm text-left">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Agent → Resource</th>
                  <th>Policy</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>09:21</td>
                  <td>Scheduling Ranker → clinical_notes</td>
                  <td>
                    <Badge danger>PHI scope guard</Badge>
                  </td>
                </tr>

                <tr>
                  <td>08:35</td>
                  <td>Appt Summarizer → billing_records</td>
                  <td>
                    <Badge warning>Least privilege</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </PortalPanel>

          {/* AGENT RISK SCORECARD */}
          <PortalPanel title="Agent Risk Scorecard">
            <div className="space-y-4 text-sm">
              <RiskRow
                level="H"
                title="Legacy Slot Optimizer"
                desc="Unknown identity • shadow endpoint calls"
              />

              <RiskRow
                level="M"
                title="Appointment Summarizer"
                desc="Billing access violation"
              />

              <RiskRow
                level="L"
                title="Scheduling Ranker"
                desc="PHI scope violation blocked"
              />
            </div>
          </PortalPanel>
        </div>
      </div>

      {/* AUDIT LOG */}
      <section className="px-6">
        <PortalPanel
          title="Action Fabric Audit Log"
          icon={<ClipboardList size={18} />}
        >
          {isLogLoading ? (
            <div className="flex items-center gap-2 text-[#607487]">
              <LoaderCircle size={18} className="animate-spin" /> Loading decision log from ServiceNow
            </div>
          ) : logError ? (
            <div className="rounded-[10px] border border-[#f6c6c4] bg-[#fff4f3] p-3 text-sm font-bold text-[#a22828]">
              {logError}
            </div>
          ) : decisionLog.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#d7e5ec] p-4 text-center text-sm text-[#607487]">
              No AI decision log entries returned from u_ai_decision_log.
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-y-3 text-sm text-left">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Subject</th>
                  <th>Model</th>
                  <th>Decision Trail</th>
                  <th>Outcome</th>
                </tr>
              </thead>

              <tbody>
                {decisionLog.map((entry) => {
                  const confidence = Number(entry.confidence_score)
                  const approved = !Number.isNaN(confidence) && confidence >= 0.5
                  return (
                    <tr key={entry.sys_id || entry.log_id}>
                      <td>{entry.timestamp}</td>
                      <td>Scheduling decision · {decisionCategory(entry)}</td>
                      <td>{entry.patient_anon || '—'}</td>
                      <td>{entry.model_version || '—'}</td>
                      <td>
                        {arrayCount(entry.slots_considered)} slots ranked → {arrayCount(entry.slots_returned)} returned
                        {Number.isNaN(confidence) ? '' : ` · conf ${(confidence * 100).toFixed(0)}%`}
                      </td>
                      <td>
                        {approved ? <Badge success>Approved</Badge> : <Badge warning>Low confidence</Badge>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </PortalPanel>
      </section>
    </PortalPage>
  )
}

function Metric({
  title,
  value,
  note,
  color,
}: any) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[#6b7c8f]">
        {title}
      </div>

      <div className={`mt-1 text-3xl font-bold ${color}`}>
        {value}
      </div>

      <div className="mt-1 text-sm text-[#6b7c8f]">
        {note}
      </div>
    </div>
  )
}

function Badge({
  children,
  success,
  warning,
  danger,
}: any) {
  const styles = success
    ? 'bg-green-100 text-green-700'
    : warning
      ? 'bg-amber-100 text-amber-700'
      : danger
        ? 'bg-red-100 text-red-700'
        : 'bg-slate-100 text-slate-700'

  return (
    <span className={`rounded-full px-2 py-1 text-xs ${styles}`}>
      {children}
    </span>
  )
}

function RiskRow({ level, title, desc }: any) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef3f7] font-bold">
        {level}
      </div>

      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-[#6b7c8f]">{desc}</div>
      </div>
    </div>
  )
}
