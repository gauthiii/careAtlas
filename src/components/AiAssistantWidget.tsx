import { FormEvent, useRef, useState } from 'react'
import { Send, Sparkles, X } from 'lucide-react'
import { executeAgent, fetchAgentExecution, type ExecuteAgentResponse } from '../services/serviceNow'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'pending' | 'error'
  content: string
}

export type AiAssistantAgentConfig = {
  agentSysId: string
  pageName: string
  systemContext?: string | null
}

const busyMessage = 'AI model is busy. Please try again in a few moments.'
const CALLBACK_POLL_INTERVAL_MS = 2000
const CALLBACK_POLL_TIMEOUT_MS = 60_000
const PENDING_AGENT_STATES = new Set(['accepted', 'submitted', 'working', 'running', 'pending'])

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

export function AiAssistantWidget({ agentConfig }: { agentConfig?: AiAssistantAgentConfig | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState(false)
  const [contextId, setContextId] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const sessionVersionRef = useRef(0)

  function openAssistant() {
    setIsOpen(true)
  }

  function closeAssistant() {
    sessionVersionRef.current += 1
    setIsOpen(false)
    setInput('')
    setMessages([])
    setPending(false)
    setContextId(null)
    setTaskId(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedInput = input.trim()
    if (!trimmedInput || pending) return

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      content: trimmedInput,
    }

    setInput('')

    if (!agentConfig) {
      setMessages((currentMessages) => [
        ...currentMessages,
        userMessage,
        {
          id: newId(),
          role: 'assistant',
          content: busyMessage,
        },
      ])
      return
    }

    const pendingMessage: ChatMessage = {
      id: newId(),
      role: 'pending',
      content: `Waiting for ${agentConfig.pageName} assistant...`,
    }
    const sessionVersion = sessionVersionRef.current
    const optimisticMessages = [...messages, userMessage, pendingMessage]
    setMessages(optimisticMessages)
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
          if (sessionVersion !== sessionVersionRef.current) return
          nextContextId = latest.context_id ?? nextContextId
          nextTaskId = latest.task_id ?? nextTaskId
          if (!isPendingExecution(latest)) break
        }
      }

      if (sessionVersion !== sessionVersionRef.current) return

      setContextId(nextContextId ?? null)
      setTaskId(nextTaskId ?? null)

      if (isPendingExecution(latest)) {
        setMessages((currentMessages) =>
          replaceMessage(currentMessages, pendingMessage.id, {
            id: pendingMessage.id,
            role: 'error',
            content: 'Timed out waiting for the ServiceNow callback. Try again in a moment.',
          }),
        )
        return
      }

      if (latest.status === 'error' || latest.error) {
        setMessages((currentMessages) =>
          replaceMessage(currentMessages, pendingMessage.id, {
            id: pendingMessage.id,
            role: 'error',
            content: latest.error || latest.output || 'ServiceNow returned a callback error.',
          }),
        )
        return
      }

      setMessages((currentMessages) =>
        replaceMessage(currentMessages, pendingMessage.id, {
          id: pendingMessage.id,
          role: 'assistant',
          content: latest.output || 'Agent executed successfully.',
        }),
      )
    } catch (error) {
      if (sessionVersion !== sessionVersionRef.current) return
      setMessages((currentMessages) =>
        replaceMessage(currentMessages, pendingMessage.id, {
          id: pendingMessage.id,
          role: 'error',
          content: error instanceof Error ? error.message : 'Failed to run the agent.',
        }),
      )
    } finally {
      if (sessionVersion === sessionVersionRef.current) setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openAssistant}
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-[#143A57] text-white shadow-[0_16px_36px_rgba(20,58,87,0.28)] transition hover:-translate-y-0.5 hover:bg-[#0f5f8c] focus:outline-none focus:ring-4 focus:ring-[#86d8e6]/45 max-[720px]:bottom-4 max-[720px]:right-4"
        aria-label="Open AI assistant"
      >
        <Sparkles size={24} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#102033]/20 backdrop-blur-[2px]">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close AI assistant"
            onClick={closeAssistant}
          />

          <aside
            className="relative flex h-full w-[min(420px,100vw)] flex-col border-l border-[#d7e5ec] bg-white shadow-[0_20px_60px_rgba(16,32,51,0.22)]"
            aria-label="AI assistant chat"
          >
            <header className="flex items-center justify-between gap-4 border-b border-[#d7e5ec] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#e9fbfd] text-[#0f5f8c]">
                  <Sparkles size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="m-0 text-base font-black text-[#102033]">CareAtlas Assistant</h2>
                  <p className="m-0 text-sm font-semibold text-[#53687b]">
                    {agentConfig ? `${agentConfig.pageName} assistant` : 'How may I help you today?'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAssistant}
                className="grid h-9 w-9 place-items-center rounded-[8px] border border-[#d7e5ec] bg-white text-[#53687b] transition hover:border-[#b7ceda] hover:text-[#102033] focus:outline-none focus:ring-4 focus:ring-[#86d8e6]/35"
                aria-label="Close AI assistant"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {messages.length === 0 ? (
                <div className="rounded-[8px] border border-[#d7e5ec] bg-[#f8fbfc] p-4 text-sm font-semibold leading-6 text-[#53687b]">
                  {/* Start a chat and I will route it to the assistant once the backend is connected. */}
                  {agentConfig
                    ? `How can I help with ${agentConfig.pageName.toLowerCase()} today?`
                    : "How can I help you today? Ask me anything about CareAtlas, and I'll do my best to assist you!"}
                </div>
              ) : (
                <div className="grid gap-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={[
                        'max-w-[86%] rounded-[12px] px-4 py-3 text-sm font-semibold leading-6',
                        message.role === 'user'
                          ? 'ml-auto bg-[#143A57] text-white'
                          : message.role === 'error'
                            ? 'mr-auto border border-[#f6c6c4] bg-[#fff4f3] text-[#a22828]'
                            : message.role === 'pending'
                              ? 'mr-auto border border-[#cbdde6] bg-[#f8fbfc] text-[#53687b]'
                              : 'mr-auto border border-[#d7e5ec] bg-[#f8fbfc] text-[#102033]',
                      ].join(' ')}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-[#d7e5ec] bg-white p-4">
              <div className="flex items-end gap-2 rounded-[12px] border border-[#b7ceda] bg-white p-2 focus-within:border-[#0f5f8c] focus-within:ring-4 focus-within:ring-[#86d8e6]/30">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={2}
                  className="min-h-[48px] flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm font-semibold leading-6 text-[#102033] outline-none placeholder:text-[#7b8fa0]"
                  placeholder="Type your message..."
                  aria-label="Chat message"
                  disabled={pending}
                />
                <button
                  type="submit"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px] bg-[#0f5f8c] text-white transition hover:bg-[#143A57] disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="Send message"
                  disabled={!input.trim() || pending}
                >
                  <Send size={17} aria-hidden="true" />
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  )
}
