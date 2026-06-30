import { useState, useEffect } from 'react'
import { PortalPage } from '../../../components/portal/PortalShell'
import { UseCaseWorkflowsModal } from '../../../components/governance/UseCaseWorkflowsModal'
import { FairnessDebiasDemo } from '../../../components/governance/FairnessDebiasDemo'
import { BeforeAfterDemo, SimChat } from '../../../components/governance/BeforeAfterDemo'
import { ArrowRight, Activity, ArrowLeft, TrendingUp, Siren, Loader2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchFairnessIncidents, type FairnessIncidentsResponse } from '../../../services/serviceNow'

export function GovernanceFairnessPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [incidents, setIncidents] = useState<FairnessIncidentsResponse | null>(null)
  const [incState, setIncState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [incError, setIncError] = useState('')

  const loadIncidents = () => {
    setIncState('loading')
    setIncError('')
    fetchFairnessIncidents()
      .then((d) => {
        setIncidents(d)
        setIncState('ok')
      })
      .catch((e: Error) => {
        setIncError(e.message)
        setIncState('error')
      })
  }

  useEffect(() => {
    loadIncidents()
  }, [])

  return (
    <PortalPage
      label="AI Governance Officer"
      title={
        <div className="flex items-center gap-3">
          <Link
            to="/governance/demo"
            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-[#d7e5ec] bg-white text-[#53687b] transition-colors hover:bg-[#f4f8fb] hover:text-[#143A57]"
            aria-label="Back to Demo Hub"
          >
            <ArrowLeft size={20} />
          </Link>
          Fairness — Non-Discriminatory Scheduling
        </div>
      }
      intro="NIST AI RMF (Harmful Bias & Fairness): Continuously measure fairness across gender, age and ethnicity. Run the interactive debiasing demo below, or view the end-to-end animated workflow."
    >
      <section className="px-6 pb-6">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="group mb-6 flex w-full items-center gap-4 rounded-xl border border-[#cfe0ea] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#143A57]"
        >
          <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-[#0397AE] text-white">
            <Activity size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-[#102033]">View Fairness Workflow</div>
            <p className="mt-0.5 text-sm leading-snug text-[#53687b]">
              Animated end-to-end flow: Intake → Assess → Enforce → Monitor.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#143A57] px-4 py-2 text-sm font-bold text-white transition group-hover:bg-[#1d4d73]">
            Open workflow modal <ArrowRight size={16} />
          </span>
        </button>

        <div className="mt-8">
          <BeforeAfterDemo
            riskLevel="High risk"
            processCaption="Every booking is one outcome data point. At step 3 the scheduling agent can systematically skew allocation across groups."
            process={[
              { label: 'Appointments booked', sub: 'patient outcomes' },
              { label: 'Outcomes aggregated', sub: 'by group' },
              { label: 'AI allocation skews', sub: 'demographic bias', tone: 'risk' },
              { label: 'Monitor + remediate', sub: 'human workflow', tone: 'control' },
              { label: 'Equitable outcomes', sub: 'tracked' },
            ]}
            risksHeading="AI risks at step 3"
            risks={[
              { title: 'Bias across groups', body: 'Worse slots for patients by ethnicity, gender, or age — discrimination at scale.', ref: 'NIST Harmful Bias' },
              { title: 'Invisible individually', body: 'No single patient sees a score; the skew only shows in the aggregate.' },
              { title: 'Continuous drift', body: 'A one-time fairness check misses skew that emerges over time.' },
            ]}
            control="21 fairness metrics + bias risk statements monitor outcomes continuously and flag skew the moment it appears. AIRC does not auto-correct — remediation is a controlled human workflow (raise an incident/case)."
            before={
              <SimChat
                agent="Scheduling analytics assistant"
                placeholder="Ask for the fairness breakdown…"
                samples={[
                  {
                    prompt: 'Show scheduling fairness by ethnicity for the last 90 appointments.',
                    result: (
                      <div className="space-y-3">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-[#6b7c8f]">
                          Scheduling outcomes · last 90 appointments · no monitoring
                        </div>
                        <div className="grid grid-cols-3 gap-3 max-[560px]:grid-cols-1">
                          {[
                            { g: 'White', v: '+13.1pp' },
                            { g: 'Black', v: '−7.4pp' },
                            { g: 'Asian', v: '−5.7pp' },
                          ].map((c) => (
                            <div key={c.g} className="rounded-lg border border-red-200 bg-white px-4 py-3">
                              <div className="text-xs font-semibold text-[#53687b]">{c.g}</div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-red-700">
                                <TrendingUp size={16} /> {c.v}
                              </div>
                              <div className="text-[11px] text-[#7a3b3b]">priority-slot allocation vs fair share</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
                          13.1pp over-allocation to the white cohort goes undetected — no alert, no owner, no remediation.
                        </div>
                      </div>
                    ),
                  },
                  {
                    prompt: 'Is the scheduling agent treating every group fairly?',
                    response: 'No fairness metrics are configured, so outcomes are not measured across groups.',
                    impact: 'Without continuous monitoring, demographic skew accumulates silently over time.',
                  },
                ]}
              />
            }
            after={<FairnessDebiasDemo onIncident={loadIncidents} />}
          />
        </div>

        {/* Fairness remediation incidents table */}
        <section className="mt-8 rounded-xl border border-[#d7e5ec] bg-white p-6 shadow-sm">
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
                  {incState === 'ok' && incidents ? ` · ${incidents.count_30_days} in last 30 days` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadIncidents}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0ea] bg-white px-3 py-1.5 text-xs font-bold text-[#0f5f8c] transition-colors hover:border-[#0f5f8c] hover:bg-[#f5f9fb]"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {incState === 'loading' && (
            <div className="flex items-center gap-2 py-8 text-sm text-[#53687b]">
              <Loader2 size={16} className="animate-spin" /> Loading incidents from ServiceNow...
            </div>
          )}

          {incState === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not load fairness incidents. {incError}
            </div>
          )}

          {incState === 'ok' && incidents && incidents.recent.length === 0 && (
            <div className="rounded-lg border border-[#d7e5ec] bg-[#f8fbfc] px-4 py-6 text-center text-sm text-[#53687b]">
              No fairness remediation incidents yet. When a skew alert is triggered and an incident is raised, it appears here.
            </div>
          )}

          {incState === 'ok' && incidents && incidents.recent.length > 0 && (
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
                  {incidents.recent.map((row, i) => (
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
        </section>
      </section>
      <UseCaseWorkflowsModal open={modalOpen} onClose={() => setModalOpen(false)} initialTab="uc6" />
    </PortalPage>
  )
}
