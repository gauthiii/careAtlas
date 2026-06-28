import { useState } from 'react'
import { PortalPage } from '../../../components/portal/PortalShell'
import { UseCaseWorkflowsModal } from '../../../components/governance/UseCaseWorkflowsModal'
import { FairnessDebiasDemo } from '../../../components/governance/FairnessDebiasDemo'
import { BeforeAfterDemo, SimChat } from '../../../components/governance/BeforeAfterDemo'
import { ArrowRight, Activity, ArrowLeft, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

export function GovernanceFairnessPage() {
  const [modalOpen, setModalOpen] = useState(false)

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
            after={<FairnessDebiasDemo />}
          />
        </div>
      </section>
      <UseCaseWorkflowsModal open={modalOpen} onClose={() => setModalOpen(false)} initialTab="uc6" />
    </PortalPage>
  )
}
