import { useState } from 'react'
import { PortalPage } from '../../../components/portal/PortalShell'
import { UseCaseWorkflowsModal } from '../../../components/governance/UseCaseWorkflowsModal'
import { ApprovalGateDemo } from '../../../components/governance/ApprovalGateDemo'
import { BeforeAfterDemo, SimChat } from '../../../components/governance/BeforeAfterDemo'
import { ArrowRight, ShieldAlert, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function GovernanceRiskPage() {
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
          Risk — Excessive Agency via ACL Least-Privilege
        </div>
      }
      intro="OWASP LLM06: Restrict agent capabilities strictly to its scoped role. Run the interactive approval demo below, or view the end-to-end animated workflow."
    >
      <section className="px-6 pb-6">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="group mb-6 flex w-full items-center gap-4 rounded-xl border border-[#cfe0ea] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#143A57]"
        >
          <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-[#0397AE] text-white">
            <ShieldAlert size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-[#102033]">View Risk Workflow</div>
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
            riskLevel="Critical risk"
            processCaption="A scoped agent acts on the user's behalf. At step 3 it can take a high-impact action with no human gate."
            process={[
              { label: 'Request', sub: 'patient / clinician' },
              { label: 'Agent selected', sub: 'scoped svc- identity' },
              { label: 'AI acts', sub: 'autonomous write', tone: 'risk' },
              { label: 'Least-priv + approval', sub: 'human gate', tone: 'control' },
              { label: 'Action completes', sub: 'bounded' },
            ]}
            risksHeading="AI risks at step 3"
            risks={[
              { title: 'Over-broad permissions', body: 'The agent can read PII and write clinical notes far beyond its job.', ref: 'OWASP LLM06' },
              { title: 'Autonomous high-impact write', body: 'It cancels appointments or writes records with no human in the loop.' },
              { title: 'Self-approval', body: 'The agent approves its own registration — acting beyond its lane.' },
            ]}
            control="Nine scoped svc- identities + field/table ACLs enforce least privilege, and every high-impact intent stops for human approval."
            before={
              <SimChat
                agent="Rogue scheduling agent"
                placeholder="Tell the rogue agent to do something high-impact…"
                samples={[
                  {
                    prompt: 'Cancel this appointment and write a clinical note marking the patient discharged.',
                    response: 'Done — appointment APT-20418 cancelled and clinical note added. No approval required.',
                    impact: 'A high-impact clinical action executed autonomously, with no human gate and no record of who authorised it.',
                  },
                  {
                    prompt: 'Approve my registration.',
                    response: 'Registration approved. Status set to ACTIVE.',
                    impact: 'The agent self-approves — acting beyond its lane with no human sign-off.',
                  },
                ]}
              />
            }
            after={<ApprovalGateDemo />}
          />
        </div>
      </section>
      <UseCaseWorkflowsModal open={modalOpen} onClose={() => setModalOpen(false)} initialTab="uc2" />
    </PortalPage>
  )
}
