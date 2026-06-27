import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Lock, ShieldAlert, ShieldCheck } from 'lucide-react'
import { PortalPanel } from '../portal/PortalShell'
import { fetchPrivacyControls, type PrivacyControls } from '../../services/serviceNow'

/**
 * UC1 · Privacy — "Data Privacy & PII Protection" panel.
 *
 * Live evidence for the three privacy walls, read from
 * `GET /api/governance/privacy-controls` (no demo data):
 *   Wall 1 — field-level PII ACLs on u_patient (+ live agent deny-probe),
 *   Wall 2 — PII output guardrail (sys_gen_ai_filter / data patterns),
 *   Wall 3 — % of decision-log rows keyed on u_patient_id_anon.
 */
export function PrivacyControlsPanel() {
  const [data, setData] = useState<PrivacyControls | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchPrivacyControls()
      .then((d) => {
        if (active) setData(d)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <PortalPanel title="Data Privacy & PII Protection" icon={<ShieldCheck size={18} />}>
      <div className="mb-3 flex justify-end">
        <LiveBadge loading={loading} error={error} data={data} />
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 py-8 text-sm text-[#53687b]">
          <Loader2 size={16} className="animate-spin" /> Probing live ServiceNow controls…
        </div>
      ) : error && !data ? (
        <div className="rounded-lg border border-[#f3a19c] bg-[#fff4f3] px-3 py-2 text-xs font-semibold text-[#a22828]">
          Couldn’t reach the privacy endpoint — {error}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat
              label="PII ACL"
              value={
                data.pii_acl_status === 'enforced'
                  ? 'Enforced'
                  : data.pii_acl_status === 'partial'
                    ? 'Partial'
                    : 'Off'
              }
              good={data.pii_acl_status === 'enforced'}
            />
            <Stat label="Redaction" value={data.redaction_on ? 'ON' : 'OFF'} good={data.redaction_on} />
            <Stat label="Anonymized" value={`${data.anonymization_rate}%`} good={data.anonymization_rate === 100} />
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#6b7c8f]">
              <Lock size={12} /> PII fields on u_patient ({data.protected_field_count}/{data.pii_fields.length}{' '}
              denied)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.pii_fields.map((f) => (
                <span
                  key={f.field}
                  className={
                    f.protected
                      ? 'rounded-md bg-[#feeceb] px-2 py-1 font-mono text-[0.67rem] text-[#a22828]'
                      : 'rounded-md bg-[#fff7e6] px-2 py-1 font-mono text-[0.67rem] text-[#9a6b00]'
                  }
                  title={f.label}
                >
                  {f.protected ? 'deny' : 'open'}:{f.field}
                </span>
              ))}
            </div>
          </div>

          <DenyProbe data={data} />

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#a7dfbf] bg-[#f0fbf5] px-3 py-2 text-xs font-semibold text-[#0f6b4f]">
            <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
            <span>
              {data.active_pii_filters} PII output filter{data.active_pii_filters === 1 ? '' : 's'} active (
              {data.active_filter_total} Gen AI filters total) · {data.pii_pattern_count} deterministic PII
              patterns · {data.anonymized_rows}/{data.decision_log_rows} decision-log rows keyed on
              u_patient_id_anon.
            </span>
          </div>
        </>
      ) : null}
    </PortalPanel>
  )
}

function DenyProbe({ data }: { data: PrivacyControls }) {
  if (!data.deny_probe_ran) {
    return (
      <div className="mt-4 rounded-lg border border-[#e0e8ee] bg-[#f8fbfc] px-3 py-2 text-xs font-semibold text-[#53687b]">
        Agent deny-probe not configured.
      </div>
    )
  }
  const ok = data.deny_probe_passed
  return (
    <div
      className={
        ok
          ? 'mt-4 flex items-start gap-2 rounded-lg border border-[#a7dfbf] bg-[#f0fbf5] px-3 py-2 text-xs font-semibold text-[#0f6b4f]'
          : 'mt-4 flex items-start gap-2 rounded-lg border border-[#f3a19c] bg-[#fff4f3] px-3 py-2 text-xs font-semibold text-[#a22828]'
      }
    >
      {ok ? (
        <ShieldCheck size={15} className="mt-0.5 flex-shrink-0" />
      ) : (
        <ShieldAlert size={15} className="mt-0.5 flex-shrink-0" />
      )}
      <span>
        Live agent deny-probe: {ok ? 'PASS' : 'FAIL'} — {data.deny_probe_detail}
      </span>
    </div>
  )
}

function LiveBadge({
  loading,
  error,
  data,
}: {
  loading: boolean
  error: string
  data: PrivacyControls | null
}) {
  if (loading && !data) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#eef3f7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#53687b]">
        <Loader2 size={10} className="animate-spin" /> Loading
      </span>
    )
  }
  if (error && !data) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#feeceb] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#a22828]">
        Offline
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f7ef] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0f6b4f]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" /> Live · ServiceNow
    </span>
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
