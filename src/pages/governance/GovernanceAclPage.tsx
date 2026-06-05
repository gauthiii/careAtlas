import {
  Activity,
  Bell,
  CalendarDays,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react'

import {
  PortalPage,
} from '../../components/portal/PortalShell'

import {
  nonHumanIdentities,
  type NonHumanIdentity,
} from '../../data/staffGovernanceData'

export function GovernanceAclPage() {
  return (
    <PortalPage
      label="AI Governance Officer"
      title="Non-Human Identities & ACL Configuration"
      intro="Service accounts operating as agents. All accounts are web-service-only and hold no direct roles — permissions are granted exclusively via group membership and ACL rules."
    >
      <section className="px-6 pb-6">
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {nonHumanIdentities.map((nhi) => (
            <NHICard key={nhi.userId} nhi={nhi} />
          ))}
        </div>
      </section>
    </PortalPage>
  )
}

const iconMap = { ShieldCheck, CalendarDays, Bell, ClipboardList, Activity }

function NHICard({ nhi }: { nhi: NonHumanIdentity }) {
  const Icon = iconMap[nhi.iconKey]

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
              <code className="rounded bg-[#eef3f7] px-2 py-0.5 font-mono text-[0.68rem] text-[#40566b] break-all">
                {nhi.userId}
              </code>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-slate-500">
                WS Only
              </span>
            </div>

            <div className="font-semibold text-[#102033]">
              {nhi.firstName} {nhi.lastName}
            </div>

            <div className="mt-1.5">
              <span
                className="rounded-full px-2.5 py-1 text-[0.7rem] font-semibold"
                style={{ backgroundColor: `${nhi.accentColor}18`, color: nhi.accentColor }}
              >
                {nhi.group}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#53687b]">
          {nhi.description}
        </p>
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
    </div>
  )
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
