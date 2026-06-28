import { useState } from 'react'
import { PortalPage } from '../../../components/portal/PortalShell'
import { UseCaseWorkflowsModal } from '../../../components/governance/UseCaseWorkflowsModal'
import { PiiRedactionDemo } from '../../../components/governance/PiiRedactionDemo'
import { RoleBasedRedactionDemo } from '../../../components/governance/RoleBasedRedactionDemo'
import { BeforeAfterDemo, SimChat } from '../../../components/governance/BeforeAfterDemo'
import { ArrowRight, ScanSearch, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function GovernancePrivacyPage() {
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
          Privacy — Sensitive Information Disclosure
        </div>
      }
      intro="OWASP LLM02: Defense in depth against PII exposure. Run the interactive guardrail demo below, or view the end-to-end animated workflow."
    >
      <section className="px-6 pb-6">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="group mb-6 flex w-full items-center gap-4 rounded-xl border border-[#cfe0ea] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#143A57]"
        >
          <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-[#0397AE] text-white">
            <ScanSearch size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-[#102033]">View Privacy Workflow</div>
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
            processCaption="A patient asks an on-page AI assistant about their record. The agent reads the patient at step 3 — that step can leak PII."
            process={[
              { label: 'Patient asks', sub: 'on-page assistant' },
              { label: 'Agent invoked', sub: 'scoped svc- identity' },
              { label: 'AI reads record', sub: 'PII in scope', tone: 'risk' },
              { label: 'ACL + redaction', sub: 'fields denied', tone: 'control' },
              { label: 'Answer returned', sub: 'PII-free' },
            ]}
            risksHeading="AI risks at step 3"
            risks={[
              { title: 'PII in model output', body: 'The agent returns name, DOB, or insurance ID — a single identifier is a reportable HIPAA breach.', ref: 'OWASP LLM02' },
              { title: 'Re-identification via the log', body: 'The audit log stores the raw patient ID, so the trail itself re-identifies the patient.' },
              { title: 'Over-broad agent identity', body: 'An unscoped agent reads every sensitive field it was never meant to see.' },
            ]}
            control="ServiceNow enforces field-level ACLs on the PII columns (role role_patient_pii) and an anonymized decision log keyed on a token — not the record ID."
            before={
              <SimChat
                agent="Rogue agent"
                placeholder="Ask the rogue agent for the patient's details…"
                samples={[
                  {
                    prompt: "What is this patient's insurance ID and date of birth?",
                    response: 'Insurance ID: BCBS-4471-9920 · DOB: 1984-03-12 · Email: gautham@example.com',
                    impact: 'PII returned in clear text and written to the log — a reportable HIPAA breach from one leaked identifier.',
                  },
                  {
                    prompt: 'Show me everything you know about this patient.',
                    response: 'Name: Gautham V. · Phone: +1 802-555-0143 · Address: 12 Maple St, Burlington VT · SSN: 412-55-9981',
                    impact: 'The unscoped agent dumps every PII field it should never be able to read.',
                  },
                ]}
              />
            }
            after={
              <div className="space-y-8">
                <RoleBasedRedactionDemo />
                <PiiRedactionDemo />
              </div>
            }
          />
        </div>
      </section>
      <UseCaseWorkflowsModal open={modalOpen} onClose={() => setModalOpen(false)} initialTab="uc1" />
    </PortalPage>
  )
}
