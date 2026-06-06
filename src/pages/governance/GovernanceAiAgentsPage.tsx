import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  MessageSquare,
  X,
  Filter,
  Fingerprint,
  ListOrdered,
  Loader2,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  UserRound,
  Workflow,
} from 'lucide-react'

import { PortalPage, PortalPanel } from '../../components/portal/PortalShell'
import { cn } from '../../lib/cn'
import { useUnmanagedAISystems } from '../../hooks/useUnmanagedAISystems'
import {
  executeAgent,
  fetchAgentExecution,
  type ExecuteAgentResponse,
  type SnowAISystem,
} from '../../services/serviceNow'

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
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Record<string, ChatSession>>({})

  const selectedAgent = systems.find((agent) => agent.sys_id === selectedAgentId) ?? null

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
              onChat={() => setSelectedAgentId(agent.sys_id)}
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

      <AgentChatDrawer
        agent={selectedAgent}
        session={selectedAgent ? sessions[selectedAgent.sys_id] : undefined}
        onClose={() => setSelectedAgentId(null)}
        onSessionChange={(agentId, session) =>
          setSessions((prev) => ({ ...prev, [agentId]: session }))
        }
      />
    </PortalPanel>
  )
}

function AgentCard({
  agent,
  open,
  onToggle,
  onChat,
}: {
  agent: SnowAISystem
  open: boolean
  onToggle: () => void
  onChat: () => void
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
      <div className="flex w-full items-center gap-4 px-4 py-3.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-4 text-left"
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

        <button
          type="button"
          onClick={onChat}
          className="inline-flex flex-shrink-0 items-center gap-2 rounded-md border border-[#cfe0ea] bg-white px-3 py-2 text-xs font-bold text-[#0f5f8c] transition-colors hover:border-[#0f5f8c] hover:bg-[#f5f9fb]"
        >
          <MessageSquare size={14} /> Chat
        </button>
      </div>

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

type ChatMessage = {
  id: string
  role: 'user' | 'agent' | 'error' | 'pending'
  text: string
  timestamp: string
}

type ChatSession = {
  messages: ChatMessage[]
  contextId?: string | null
  taskId?: string | null
  state?: string | null
  pending?: boolean
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const CALLBACK_POLL_INTERVAL_MS = 2000
const CALLBACK_POLL_TIMEOUT_MS = 60_000
const PENDING_AGENT_STATES = new Set(['accepted', 'submitted', 'working', 'running', 'pending'])

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

function isPendingExecution(response: ExecuteAgentResponse): boolean {
  const status = response.status?.toLowerCase()
  const state = response.state?.toLowerCase()
  return (
    status === 'pending' ||
    Boolean(state && PENDING_AGENT_STATES.has(state)) ||
    (!response.output && status !== 'completed' && status !== 'error')
  )
}

function replaceMessage(messages: ChatMessage[], id: string, next: ChatMessage): ChatMessage[] {
  return messages.map((message) => (message.id === id ? next : message))
}

function AgentChatDrawer({
  agent,
  session,
  onClose,
  onSessionChange,
}: {
  agent: SnowAISystem | null
  session?: ChatSession
  onClose: () => void
  onSessionChange: (agentId: string, session: ChatSession) => void
}) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const open = Boolean(agent)
  const activeSession = session ?? { messages: [] }
  const pending = Boolean(activeSession.pending)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeSession.messages.length, pending])

  if (!agent) return null

  const updateSession = (next: ChatSession) => onSessionChange(agent.sys_id, next)
  const canSend = input.trim().length > 0 && !pending

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSend) return

    const text = input.trim()
    const now = new Date().toISOString()
    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      text,
      timestamp: now,
    }
    const pendingMessage: ChatMessage = {
      id: newId(),
      role: 'pending',
      text: 'Waiting for ServiceNow callback...',
      timestamp: now,
    }
    const optimisticSession: ChatSession = {
      ...activeSession,
      messages: [...activeSession.messages, userMessage, pendingMessage],
      pending: true,
    }

    setInput('')
    updateSession(optimisticSession)

    try {
      const response = await executeAgent(agent.sys_id, text, activeSession.contextId, activeSession.taskId)
      let nextSession: ChatSession = {
        ...optimisticSession,
        contextId: response.context_id ?? optimisticSession.contextId,
        taskId: response.task_id ?? optimisticSession.taskId,
        state: response.state ?? optimisticSession.state,
      }
      let latest = response

      if (response.request_id && isPendingExecution(response)) {
        const deadline = Date.now() + CALLBACK_POLL_TIMEOUT_MS
        while (Date.now() < deadline) {
          await sleep(CALLBACK_POLL_INTERVAL_MS)
          latest = await fetchAgentExecution(response.request_id)
          nextSession = {
            ...nextSession,
            contextId: latest.context_id ?? nextSession.contextId,
            taskId: latest.task_id ?? nextSession.taskId,
            state: latest.state ?? nextSession.state,
          }
          if (!isPendingExecution(latest)) break
        }
      }

      if (isPendingExecution(latest)) {
        const timeoutMessage: ChatMessage = {
          id: pendingMessage.id,
          role: 'error',
          text: 'Timed out waiting for the ServiceNow callback. Try again in a moment.',
          timestamp: new Date().toISOString(),
        }
        updateSession({
          ...nextSession,
          messages: replaceMessage(optimisticSession.messages, pendingMessage.id, timeoutMessage),
          pending: false,
        })
        return
      }

      if (latest.status === 'error' || latest.error) {
        const errorMessage: ChatMessage = {
          id: pendingMessage.id,
          role: 'error',
          text: latest.error || latest.output || 'ServiceNow returned a callback error.',
          timestamp: new Date().toISOString(),
        }
        updateSession({
          ...nextSession,
          messages: replaceMessage(optimisticSession.messages, pendingMessage.id, errorMessage),
          pending: false,
        })
        return
      }

      const agentMessage: ChatMessage = {
        id: pendingMessage.id,
        role: 'agent',
        text: latest.output || 'Agent executed successfully.',
        timestamp: new Date().toISOString(),
      }
      updateSession({
        ...nextSession,
        messages: replaceMessage(optimisticSession.messages, pendingMessage.id, agentMessage),
        contextId: latest.context_id ?? nextSession.contextId,
        taskId: latest.task_id ?? nextSession.taskId,
        state: latest.state ?? nextSession.state,
        pending: false,
      })
    } catch (e) {
      const errorMessage: ChatMessage = {
        id: pendingMessage.id,
        role: 'error',
        text: e instanceof Error ? e.message : 'Failed to run the agent.',
        timestamp: new Date().toISOString(),
      }
      updateSession({
        ...optimisticSession,
        messages: replaceMessage(optimisticSession.messages, pendingMessage.id, errorMessage),
        pending: false,
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close chat drawer"
        onClick={onClose}
        className="absolute inset-0 bg-[#102033]/35"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col bg-white shadow-[-16px_0_42px_rgba(16,32,51,0.16)] max-[640px]:max-w-none">
        <header className="border-b border-[#e5eef3] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[9px] bg-[#143A57] text-white">
              <Bot size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-bold text-[#102033]">{agent.name || 'AI Agent'}</h2>
                <AgentTypeBadge type={agent.agent_type} />
              </div>
              <p className="mt-1 max-h-[42px] overflow-hidden text-sm leading-[1.45] text-[#53687b]">
                {agent.description || agent.display_name || 'No description'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md border border-[#dbe6ee] text-[#53687b] hover:bg-[#f5f9fb]"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs max-[640px]:grid-cols-1">
            <MetaPill label="Strategy" value={agent.strategy || '—'} />
            <MetaPill label="State" value={activeSession.state || 'new'} />
            <MetaPill label="Context" value={activeSession.contextId || 'not started'} mono />
            <MetaPill label="Task" value={activeSession.taskId || 'not started'} mono />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fbfc] px-5 py-5">
          {activeSession.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="max-w-[320px]">
                <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-[10px] bg-[#e7f3f8] text-[#0f5f8c]">
                  <MessageSquare size={20} />
                </div>
                <p className="text-sm leading-[1.6] text-[#53687b]">
                  Start a conversation with this ServiceNow AI agent.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSession.messages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-[#e5eef3] bg-white px-5 py-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={`Message ${agent.name || 'this agent'}…`}
              rows={2}
              className="min-h-[46px] flex-1 resize-none rounded-lg border border-[#dbe6ee] px-3.5 py-2.5 text-sm leading-[1.45] text-[#40566b] outline-none placeholder:text-[#9fb0c0] focus:border-[#0f5f8c] focus:ring-2 focus:ring-[#0f5f8c]/15"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
            />
            <button
              type="submit"
              disabled={!canSend}
              className={cn(
                'grid h-[46px] w-[46px] flex-shrink-0 place-items-center rounded-lg bg-[#143A57] text-white transition-opacity',
                !canSend ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90',
              )}
              aria-label="Send message"
            >
              {pending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'
  const isPending = message.role === 'pending'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[82%] whitespace-pre-wrap break-words rounded-lg px-3.5 py-2.5 text-sm leading-[1.55] shadow-sm',
          isUser && 'bg-[#143A57] text-white',
          !isUser && !isError && 'bg-white text-[#40566b]',
          isError && 'border border-red-200 bg-red-50 text-red-700',
          isPending && 'inline-flex items-center gap-2 text-[#53687b]',
        )}
      >
        {isPending && <Loader2 size={14} className="flex-shrink-0 animate-spin" />}
        {message.text}
      </div>
    </div>
  )
}

function MetaPill({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-md bg-[#f5f9fb] px-3 py-2">
      <div className="text-[0.62rem] font-bold uppercase tracking-[0.05em] text-[#8aa0b3]">{label}</div>
      <div className={cn('truncate text-xs text-[#40566b]', mono && 'font-mono')}>{value}</div>
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
