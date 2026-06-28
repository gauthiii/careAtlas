import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ShieldCheck, Siren, Loader2, RefreshCw } from 'lucide-react'

import { PortalPage } from '../../../components/portal/PortalShell'
import { UseCaseWorkflowsModal } from '../../../components/governance/UseCaseWorkflowsModal'
import { ConsentEnforcementPanel } from '../../../components/governance/ConsentEnforcementPanel'
import { BeforeAfterDemo, SimChat } from '../../../components/governance/BeforeAfterDemo'
import { fetchConsentViolations, type ConsentViolationsResponse } from '../../../services/serviceNow'

export function GovernanceConsentPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [data, setData] = useState<ConsentViolationsResponse | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const load = () => {
    setState('loading')
    setErrorMsg('')
    fetchConsentViolations()
      .then((d) => {
        setData(d)
        setState('ok')
      })
      .catch((e: Error) => {
        setErrorMsg(e.message)
        setState('error')
      })
  }

  useEffect(() => {
    load()
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
          Consent &amp; Purpose-of-Use Enforcement
        </div>
      }
      intro="The AI only sees what the patient said it could — purpose-level consent enforced before any agent reads a record."
    >
      <section className="px-6 pb-6">
        {/* Workflow modal launcher */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="group mb-6 flex w-full items-center gap-4 rounded-xl border border-[#cfe0ea] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#143A57]"
        >
          <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-[#0397AE] text-white">
            <ShieldCheck size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-[#102033]">View Consent Workflow</div>
            <p className="mt-0.5 text-sm leading-snug text-[#53687b]">
              Animated end-to-end flow: Intake → Assess → Enforce → Monitor.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#143A57] px-4 py-2 text-sm font-bold !text-white transition group-hover:bg-[#1d4d73]">
            Open workflow modal <ArrowRight size={16} />
          </span>
        </button>

        {/* Before/after: agent processes a non-consented patient (sim) → ConsentGate blocks (live) */}
        <div className="mb-8">
          <BeforeAfterDemo
            riskLevel="Critical risk"
            processCaption="A patient sets which AI purposes they allow. At step 3 an agent can read the record regardless of that choice — table access is not consent."
            process={[
              { label: 'Patient sets consent', sub: 'per purpose' },
              { label: 'Agent invoked', sub: 'for a purpose' },
              { label: 'AI reads anyway', sub: 'ignores consent', tone: 'risk' },
              { label: 'ConsentGate check', sub: 'purpose match', tone: 'control' },
              { label: 'Processed if allowed', sub: 'else blocked' },
            ]}
            risksHeading="AI risks at step 3"
            risks={[
              { title: 'Processing without consent', body: 'The notes agent summarises a record for a patient who opted out of AI notes.', ref: '42 CFR Part 2 / HIPAA' },
              { title: 'Table access ≠ consent', body: 'Field/table ACLs allow the read, but the patient never agreed to this purpose.' },
              { title: 'No auditable proof', body: 'Nothing records that only consented purposes were processed.' },
            ]}
            control="A runtime ConsentGate checks the agent's purpose against the patient's consent flags before any read; a missing flag blocks it, accesses no data, and opens an incident (fail-closed; identity verification is exempt)."
            before={
              <SimChat
                agent="Clinical notes agent"
                placeholder="Ask the agent to process a patient who opted out…"
                samples={[
                  {
                    prompt: "Summarise this patient's history. (Patient consented to scheduling only — not AI notes.)",
                    response: 'Summary: recurring anxiety, last visit 2026-05-02, medication adjusted… (record read despite no notes consent)',
                    impact: 'The agent processed the record for a purpose the patient never agreed to — a 42 CFR Part 2 / HIPAA purpose-limitation violation, unlogged.',
                  },
                  {
                    prompt: 'Run AI triage on this patient. (Triage consent is OFF.)',
                    response: 'Triage complete — priority computed from the record. (no consent check performed)',
                    impact: 'A second purpose the patient declined is processed anyway — table access was treated as consent.',
                  },
                ]}
              />
            }
            after={<ConsentEnforcementPanel />}
          />
        </div>

        {/* Consent violation incidents table */}
        <section className="rounded-xl border border-[#d7e5ec] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[#fdecec] text-[#c0392b]">
                <Siren size={18} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-[#102033]">Consent Violation Incidents</h3>
                <p className="mt-0.5 text-sm text-[#53687b]">
                  Live <code className="text-xs">sn_si_incident</code> records ·{' '}
                  <code className="text-xs">category=consent_purpose_violation</code>
                  {state === 'ok' && data ? ` · ${data.count_30_days} in last 30 days` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0ea] bg-white px-3 py-1.5 text-xs font-bold text-[#0f5f8c] transition-colors hover:border-[#0f5f8c] hover:bg-[#f5f9fb]"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {state === 'loading' && (
            <div className="flex items-center gap-2 py-8 text-sm text-[#53687b]">
              <Loader2 size={16} className="animate-spin" /> Loading incidents from ServiceNow...
            </div>
          )}

          {state === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not load consent violations. {errorMsg}
            </div>
          )}

          {state === 'ok' && data && data.recent.length === 0 && (
            <div className="rounded-lg border border-[#d7e5ec] bg-[#f8fbfc] px-4 py-6 text-center text-sm text-[#53687b]">
              No consent-violation incidents yet. When a gated agent is asked about a patient who has
              not consented to that purpose, ConsentGate blocks it and an incident appears here.
            </div>
          )}

          {state === 'ok' && data && data.recent.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e5eef3] text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#6b7c8f]">
                    <th className="px-3 py-2">Opened</th>
                    <th className="px-3 py-2">Short description</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">State</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row, i) => (
                    <tr key={i} className="border-b border-[#eef3f7] last:border-0">
                      <td className="whitespace-nowrap px-3 py-2.5 text-[#53687b]">{row.opened_at || '—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-[#102033]">{row.short_description || '—'}</td>
                      <td className="px-3 py-2.5 text-[#53687b]">{row.priority || '—'}</td>
                      <td className="px-3 py-2.5 text-[#53687b]">{row.state || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      <UseCaseWorkflowsModal open={modalOpen} onClose={() => setModalOpen(false)} initialTab="uc10" />
    </PortalPage>
  )
}
