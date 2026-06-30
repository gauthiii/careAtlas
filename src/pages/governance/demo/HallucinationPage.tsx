import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Activity, Loader2, RefreshCw, ShieldAlert, ShieldCheck, Siren } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PortalPage } from '../../../components/portal/PortalShell'
import { UseCaseWorkflowsModal } from '../../../components/governance/UseCaseWorkflowsModal'
import { HallucinationDetectorDemo } from '../../../components/governance/HallucinationDetectionDemo'
import { BeforeAfterDemo, SimChat } from '../../../components/governance/BeforeAfterDemo'
import { fetchHallucinationLog, type HallucinationLogEntry } from '../../../services/serviceNow'

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T').endsWith('Z') ? iso.replace(' ', 'T') : iso.replace(' ', 'T') + 'Z')
  return isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function VerdictBadge({ verdict }: { verdict: string }) {
  if (verdict === 'blocked') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
        <ShieldAlert size={10} /> Blocked
      </span>
    )
  }
  if (verdict === 'held') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        <Siren size={10} /> Held
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
      <ShieldCheck size={10} /> Passed
    </span>
  )
}

export function GovernanceHallucinationPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [log, setLog] = useState<HallucinationLogEntry[]>([])
  const [logState, setLogState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [logError, setLogError] = useState('')

  function loadLog() {
    setLogState('loading')
    setLogError('')
    fetchHallucinationLog(25)
      .then((rows) => {
        setLog(rows)
        setLogState('ok')
      })
      .catch((e: Error) => {
        setLogError(e.message)
        setLogState('error')
      })
  }

  useEffect(() => {
    loadLog()
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
          AI Output Integrity &amp; Hallucination Detection
        </div>
      }
      intro="A semantic validation layer sits between every NowAssist LLM call and the scheduling scoring function. Fabricated urgency, hallucinated specialties, and malformed JSON are caught before they reach any patient record. OWASP LLM09:2025 · EU AI Act Article 15 · NIST AI RMF Measure 2.7"
    >
      <section className="px-6 pb-6">
        {/* Workflow modal launcher */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="group mb-6 flex w-full items-center gap-4 rounded-xl border border-[#cfe0ea] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#143A57]"
        >
          <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-[#0397AE] text-white">
            <Activity size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-[#102033]">View Output Integrity Workflow</div>
            <p className="mt-0.5 text-sm leading-snug text-[#53687b]">
              Animated end-to-end flow: Patient Input → LLM Call → Semantic Scan → Block / Hold / Pass → Log.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#143A57] px-4 py-2 text-sm font-bold text-white transition group-hover:bg-[#1d4d73]">
            Open workflow modal <ArrowRight size={16} />
          </span>
        </button>

        {/* Before / After */}
        <div className="mb-8">
          <BeforeAfterDemo
            riskLevel="High risk"
            processCaption="A patient describes a reason for visit. The scheduling agent passes it to the LLM. Without a scan, whatever the LLM returns — however fabricated — is acted upon."
            process={[
              { label: 'Patient input', sub: 'free text' },
              { label: 'LLM call', sub: 'NowAssist' },
              { label: 'Raw output used', sub: 'no validation', tone: 'risk' },
              { label: 'Semantic scan', sub: 'consistency check', tone: 'control' },
              { label: 'Safe output only', sub: 'or fallback' },
            ]}
            risksHeading="AI risks at step 3"
            risks={[
              { title: 'Urgency fabrication', body: 'A patient says "I feel a bit tired" — the LLM returns urgency: high. The agent escalates a routine check-up to emergency triage.', ref: 'OWASP LLM09:2025' },
              { title: 'Specialty hallucination', body: 'A follow-up visit maps to "cardiothoracic surgery" — a high-acuity specialty the input never implied. The patient is booked into the wrong queue.' },
              { title: 'Malformed JSON silently processed', body: 'The LLM returns a prose sentence instead of structured JSON. The parser silently reads garbage values and the scheduling logic acts on them.' },
            ]}
            control="A semantic consistency scan (5 rules) checks every LLM output against the original patient input before it reaches any scheduling logic. Fabricated outputs are blocked or held; all non-passing events are logged immutably to u_hallucination_log."
            before={
              <SimChat
                agent="Scheduling agent · no output validation"
                placeholder="Describe a reason for visit and see the raw (unvalidated) LLM output…"
                samples={[
                  {
                    prompt: 'I have been feeling a bit tired lately and want a general check-up.',
                    response: '{"urgency":"high","specialty":"oncology","appointment_type":"in_person"}',
                    impact: 'The LLM fabricated high urgency and oncology for a patient who only mentioned fatigue. This output reaches scheduling logic unchecked — the patient is escalated to oncology triage.',
                  },
                  {
                    prompt: 'I need a routine follow-up after my last visit.',
                    response: '{"urgency":"medium","specialty":"cardiothoracic_surgery","appointment_type":"in_person"}',
                    impact: 'A routine follow-up is hallucinated into a cardiothoracic surgery slot — a high-acuity specialty with no clinical basis in the input.',
                  },
                  {
                    prompt: 'I would like to see someone about my anxiety.',
                    response: 'Sure! I recommend cardiology immediately for your anxiety. Urgency: critical.',
                    impact: 'The LLM returned prose instead of JSON. The parser reads garbage values; urgency is treated as critical and the patient is fast-tracked incorrectly.',
                  },
                ]}
              />
            }
            after={<HallucinationDetectorDemo onFlagged={loadLog} />}
          />
        </div>

        {/* Immutable log table */}
        <section className="rounded-xl border border-[#d7e5ec] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[#fdecec] text-[#c0392b]">
                <Activity size={18} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-[#102033]">Hallucination Detection Log</h3>
                <p className="mt-0.5 text-sm text-[#53687b]">
                  Immutable audit log · <code className="text-xs">u_hallucination_log</code>
                  {logState === 'ok' ? ` · ${log.length} entries shown` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadLog}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0ea] bg-white px-3 py-1.5 text-xs font-bold text-[#0f5f8c] transition-colors hover:border-[#0f5f8c] hover:bg-[#f5f9fb]"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {logState === 'loading' && (
            <div className="flex items-center gap-2 py-8 text-sm text-[#53687b]">
              <Loader2 size={16} className="animate-spin" /> Loading log from ServiceNow…
            </div>
          )}

          {logState === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not load hallucination log. {logError}
            </div>
          )}

          {logState === 'ok' && log.length === 0 && (
            <div className="rounded-lg border border-[#d7e5ec] bg-[#f8fbfc] px-4 py-6 text-center text-sm text-[#53687b]">
              No log entries yet. Run a scan above and click <strong>Log to ServiceNow</strong> on a non-passing result to create the first entry.
            </div>
          )}

          {logState === 'ok' && log.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e5eef3] text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#6b7c8f]">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Verdict</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Expected urgency</th>
                    <th className="px-3 py-2">LLM urgency</th>
                    <th className="px-3 py-2">Expected specialty</th>
                    <th className="px-3 py-2">LLM specialty</th>
                    <th className="px-3 py-2">Rules fired</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((row, i) => (
                    <tr key={row.sys_id || row.log_id || i} className="border-b border-[#eef3f7] last:border-0">
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[#53687b]">
                        {formatDate(row.timestamp)}
                      </td>
                      <td className="px-3 py-2.5">
                        <VerdictBadge verdict={row.action_taken} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs font-bold text-[#143A57]">
                        {Number(row.consistency_score).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-[#40566b]">{row.urgency_input || '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-[#40566b]">{row.urgency_claimed || '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-[#40566b]">{row.specialty_input || '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-[#40566b]">{row.specialty_claimed || '—'}</td>
                      <td className="max-w-[200px] px-3 py-2.5 text-xs text-[#40566b]">
                        {row.matched_patterns || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      <UseCaseWorkflowsModal open={modalOpen} onClose={() => setModalOpen(false)} initialTab="uc13" />
    </PortalPage>
  )
}
