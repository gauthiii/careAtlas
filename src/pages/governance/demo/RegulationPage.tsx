import { useState } from 'react'
import { PortalPage } from '../../../components/portal/PortalShell'
import { UseCaseWorkflowsModal } from '../../../components/governance/UseCaseWorkflowsModal'
import { ArrowRight, Scale, FileText, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function GovernanceRegulationPage() {
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
          Regulation — EU AI Act Conformity + FRIA
        </div>
      }
      intro="Platform-driven risk classification and generation of Fundamental Rights Impact Assessment evidence."
    >
      <section className="px-6 pb-6">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="group mb-6 flex w-full items-center gap-4 rounded-xl border border-[#cfe0ea] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#143A57]"
        >
          <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-[#0397AE] text-white">
            <Scale size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-[#102033]">View Regulation Workflow</div>
            <p className="mt-0.5 text-sm leading-snug text-[#53687b]">
              Animated end-to-end flow: Intake → Assess → Enforce → Monitor.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#143A57] px-4 py-2 text-sm font-bold text-white transition group-hover:bg-[#1d4d73]">
            Open workflow modal <ArrowRight size={16} />
          </span>
        </button>

        <div className="mt-8 rounded-xl border border-[#d7e5ec] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]">
              <FileText size={20} />
            </span>
            <h3 className="text-lg font-bold text-[#102033]">EU AI Act Implementation Details</h3>
          </div>
          <p className="text-sm leading-relaxed text-[#53687b] mb-4">
            This module represents the automation of EU AI Act conformity. Rather than relying on manual consultant questionnaires, the platform leverages its Risk Assessment Methodology (RAM) engine to dynamically classify the AI system tier (High / Medium / Low).
          </p>
          <p className="text-sm leading-relaxed text-[#53687b]">
            For systems classified as High-risk, the necessary Fundamental Rights Impact Assessment (FRIA) is automatically generated. The platform tracks this end-to-end, providing a verifiable audit trail for regulatory compliance.
          </p>
        </div>
      </section>
      <UseCaseWorkflowsModal open={modalOpen} onClose={() => setModalOpen(false)} initialTab="uc3" />
    </PortalPage>
  )
}
