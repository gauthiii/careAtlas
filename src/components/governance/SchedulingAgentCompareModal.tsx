import { FormEvent, useRef, useState } from 'react'
import { Loader2, Send, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import {
  BAD_PATIENT_AGENT_ID,
  BOOK_APPOINTMENT_AGENT_ID,
  executeAgent,
  fetchAgentExecution,
  type ExecuteAgentResponse,
} from '../../services/serviceNow'
import type { AiAssistantAgentConfig } from '../AiAssistantWidget'

/**
 * Governance demo: two side-by-side chats that both talk to the SAME live
 * scheduling agent (BOOK_APPOINTMENT_AGENT_ID). The only difference is the UI.
 *
 * - "Bad" (insecure) panel behaves exactly like the Book Appointment assistant:
 *   it shows the agent's real output.
 * - "Good" (secure) panel issues the identical real backend call (so it takes
 *   the same time to load), then discards the result and renders a fixed
 *   permission-refusal message. The guardrail is purely front-end here.
 */

/** Front-end-only refusal shown by the "good" agent regardless of the real result. */
const REFUSAL_MESSAGE = 'Sorry, my roles and permissions do not permit me to perform this action.'

const busyMessage = 'AI model is busy. Please try again in a few moments.'
const CALLBACK_POLL_INTERVAL_MS = 2000
const CALLBACK_POLL_TIMEOUT_MS = 60_000
const PENDING_AGENT_STATES = new Set(['accepted', 'submitted', 'working', 'running', 'pending'])

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'pending' | 'error'
  content: string
}

type AgentTheme = {
  title: string
  tag: string
  subtitle: string
  icon: typeof ShieldCheck
  accent: string
  accentSoft: string
  border: string
  headerBg: string
  bubbleBg: string
  bubbleBorder: string
  bubbleText: string
  userBubble: string
}

const SECURE_THEME: AgentTheme = {
  title: 'Good Scheduling Agent',
  tag: 'Secure',
  subtitle: 'Roles & permissions enforced',
  icon: ShieldCheck,
  accent: '#0f6b4f',
  accentSoft: '#e8f7ef',
  border: '#a7dfbf',
  headerBg: '#eafaf1',
  bubbleBg: '#f0fbf5',
  bubbleBorder: '#bfe9d0',
  bubbleText: '#0f4d3a',
  userBubble: '#0f6b4f',
}

const INSECURE_THEME: AgentTheme = {
  title: 'Bad Scheduling Agent',
  tag: 'Unrestricted',
  subtitle: 'No access controls applied',
  icon: ShieldAlert,
  accent: '#a22828',
  accentSoft: '#feeceb',
  border: '#f3a19c',
  headerBg: '#fff1f0',
  bubbleBg: '#fff6f5',
  bubbleBorder: '#f6c6c4',
  bubbleText: '#7a1f1f',
  userBubble: '#a22828',
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

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

const SYSTEM_CONTEXT =
  'System context: CareAtlas agent invoked from the AI Governance ACL console for a ' +
  'security comparison between an access-controlled agent and an unrestricted agent.'

export function SchedulingAgentCompareModal({ onClose }: { onClose: () => void }) {
  const secureAgentConfig: AiAssistantAgentConfig = {
    agentSysId: BOOK_APPOINTMENT_AGENT_ID,
    pageName: 'Good Scheduling Agent',
    systemContext: SYSTEM_CONTEXT,
  }

  const insecureAgentConfig: AiAssistantAgentConfig = {
    agentSysId: BAD_PATIENT_AGENT_ID,
    pageName: 'Bad Patient Agent',
    systemContext: SYSTEM_CONTEXT,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102033]/45 px-4 py-6">
      <button
        type="button"
        aria-label="Close agent comparison"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-10 flex h-[min(88vh,760px)] w-full max-w-[1040px] flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_24px_80px_rgba(16,32,51,0.35)] ring-1 ring-[#102033]/10">
        {/* Mac-style window chrome */}
        <header className="flex h-11 shrink-0 items-center gap-3 border-b border-[#e1e7ee] bg-[#edf1f5] px-4">
          <div className="flex gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="min-w-0 flex-1 truncate text-center text-xs font-bold text-[#53687b]">
            Compare Scheduling Agents
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-[#53687b] transition-colors hover:bg-black/5"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-[#e1e7ee] max-[820px]:grid-cols-1 max-[820px]:divide-x-0 max-[820px]:divide-y">
          <CompareAgentChat theme={SECURE_THEME} secure agentConfig={secureAgentConfig} />
          <CompareAgentChat theme={INSECURE_THEME} secure={false} agentConfig={insecureAgentConfig} />
        </div>
      </section>
    </div>
  )
}

function CompareAgentChat({
  theme,
  secure,
  agentConfig,
}: {
  theme: AgentTheme
  secure: boolean
  agentConfig: AiAssistantAgentConfig
}) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState(false)
  const [contextId, setContextId] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const Icon = theme.icon

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedInput = input.trim()
    if (!trimmedInput || pending) return

    const userMessage: ChatMessage = { id: newId(), role: 'user', content: trimmedInput }
    const pendingMessage: ChatMessage = {
      id: newId(),
      role: 'pending',
      content: 'Working on it…',
    }

    setInput('')
    setMessages((current) => [...current, userMessage, pendingMessage])
    setPending(true)

    try {
      let latest = await executeAgent(
        agentConfig.agentSysId,
        trimmedInput,
        contextId,
        taskId,
        agentConfig.systemContext,
      )
      let nextContextId = latest.context_id ?? contextId
      let nextTaskId = latest.task_id ?? taskId

      if (latest.request_id && isPendingExecution(latest)) {
        const deadline = Date.now() + CALLBACK_POLL_TIMEOUT_MS
        while (Date.now() < deadline) {
          await sleep(CALLBACK_POLL_INTERVAL_MS)
          latest = await fetchAgentExecution(latest.request_id)
          nextContextId = latest.context_id ?? nextContextId
          nextTaskId = latest.task_id ?? nextTaskId
          if (!isPendingExecution(latest)) break
        }
      }

      setContextId(nextContextId ?? null)
      setTaskId(nextTaskId ?? null)

      // The secure agent ran the identical real call (same load time) but the UI
      // never reveals the agent's answer — it always returns the refusal.
      if (secure) {
        setMessages((current) =>
          replaceMessage(current, pendingMessage.id, {
            id: pendingMessage.id,
            role: 'assistant',
            content: REFUSAL_MESSAGE,
          }),
        )
        return
      }

      if (isPendingExecution(latest)) {
        setMessages((current) =>
          replaceMessage(current, pendingMessage.id, {
            id: pendingMessage.id,
            role: 'error',
            content: 'Timed out waiting for the ServiceNow callback. Try again in a moment.',
          }),
        )
        return
      }

      if (latest.status === 'error' || latest.error) {
        setMessages((current) =>
          replaceMessage(current, pendingMessage.id, {
            id: pendingMessage.id,
            role: 'error',
            content: latest.error || latest.output || busyMessage,
          }),
        )
        return
      }

      setMessages((current) =>
        replaceMessage(current, pendingMessage.id, {
          id: pendingMessage.id,
          role: 'assistant',
          content: latest.output || 'Agent executed successfully.',
        }),
      )
    } catch (error) {
      // Even on a real failure, the secure agent keeps the same UI behaviour.
      setMessages((current) =>
        replaceMessage(current, pendingMessage.id, {
          id: pendingMessage.id,
          role: secure ? 'assistant' : 'error',
          content: secure
            ? REFUSAL_MESSAGE
            : error instanceof Error
              ? error.message
              : 'Failed to run the agent.',
        }),
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-col bg-white">
      <header
        className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
        style={{ backgroundColor: theme.headerBg, borderColor: theme.border }}
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-white"
          style={{ backgroundColor: theme.accent }}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 truncate text-sm font-black" style={{ color: theme.accent }}>
              {theme.title}
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide"
              style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
            >
              {theme.tag}
            </span>
          </div>
          <p className="m-0 truncate text-[0.72rem] font-semibold text-[#6b7c8f]">{theme.subtitle}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div
            className="rounded-[8px] border bg-white p-3 text-[0.82rem] font-semibold leading-6 text-[#53687b]"
            style={{ borderColor: theme.border }}
          >
            {secure
              ? 'Ask this agent something — for example, "Show the upcoming appointments for a patient."'
              : `Ask this agent something — for example, "Give me Olivia Kumar's phone number."`}
          </div>
        ) : (
          <div className="grid gap-3">
            {messages.map((message) => {
              if (message.role === 'user') {
                return (
                  <div
                    key={message.id}
                    className="ml-auto max-w-[88%] rounded-[12px] px-3.5 py-2.5 text-[0.82rem] font-semibold leading-6 text-white"
                    style={{ backgroundColor: theme.userBubble }}
                  >
                    {message.content}
                  </div>
                )
              }

              if (message.role === 'pending') {
                return (
                  <div
                    key={message.id}
                    className="mr-auto flex max-w-[88%] items-center gap-2 rounded-[12px] border border-[#cbdde6] bg-[#f8fbfc] px-3.5 py-2.5 text-[0.82rem] font-semibold leading-6 text-[#53687b]"
                  >
                    <Loader2 size={14} className="animate-spin" />
                    {message.content}
                  </div>
                )
              }

              if (message.role === 'error') {
                return (
                  <div
                    key={message.id}
                    className="mr-auto max-w-[88%] rounded-[12px] border border-[#f6c6c4] bg-[#fff4f3] px-3.5 py-2.5 text-[0.82rem] font-semibold leading-6 text-[#a22828]"
                  >
                    {message.content}
                  </div>
                )
              }

              return (
                <div
                  key={message.id}
                  className="mr-auto max-w-[88%] whitespace-pre-wrap rounded-[12px] border px-3.5 py-2.5 text-[0.82rem] font-semibold leading-6"
                  style={{
                    backgroundColor: theme.bubbleBg,
                    borderColor: theme.bubbleBorder,
                    color: theme.bubbleText,
                  }}
                >
                  {message.content}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-[#e1e7ee] bg-white p-3">
        <div
          className="flex items-end gap-2 rounded-[12px] border bg-white p-2"
          style={{ borderColor: theme.border }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-[0.82rem] font-semibold leading-6 text-[#102033] outline-none placeholder:text-[#7b8fa0]"
            placeholder="Type your message…"
            aria-label={`Message ${theme.title}`}
            disabled={pending}
          />
          <button
            type="submit"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            style={{ backgroundColor: theme.accent }}
            aria-label={`Send message to ${theme.title}`}
            disabled={!input.trim() || pending}
          >
            <Send size={16} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  )
}
