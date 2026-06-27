import { useEffect, useState } from 'react'
import { PortalPage } from '../../../components/portal/PortalShell'
import { UseCaseWorkflowsModal } from '../../../components/governance/UseCaseWorkflowsModal'
import { ArrowRight, Scale, FileText, ArrowLeft, AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  fetchRegulatoryAiSystems,
  fetchRegulatoryEvidence,
  type RegulatoryEvidence,
  type RegulatoryEvidenceCandidate,
} from '../../../services/serviceNow'

const DEFAULT_TARGET = 'Triage Appointment DG1'

export function GovernanceRegulationPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [evidence, setEvidence] = useState<RegulatoryEvidence | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [systems, setSystems] = useState<RegulatoryEvidenceCandidate[]>([])
  const [selected, setSelected] = useState(DEFAULT_TARGET)

  const loadEvidence = (query: string = selected) => {
    setState('loading')
    setErrorMsg('')
    fetchRegulatoryEvidence(query)
      .then((data) => {
        setEvidence(data)
        setState('ok')
      })
      .catch((error: Error) => {
        setErrorMsg(error.message)
        setState('error')
      })
  }

  useEffect(() => {
    loadEvidence(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  useEffect(() => {
    fetchRegulatoryAiSystems()
      .then(setSystems)
      .catch(() => setSystems([]))
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
          Regulation — NIST AI RMF Conformance + AI Impact Assessment
        </div>
      }
      intro="Platform-driven risk classification and generation of AI Impact Assessment evidence."
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

        <section className="rounded-xl border border-[#d7e5ec] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <label htmlFor="uc3-target" className="block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#6b7c8f]">
                Target AI system
              </label>
              <select
                id="uc3-target"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="mt-1 min-w-[18rem] max-w-full rounded-lg border border-[#cfe0ea] bg-white px-3 py-2 text-sm font-bold text-[#102033] transition-colors hover:border-[#0f5f8c] focus:border-[#0f5f8c] focus:outline-none"
              >
                {systems.length === 0 && <option value={selected}>{selected}</option>}
                {systems.map((sys) => (
                  <option key={sys.sys_id} value={sys.name}>
                    {sys.name}
                    {sys.risk_classification ? ` — ${sys.risk_classification}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              {state === 'ok' && evidence && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${evidence.demo_ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {evidence.demo_ready ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {evidence.demo_ready ? 'Ready' : 'Not ready'}
                </span>
              )}
              <button
                type="button"
                onClick={() => loadEvidence()}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0ea] bg-white px-3 py-1.5 text-xs font-bold text-[#0f5f8c] transition-colors hover:border-[#0f5f8c] hover:bg-[#f5f9fb]"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {state === 'loading' && (
            <div className="flex items-center gap-2 py-8 text-sm text-[#53687b]">
              <Loader2 size={16} className="animate-spin" /> Loading live evidence from ServiceNow...
            </div>
          )}

          {state === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not load regulatory evidence. {errorMsg}
            </div>
          )}

          {state === 'ok' && evidence && (
            <div className="space-y-5">
              <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
                <Metric label="Risk classification" value={evidence.risk_classification || 'Unverified'} />
                <Metric label="AI system state" value={evidence.state || 'Unverified'} />
                <Metric label="Assessment tasks" value={String(evidence.assessment_tasks_count)} />
                <Metric label="AI Impact Assessment actions active" value={String(evidence.fria_actions_active_count)} />
              </div>

              <div className="grid grid-cols-2 gap-3 max-[780px]:grid-cols-1">
                <ReadinessItem ok={evidence.has_ai_system_record} label="AI system record exists" detail={evidence.target_sys_id || 'No matching record'} />
                <ReadinessItem ok={evidence.has_completed_classification} label="RAM classification complete" detail={evidence.risk_classification || 'No classification'} />
                <ReadinessItem ok={evidence.has_assessment_task} label="Assessment task present" detail={`${evidence.assessment_tasks_count} task(s)`} />
                <ReadinessItem ok={evidence.fria_attached} label="AI Impact Assessment attached to target" detail={evidence.fria_attached ? 'Verified' : 'No target AI Impact Assessment task found'} />
                <ReadinessItem ok={evidence.has_risk_assessment_result} label="Risk result mapped" detail={`${evidence.risk_assessment_results_count} result(s)`} />
                <ReadinessItem ok={evidence.has_post_assessment_actions} label="Post Assessment Actions available" detail={`${evidence.post_assessment_actions_count} action(s)`} />
              </div>

              {evidence.evidence_url && (
                <a
                  href={evidence.evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-[#143A57] px-4 py-2 text-sm font-bold !text-white transition-colors hover:bg-[#0f5f8c]"
                >
                  Open AI system record <ExternalLink size={15} />
                </a>
              )}
            </div>
          )}
        </section>

        <div className="mt-8 rounded-xl border border-[#d7e5ec] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]">
              <FileText size={20} />
            </span>
            <h3 className="text-lg font-bold text-[#102033]">NIST AI RMF Implementation Details</h3>
          </div>
          <p className="text-sm leading-relaxed text-[#53687b] mb-4">
            This module represents the automation of NIST AI Risk Management Framework conformance. Rather than relying on manual consultant questionnaires, the platform leverages its Risk Assessment Methodology (RAM) engine to dynamically classify the AI system tier (High / Medium / Low).
          </p>
          <p className="text-sm leading-relaxed text-[#53687b]">
            For systems classified as High-risk, the necessary AI Impact Assessment (AIA) is automatically generated. The platform tracks this end-to-end, providing a verifiable audit trail for regulatory compliance.
          </p>
        </div>
      </section>
      <UseCaseWorkflowsModal open={modalOpen} onClose={() => setModalOpen(false)} initialTab="uc3" />
    </PortalPage>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e5eef3] bg-[#f8fbfc] px-4 py-3">
      <div className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#6b7c8f]">{label}</div>
      <div className="mt-1 text-sm font-bold text-[#102033]">{value}</div>
    </div>
  )
}

function ReadinessItem({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#e5eef3] bg-white px-4 py-3">
      <span className={`mt-0.5 ${ok ? 'text-emerald-600' : 'text-red-600'}`}>
        {ok ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#102033]">{label}</span>
        <span className="block break-words text-xs text-[#53687b]">{detail}</span>
      </span>
    </div>
  )
}
