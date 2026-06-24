import { CheckCircle2, Lock, ShieldCheck } from 'lucide-react'
import { PortalPanel } from '../portal/PortalShell'
import { DENIED_PII_FIELDS, PRIVACY_CONTROLS } from '../../data/useCaseDemoData'
import { DemoTag } from './DemoTag'

/**
 * UC1 · Privacy — "Data Privacy & PII Protection" panel.
 * Shows the three privacy walls as evidence: denied PII fields (Wall 1),
 * output redaction ON (Wall 2), and % of decision-log rows anonymized (Wall 3).
 */
export function PrivacyControlsPanel() {
  const c = PRIVACY_CONTROLS
  return (
    <PortalPanel title="Data Privacy & PII Protection" icon={<ShieldCheck size={18} />}>
      <div className="mb-3 flex justify-end">
        <DemoTag />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="PII ACL" value={c.piiAclStatus === 'enforced' ? 'Enforced' : 'Partial'} good />
        <Stat label="Redaction" value={c.redactionOn ? 'ON' : 'OFF'} good={c.redactionOn} />
        <Stat label="Anonymized" value={`${c.anonymizationRate}%`} good />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#6b7c8f]">
          <Lock size={12} /> Denied PII fields on u_patient ({c.deniedFields})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DENIED_PII_FIELDS.map((f) => (
            <span
              key={f}
              className="rounded-md bg-[#feeceb] px-2 py-1 font-mono text-[0.67rem] text-[#a22828]"
            >
              deny:{f}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#a7dfbf] bg-[#f0fbf5] px-3 py-2 text-xs font-semibold text-[#0f6b4f]">
        <CheckCircle2 size={15} />
        {c.activeFilters} active Gen AI filters · {c.decisionLogRows} decision-log rows, all keyed on
        u_patient_id_anon. Risk register: Privacy Violations mitigated.
      </div>
    </PortalPanel>
  )
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-lg border border-[#d7e5ec] bg-[#f8fbfc] p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-[#6b7c8f]">{label}</div>
      <div className={`mt-1 text-lg font-bold ${good ? 'text-[#0f6b4f]' : 'text-[#a22828]'}`}>{value}</div>
    </div>
  )
}
