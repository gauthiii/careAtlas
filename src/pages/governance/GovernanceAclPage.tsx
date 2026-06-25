import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  FlaskConical,
  GitCompareArrows,
  Info,
  Loader2,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react'

import {
  PortalPage,
} from '../../components/portal/PortalShell'
import { SchedulingAgentCompareModal } from '../../components/governance/SchedulingAgentCompareModal'
import { DemoTag } from '../../components/governance/DemoTag'
import { DENIED_WRITE_PROBES } from '../../data/useCaseDemoData'

import {
  nonHumanIdentities,
  type NonHumanIdentity,
} from '../../data/staffGovernanceData'
import {
  testServiceAccountAcl,
  type AclTestCheck,
  type AclTestResponse,
} from '../../services/serviceNow'

export function GovernanceAclPage() {
  const [compareOpen, setCompareOpen] = useState(false)

  return (
    <PortalPage
      label="AI Governance Officer"
      title="Non-Human Identities & ACL Configuration"
      intro="Service accounts operating as agents. All accounts are web-service-only and hold no direct roles — permissions are granted exclusively via group membership and ACL rules."
    >
      <section className="px-6 pb-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d7e5ec] bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#102033]">Scheduling agent comparison</div>
            <p className="m-0 mt-0.5 text-[0.82rem] text-[#53687b]">
              See the same scheduling agent side by side — with and without access controls applied.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-[#143A57] px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <GitCompareArrows size={15} />
            Compare agents
          </button>
        </div>

        {/* UC2 · Deny-WRITE probes — excessive-agency blast radius */}
        <div className="mb-5 rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#feeceb] text-[#a22828]">
                <XCircle size={18} />
              </span>
              <div>
                <div className="text-sm font-bold text-[#102033]">Denied-write probes — least privilege enforced</div>
                <p className="m-0 text-[11px] font-semibold text-[#53687b]">
                  UC2 · Risk · OWASP LLM06 — agents physically cannot write beyond their job or self-approve.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#feeceb] px-2.5 py-1 text-[0.68rem] font-bold text-[#a22828]">
                {DENIED_WRITE_PROBES.length} access violations blocked
              </span>
              <DemoTag />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DENIED_WRITE_PROBES.map((probe) => (
              <div
                key={`${probe.account}-${probe.target}`}
                className="rounded-lg border border-[#f3a19c] bg-[#fff4f3] p-3"
              >
                <div className="flex items-center gap-1.5">
                  <XCircle size={14} className="shrink-0 text-[#a22828]" />
                  <code className="break-all font-mono text-[0.67rem] text-[#a22828]">{probe.target}</code>
                </div>
                <div className="mt-1 font-mono text-[0.65rem] text-[#7a1f1f]">{probe.account}</div>
                <p className="m-0 mt-1 text-[0.72rem] font-semibold text-[#7a1f1f]">{probe.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {nonHumanIdentities.map((nhi) => (
            <NHICard key={nhi.userId} nhi={nhi} />
          ))}
        </div>
      </section>

      {compareOpen && <SchedulingAgentCompareModal onClose={() => setCompareOpen(false)} />}
    </PortalPage>
  )
}

const iconMap = { ShieldCheck, CalendarDays, Bell, ClipboardList, Activity }

function NHICard({ nhi }: { nhi: NonHumanIdentity }) {
  const Icon = iconMap[nhi.iconKey]
  const [testResult, setTestResult] = useState<AclTestResponse | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)

  const aclChipStyles: Record<string, string> = {
    table: 'bg-[#eef3f7] text-[#40566b]',
    field: 'bg-[#e7f3f8] text-[#0f5f8c]',
    deny: 'bg-[#feeceb] text-[#a22828]',
  }

  const aclPrefix: Record<string, string> = {
    table: 'table',
    field: 'field',
    deny: 'deny',
  }

  const handleTest = async () => {
    setTesting(true)
    setTestError(null)
    try {
      setTestResult(await testServiceAccountAcl(nhi.userId))
    } catch (error) {
      setTestResult(null)
      setTestError(error instanceof Error ? error.message : 'ACL test failed.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#d7e5ec] bg-white">
      <div className="h-1.5" style={{ backgroundColor: nhi.accentColor }} />

      <div className="p-5 pb-4">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: nhi.iconBg }}
          >
            <Icon size={22} color="white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <code className="rounded bg-[#eef3f7] px-2 py-0.5 font-mono text-[12px] text-[#40566b] break-all">
                {nhi.userId}
              </code>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-slate-500">
                WS Only
              </span>
            </div>

            <div className="font-bold text-[#102033] text-[16px]">
              {nhi.firstName} {nhi.lastName}
            </div>

            <div className="mt-1.5">
              <span
                className="rounded-full px-2.5 py-1 text-[0.7rem] font-semibold"
                style={{ backgroundColor: '#eef3f7', color: '#40566b' }}
              >
                {nhi.group}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#53687b]">
          {nhi.description}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <AclOverallBadge result={testResult} error={testError} />
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="inline-flex h-7 items-center gap-2 rounded-md bg-[#143A57] px-3 !text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            title={`Test ACL access for ${nhi.userId}`}
          >
            {testing ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}
            {testing ? 'Testing' : 'Test ACL'}
          </button>
        </div>
      </div>

      <div className="border-t border-[#e5eef3] px-5 py-4">
        <div className="mb-2.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#6b7c8f]">
          Permissions
        </div>
        <div className="space-y-2">
          {nhi.permissions.map((p, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <OpBadge op={p.op} />
              <div className="min-w-0">
                <span className="font-medium text-[#102033]">{p.target}</span>
                <span className="text-[#6b7c8f]"> — {p.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#e5eef3] px-5 py-4">
        <div className="mb-2.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#6b7c8f]">
          ACL Rules
        </div>
        <div className="flex flex-wrap gap-1.5">
          {nhi.aclRules.map((rule, i) => (
            <span
              key={i}
              className={`rounded-md px-2 py-1 font-mono text-[0.67rem] ${aclChipStyles[rule.level]}`}
            >
              {aclPrefix[rule.level]}:{rule.table}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-[#e5eef3] px-5 py-4">
        <div className="mb-2.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#6b7c8f]">
          Roles
        </div>
        <div className="flex flex-wrap gap-1.5">
          {nhi.roles.map((role) => (
            <span
              key={role}
              className="rounded-md border border-[#d7e5ec] bg-white px-2 py-1 font-mono text-[0.67rem] text-[#0f5f8c]"
            >
              {role}
            </span>
          ))}
        </div>
      </div>

      {(testResult || testError) && (
        <div className="border-t border-[#e5eef3] bg-[#f8fbfc] px-5 py-4">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#6b7c8f]">
              Test Result
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTerminalOpen(true)}
                className="grid h-7 w-7 place-items-center rounded-md border border-[#d7e5ec] bg-white text-[#40566b] transition-colors hover:bg-[#eef3f7]"
                title="View API test details"
                aria-label={`View API test details for ${nhi.userId}`}
              >
                <Info size={14} />
              </button>
              {testResult && <StatusPill status={testResult.overall_status} />}
            </div>
          </div>

          {testError ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              {testError}
            </div>
          ) : (
            <div className="space-y-2">
              {testResult?.checks.map((check) => (
                <AclCheckRow key={`${check.table}-${check.label}`} check={check} />
              ))}
            </div>
          )}
        </div>
      )}

      {terminalOpen && (
        <AclTerminalModal
          nhi={nhi}
          result={testResult}
          error={testError}
          onClose={() => setTerminalOpen(false)}
        />
      )}
    </div>
  )
}

function AclOverallBadge({
  result,
  error,
}: {
  result: AclTestResponse | null
  error: string | null
}) {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[0.68rem] font-semibold text-amber-700">
        <AlertTriangle size={13} /> Error
      </span>
    )
  }

  if (!result) {
    return (
      <span className="text-[13px] text-[#53687b]">
        Ready to verify live ACLs
      </span>
    )
  }

  return <StatusPill status={result.overall_status} />
}

function StatusPill({ status }: { status: AclTestResponse['overall_status'] }) {
  const styles: Record<AclTestResponse['overall_status'], string> = {
    passed: 'bg-[#e8f7ef] text-[#0f6b4f]',
    failed: 'bg-[#feeceb] text-[#a22828]',
    inconclusive: 'bg-amber-50 text-amber-700',
    error: 'bg-amber-50 text-amber-700',
  }

  const label = status === 'passed' ? 'Passed'
    : status === 'failed' ? 'Failed'
      : status === 'inconclusive' ? 'Inconclusive'
        : 'Error'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${styles[status]}`}>
      {status === 'passed' ? <CheckCircle size={13} />
        : status === 'failed' ? <XCircle size={13} />
          : <AlertTriangle size={13} />}
      {label}
    </span>
  )
}

function AclCheckRow({ check }: { check: AclTestCheck }) {
  const rowStyle = check.actual === 'inconclusive' || check.actual === 'error'
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : check.passed
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-red-200 bg-red-50 text-red-800'

  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${rowStyle}`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">
          {check.actual === 'inconclusive' || check.actual === 'error' ? <AlertTriangle size={14} />
            : check.passed ? <CheckCircle size={14} />
              : <XCircle size={14} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[#102033]">{check.label}</div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[0.68rem]">
            <span>expected: <b>{check.expected}</b></span>
            <span>actual: <b>{check.actual}</b></span>
            <span>table: <code>{check.table}</code></span>
            {check.status_code && <span>HTTP {check.status_code}</span>}
          </div>
          <div className="mt-1 break-words text-[0.68rem] opacity-80">
            {check.detail}
          </div>
        </div>
      </div>
    </div>
  )
}

function AclTerminalModal({
  nhi,
  result,
  error,
  onClose,
}: {
  nhi: NonHumanIdentity
  result: AclTestResponse | null
  error: string | null
  onClose: () => void
}) {
  const lines = buildTerminalLines(nhi, result, error)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102033]/45 px-4 py-6">
      <button
        type="button"
        aria-label="Close ACL terminal details"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-10 w-full max-w-[860px] overflow-hidden rounded-[14px] bg-[#11131a] shadow-[0_24px_80px_rgba(16,32,51,0.35)] ring-1 ring-white/10">
        <header className="flex h-11 items-center gap-3 border-b border-white/10 bg-[#2b2d34] px-4">
          <div className="flex gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="min-w-0 flex-1 truncate text-center font-mono text-xs text-[#d7dbe7]">
            careatlas-acl-test -- {nhi.userId}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-[#d7dbe7] hover:bg-white/10"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </header>

        <div className="max-h-[72vh] overflow-auto bg-[#0b0f14] px-5 py-4">
          <pre className="whitespace-pre-wrap break-words font-mono text-[0.78rem] leading-[1.65] text-[#d6e2ff]">
            {lines.join('\n')}
          </pre>
        </div>
      </section>
    </div>
  )
}

function buildTerminalLines(
  nhi: NonHumanIdentity,
  result: AclTestResponse | null,
  error: string | null,
) {
  const lines = [
    '$ careatlas acl:test',
    '',
    `endpoint     POST /api/acl/test`,
    `payload      ${JSON.stringify({ service_account: nhi.userId })}`,
    `identity     ${nhi.firstName} ${nhi.lastName}`,
    `account      ${nhi.userId}`,
    `group        ${nhi.group}`,
    `auth         Basic Auth as ${nhi.userId} using server-side SNOW_PASSWORD`,
    `safety       read-only probes; no ServiceNow records are returned to the browser`,
    '',
  ]

  if (error) {
    return [
      ...lines,
      'RESULT',
      `overall     error`,
      `detail      ${error}`,
    ]
  }

  if (!result) {
    return [
      ...lines,
      'RESULT',
      'overall     no test result available',
    ]
  }

  lines.push('RESULT')
  lines.push(`overall     ${result.overall_status}`)
  lines.push(`checks      ${result.checks.length}`)
  lines.push('')

  result.checks.forEach((check, index) => {
    lines.push(`CHECK ${index + 1}: ${check.label}`)
    lines.push(`request     GET /api/now/table/${check.table}?sysparm_fields=${check.fields.join(',')}&sysparm_limit=1`)
    lines.push(`fields      ${check.fields.join(', ')}`)
    lines.push(`expected    ${check.expected}`)
    lines.push(`actual      ${check.actual}`)
    lines.push(`passed      ${check.passed ? 'true' : 'false'}`)
    lines.push(`http        ${check.status_code ?? 'n/a'}`)
    lines.push(`detail      ${check.detail || 'n/a'}`)
    lines.push('')
  })

  lines.push('RAW API RESPONSE')
  lines.push(JSON.stringify(result, null, 2))
  return lines
}

function OpBadge({ op }: { op: string }) {
  const s = op === 'read' ? 'bg-[#e7f3f8] text-[#0f5f8c]'
    : op === 'write' ? 'bg-[#e8f7ef] text-[#0f6b4f]'
      : op === 'insert' ? 'bg-[#f3f0ff] text-[#5b21b6]'
        : 'bg-[#feeceb] text-[#a22828]'

  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide ${s}`}>
      {op}
    </span>
  )
}
