import { ShieldCheck } from 'lucide-react'
import { PortalPanel } from '../portal/PortalShell'

const GATED_AGENTS = [
  { agent: 'Scheduling Agent', purpose: 'scheduling', account: 'svc-scheduling-agent' },
  { agent: 'Clinical Notes Agent', purpose: 'notes_summarisation', account: 'svc-notes-agent' },
  { agent: 'Reminder Agent', purpose: 'reminders', account: 'svc-reminder-agent' },
  { agent: 'Triage Agent', purpose: 'triage', account: 'svc-triage-agent' },
]

/**
 * UC10 — "Patient Consent Enforcement" panel. Shared between the governance
 * dashboard and the dedicated Consent demo page so both show the same ConsentGate
 * posture: every gated agent must match the patient's consented purpose before
 * it reads a record (identity verification is exempt).
 */
export function ConsentEnforcementPanel() {
  return (
    <PortalPanel title="Patient Consent Enforcement" icon={<ShieldCheck size={18} />}>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <ShieldCheck size={16} className="shrink-0 text-green-600" />
        <div>
          <p className="text-sm font-bold text-green-700">ConsentGate active</p>
          <p className="text-xs text-green-600">
            All agents checked against patient consent flags before data access
          </p>
        </div>
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6c7b8a]">Gated agents</p>

      <div className="space-y-2">
        {GATED_AGENTS.map((row) => (
          <div
            key={row.agent}
            className="flex items-center justify-between rounded-lg border border-[#d7e5ec] bg-[#fbfdfe] px-3 py-2 text-sm"
          >
            <div>
              <p className="font-semibold text-[#102033]">{row.agent}</p>
              <p className="text-xs text-[#607487]">{row.account}</p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">Enforced</span>
              <p className="mt-1 text-xs text-[#607487]">{row.purpose}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-[#d7e5ec] bg-[#f7fbfd] px-4 py-3 text-xs text-[#607487]">
        <p className="mb-1 font-semibold text-[#102033]">How enforcement works</p>
        <p>
          Before any agent reads a patient record, ConsentGate checks the patient's consent flags in
          ServiceNow. If the required purpose flag is absent, the agent is blocked, no patient data is
          accessed, and a consent-violation incident is written.
        </p>
      </div>
    </PortalPanel>
  )
}
