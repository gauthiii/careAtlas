import { ArrowRight, Loader2, Plus, ShieldAlert } from 'lucide-react'

import { PortalPage, PortalPanel } from '../../components/portal/PortalShell'
import { useUnmanagedAISystems } from '../../hooks/useUnmanagedAISystems'
import type { SnowAISystem } from '../../services/serviceNow'

export function GovernanceAiAgentsPage() {
  return (
    <PortalPage
      label="AI Governance Officer"
      title="AI Agents"
      intro="Most recent agent records from the ServiceNow AI Control Tower table sn_aia_agent."
    >
      <section className="px-6 pb-6">
        <UnmanagedAISystemsCard />
      </section>
    </PortalPage>
  )
}

function UnmanagedAISystemsCard() {
  const { systems, state, errorMsg } = useUnmanagedAISystems()

  return (
    <PortalPanel
      title="AI Agent Inventory — Latest 10"
      icon={<ShieldAlert size={18} />}
      className="flex h-[520px] flex-col"
    >
      <p className="mb-4 flex-shrink-0 text-xs text-[#53687b]">
        Most recent agent records from ServiceNow AI Control Tower table{' '}
        <span className="font-semibold text-[#143A57]">sn_aia_agent</span>.
      </p>

      {state === 'loading' && (
        <div className="flex flex-1 items-center gap-2 py-6 text-sm text-[#6b7c8f]">
          <Loader2 size={16} className="animate-spin" />
          Loading from ServiceNow…
        </div>
      )}

      {state === 'error' && (
        <div className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not reach ServiceNow AI Control Tower.{' '}
          {errorMsg && <span className="opacity-75">{errorMsg}</span>}
        </div>
      )}

      {state === 'empty' && (
        <div className="flex flex-1 items-center justify-center rounded-lg bg-[#f5f9fb] px-4 py-6 text-center text-sm text-[#6b7c8f]">
          No AI agents found in ServiceNow.
        </div>
      )}

      {state === 'ok' && (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <table className="w-full border-separate border-spacing-y-3 text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-[0.06em] text-[#6b7c8f]">
                <th className="pb-1">Agent name</th>
                <th className="pb-1">Agent type</th>
                {/* <th className="pb-1">Role</th> */}
                <th className="pb-1">Description</th>
                <th className="pb-1">Active</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((s: SnowAISystem) => {
                const activeState = getAgentActiveState(s.active)

                return (
                  <tr
                    key={s.sys_id}
                    className="rounded-lg odd:bg-[#f8fbfc]"
                  >
                    <td className="py-1.5 pr-3 font-medium">{s.name || '—'}</td>
                    <td className="py-1.5 pr-3 text-[#40566b]">{s.agent_type || '—'}</td>
                    {/* <td className="py-1.5 pr-3 text-[#40566b]">{s.role || '—'}</td> */}
                    <td className="max-w-[360px] py-1.5 pr-3 text-[#40566b]">
                      {s.description || '—'}
                    </td>
                    <td className="py-1.5">
                      <Badge
                        success={activeState === 'active'}
                        danger={activeState === 'inactive'}
                      >
                        {activeState === 'active'
                          ? 'Active'
                          : activeState === 'inactive'
                            ? 'Inactive'
                            : 'Unknown'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 flex flex-shrink-0 gap-3">
        <button className="bg-[#143A57] text-white px-4 py-2 rounded-md inline-flex items-center gap-2 opacity-60 cursor-default">
          View all agents <ArrowRight size={16} />
        </button>
        <button className="bg-[#143A57] text-white px-4 py-2 rounded-md inline-flex items-center gap-2 opacity-60 cursor-default">
          <Plus size={16} /> Register new agent
        </button>
      </div>
    </PortalPanel>
  )
}

function getAgentActiveState(active: string): 'active' | 'inactive' | 'unknown' {
  const normalized = active.toLowerCase()

  if (['true', 'yes', 'active'].includes(normalized)) return 'active'
  if (['false', 'no', 'inactive'].includes(normalized)) return 'inactive'

  return 'unknown'
}

function Badge({
  children,
  success,
  warning,
  danger,
}: any) {
  const styles = success
    ? 'bg-green-100 text-green-700'
    : warning
      ? 'bg-amber-100 text-amber-700'
      : danger
        ? 'bg-red-100 text-red-700'
        : 'bg-slate-100 text-slate-700'

  return (
    <span className={`rounded-full px-2 py-1 text-xs ${styles}`}>
      {children}
    </span>
  )
}
