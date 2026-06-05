import { useState, type ReactNode } from 'react'
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Filter,
  Fingerprint,
  ListOrdered,
  Loader2,
  Plus,
  ShieldAlert,
  Sparkles,
  UserRound,
  Workflow,
} from 'lucide-react'

import { PortalPage, PortalPanel } from '../../components/portal/PortalShell'
import { cn } from '../../lib/cn'
import { useUnmanagedAISystems } from '../../hooks/useUnmanagedAISystems'
import type { SnowAISystem } from '../../services/serviceNow'

export function GovernanceAiAgentsPage() {
  return (
    <PortalPage
      label="AI Governance Officer"
      title="AI Agents"
      intro="Agent records created in the ServiceNow AI Control Tower table sn_aia_agent since June 2, 2026. Expand an agent to inspect its strategy, role, proficiency and operating instructions."
    >
      <section className="min-w-0 px-6 pb-6">
        <AgentInventory />
      </section>
    </PortalPage>
  )
}

function AgentInventory() {
  const { systems, state, errorMsg } = useUnmanagedAISystems()
  const [open, setOpen] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const title =
    state === 'ok' ? `AI Agent Inventory — ${systems.length} agents` : 'AI Agent Inventory'

  return (
    <PortalPanel title={title} icon={<ShieldAlert size={18} />}>
      <p className="mb-4 text-xs text-[#53687b]">
        Agents created in ServiceNow AI Control Tower table{' '}
        <span className="font-semibold text-[#143A57]">sn_aia_agent</span> since June 2, 2026.
      </p>

      {state === 'loading' && (
        <div className="flex items-center gap-2 py-6 text-sm text-[#6b7c8f]">
          <Loader2 size={16} className="animate-spin" />
          Loading from ServiceNow…
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not reach ServiceNow AI Control Tower.{' '}
          {errorMsg && <span className="opacity-75">{errorMsg}</span>}
        </div>
      )}

      {state === 'empty' && (
        <div className="flex items-center justify-center rounded-lg bg-[#f5f9fb] px-4 py-6 text-center text-sm text-[#6b7c8f]">
          No AI agents found in ServiceNow.
        </div>
      )}

      {state === 'ok' && (
        <div className="space-y-3">
          {systems.map((agent) => (
            <AgentCard
              key={agent.sys_id}
              agent={agent}
              open={open.has(agent.sys_id)}
              onToggle={() => toggle(agent.sys_id)}
            />
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="inline-flex cursor-default items-center gap-2 rounded-md bg-[#143A57] px-4 py-2 text-white opacity-60">
          View all agents <ArrowRight size={16} />
        </button>
        <button className="inline-flex cursor-default items-center gap-2 rounded-md bg-[#143A57] px-4 py-2 text-white opacity-60">
          <Plus size={16} /> Register new agent
        </button>
      </div>
    </PortalPanel>
  )
}

function AgentCard({
  agent,
  open,
  onToggle,
}: {
  agent: SnowAISystem
  open: boolean
  onToggle: () => void
}) {
  const proficiency = parseBullets(agent.proficiency)
  const steps = parseSteps(agent.instructions)

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-[#e5eef3] bg-white transition-shadow',
        open ? 'shadow-[0_8px_24px_rgba(25,64,93,0.08)]' : 'hover:shadow-[0_4px_14px_rgba(25,64,93,0.06)]',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-4 py-3.5 text-left"
      >
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[9px] bg-[#143A57] text-white">
          <Bot size={18} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-[#102033]">{agent.name || '—'}</span>
            <AgentTypeBadge type={agent.agent_type} />
            {agent.strategy && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[0.68rem] font-bold text-indigo-600">
                <Workflow size={11} /> {agent.strategy}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-xs text-[#6b7c8f]">
            {agent.description || agent.display_name || 'No description'}
          </span>
        </span>

        <ChevronDown
          size={18}
          className={cn('flex-shrink-0 text-[#8aa0b3] transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="space-y-5 border-t border-[#eef3f7] px-4 py-4">
          {agent.role && (
            <DetailSection icon={<UserRound size={14} />} title="Role">
              <p className="break-words rounded-lg border-l-[3px] border-[#0f5f8c] bg-[#f5f9fb] px-3.5 py-3 text-sm leading-[1.6] text-[#40566b]">
                {agent.role}
              </p>
            </DetailSection>
          )}

          {agent.description && (
            <DetailSection icon={<Sparkles size={14} />} title="Description">
              <p className="break-words text-sm leading-[1.6] text-[#40566b]">{agent.description}</p>
            </DetailSection>
          )}

          {proficiency.length > 0 && (
            <DetailSection icon={<Check size={14} />} title="Proficiency">
              {proficiency.length > 1 ? (
                <ul className="space-y-2">
                  {proficiency.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-[1.55] text-[#40566b]">
                      <Check size={15} className="mt-0.5 flex-shrink-0 text-[#12805c]" />
                      <span className="min-w-0 break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-[1.6] text-[#40566b]">{proficiency[0]}</p>
              )}
            </DetailSection>
          )}

          {steps.length > 0 && (
            <DetailSection icon={<ListOrdered size={14} />} title="Instructions">
              {steps.length > 1 ? (
                <ol className="space-y-2.5">
                  {steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-[1.55] text-[#40566b]">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#143A57] text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="min-w-0 break-words">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm leading-[1.6] text-[#40566b]">{steps[0]}</p>
              )}
            </DetailSection>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-[#f8fbfc] px-4 py-3 max-[640px]:grid-cols-1">
            <MetaItem icon={<Fingerprint size={14} />} label="Display name" value={agent.display_name} mono />
            <MetaItem icon={<Workflow size={14} />} label="Strategy" value={agent.strategy} />
            <MetaItem icon={<Filter size={14} />} label="Condition" value={agent.condition} />
            <MetaItem icon={<Bot size={14} />} label="Agent type" value={agent.agent_type} />
          </div>
        </div>
      )}
    </div>
  )
}

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.06em] text-[#6b7c8f]">
        <span className="text-[#0f5f8c]">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  )
}

function MetaItem({
  icon,
  label,
  value,
  mono,
}: {
  icon: ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 flex-shrink-0 text-[#8aa0b3]">{icon}</span>
      <div className="min-w-0">
        <div className="text-[0.66rem] font-bold uppercase tracking-[0.05em] text-[#8aa0b3]">{label}</div>
        <div
          className={cn(
            'text-sm text-[#40566b] [overflow-wrap:anywhere]',
            mono && 'font-mono text-[0.8rem]',
          )}
        >
          {value || '—'}
        </div>
      </div>
    </div>
  )
}

function AgentTypeBadge({ type }: { type: string }) {
  const normalized = type.toLowerCase()
  const styles =
    normalized === 'internal'
      ? 'bg-[#e7f3f8] text-[#0f5f8c]'
      : normalized === 'external'
        ? 'bg-purple-100 text-purple-700'
        : 'bg-slate-100 text-slate-600'

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide', styles)}>
      {type || 'unknown'}
    </span>
  )
}

// Proficiency is stored as a single string with "- " bullet markers.
function parseBullets(text: string): string[] {
  return text
    .split(/\s*[-•]\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

// Instructions are stored as a single string with "1. 2. 3." step markers.
function parseSteps(text: string): string[] {
  return text
    .split(/\s*\d+\.\s+/)
    .map((step) => step.trim())
    .filter(Boolean)
}
