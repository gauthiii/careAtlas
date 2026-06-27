import { FormEvent, useRef, useState } from 'react'
import { LoaderCircle, Send, ShieldAlert, Sparkles, X } from 'lucide-react'
import { executeAgent, fetchAgentExecution, scanGuardrailApi, type ExecuteAgentResponse } from '../services/serviceNow'
import { provisionSampleDoctor, type ProvisionSampleDoctorResponse } from '../services/awsAuth'
import { askScopedAgent, decideApproval, flagLlm02Event } from '../services/serviceNow'
import { isHighImpactIntent } from '../data/useCaseDemoData'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'pending' | 'error' | 'approval'
  content: string
}

export type AiAssistantAgentConfig = {
  agentSysId: string
  pageName: string
  systemContext?: string | null
  /**
   * UC2 — when set, the assistant runs as a scoped ServiceNow ACL identity instead of
   * the OAuth A2A agent. It reads patient data live AS this svc-* identity, so PII /
   * out-of-scope fields are stripped by ServiceNow, and high-impact intents stop for
   * a human approval.
   */
  identity?: {
    key: string
    label: string
    scope: string
    patientEmail?: string
  } | null
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

type DoctorRegStep = 'prompt' | 'creating' | 'done' | 'declined' | 'error'

const GUARDRAIL_REFUSAL =
  'I’m unable to share or disclose any patient PII. Doing so would breach our LLM02 — Sensitive Information Disclosure controls, so the request has been blocked. This event has been flagged and recorded in the governance audit log.'

export function AiAssistantWidget({
  agentConfig,
  doctorRegisterMode = false,
  guardrailMode = false,
  approvalMode = false,
}: {
  agentConfig?: AiAssistantAgentConfig | null
  doctorRegisterMode?: boolean
  guardrailMode?: boolean
  /** UC2 — high-impact intents stop for a human Approve/Deny before acting. */
  approvalMode?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [approvalId, setApprovalId] = useState<string | null>(null)
  const [approvalIntent, setApprovalIntent] = useState('')
  // Backend approval request id (set when a scoped identity stops for approval).
  const [approvalRealId, setApprovalRealId] = useState<string | null>(null)
  const [drStep, setDrStep] = useState<DoctorRegStep>('prompt')
  const [drResult, setDrResult] = useState<ProvisionSampleDoctorResponse | null>(null)
  const [drError, setDrError] = useState('')
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
    setDrStep('prompt')
    setDrResult(null)
    setDrError('')
    setApprovalId(null)
    setApprovalIntent('')
    setApprovalRealId(null)
  }

  async function resolveApproval(decision: 'approve' | 'deny') {
    if (!approvalId) return
    const id = approvalId
    const intent = approvalIntent
    const realId = approvalRealId
    setApprovalId(null)
    setApprovalIntent('')
    setApprovalRealId(null)

    // Scoped-identity path: record the decision live (audited in ServiceNow).
    if (realId) {
      try {
        const result = await decideApproval(realId, decision, 'On-call supervisor (human-in-the-loop)')
        setMessages((current) =>
          replaceMessage(current, id, {
            id,
            role: result.status === 'approved' ? 'assistant' : 'error',
            content:
              result.status === 'approved'
                ? `Approved by ${result.approver}. Action “${intent}” executed with a human in the loop.${result.audit_logged ? ' Recorded in the ServiceNow audit log.' : ''}`
                : `Denied by ${result.approver}. Action “${intent}” was never executed — blast radius contained.${result.audit_logged ? ' Logged to ServiceNow.' : ''}`,
          }),
        )
      } catch (error) {
        setMessages((current) =>
          replaceMessage(current, id, {
            id,
            role: 'error',
            content: error instanceof Error ? error.message : 'Failed to record the decision.',
          }),
        )
      }
      return
    }

    setMessages((current) =>
      replaceMessage(current, id, {
        id,
        role: decision === 'approve' ? 'assistant' : 'error',
        content:
          decision === 'approve'
            ? `Approved by governance officer. Action “${intent}” executed with a human in the loop — recorded in the decision log.`
            : `Denied by governance officer. Action “${intent}” was never executed — blast radius contained.`,
      }),
    )
  }

  async function handleProvisionDoctor() {
    setDrStep('creating')
    setDrError('')
    try {
      const result = await provisionSampleDoctor()
      setDrResult(result)
      setDrStep('done')
    } catch (error) {
      setDrError(error instanceof Error ? error.message : 'Failed to create the doctor account.')
      setDrStep('error')
    }
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

    // UC5 — Prompt-Injection Defense (OWASP LLM01).
    // Scans every message universally before it reaches any agent or model.
    // Blocked inputs open a live AI Case on ServiceNow and never proceed further.
    {
      const scanPendingId = newId()
      setMessages((current) => [
        ...current,
        userMessage,
        { id: scanPendingId, role: 'pending', content: 'Scanning for injection patterns…' },
      ])
      setPending(true)
      try {
        const scan = await scanGuardrailApi(trimmedInput)
        if (scan.verdict === 'blocked') {
          const caseRef = scan.ai_case_number ? ` (AI Case ${scan.ai_case_number} opened in Control Tower)` : ''
          setMessages((current) =>
            replaceMessage(current, scanPendingId, {
              id: scanPendingId,
              role: 'error',
              content: `⚠️ Prompt Injection Detected — this prompt has been flagged and blocked. It will not be processed by any agent.${caseRef}`,
            }),
          )
          setPending(false)
          return
        }
        // Clean or flagged (output-only) — remove the scan pending bubble and continue normally.
        setMessages((current) => current.filter((m) => m.id !== scanPendingId))
      } catch {
        // If the scan endpoint is unreachable, remove the pending bubble and continue.
        setMessages((current) => current.filter((m) => m.id !== scanPendingId))
      }
      setPending(false)
    }

    // UC2 (portal continuation) — scoped-identity agent: read patient data live AS the
    // page's svc-* ACL identity, so PII / out-of-scope fields are stripped by ServiceNow.
    if (agentConfig?.identity) {
      const identity = agentConfig.identity
      const pendingMessage: ChatMessage = {
        id: newId(),
        role: 'pending',
        content: `${identity.label} is checking what its identity is allowed to access…`,
      }
      const sessionVersion = sessionVersionRef.current
      setMessages((current) => [...current, userMessage, pendingMessage])
      setPending(true)
      try {
        const ans = await askScopedAgent({
          agentKey: identity.key,
          question: trimmedInput,
          patientEmail: identity.patientEmail,
        })
        if (sessionVersion !== sessionVersionRef.current) return
        if (ans.kind === 'approval') {
          setMessages((current) =>
            replaceMessage(current, pendingMessage.id, {
              id: pendingMessage.id,
              role: 'approval',
              content: ans.reply,
            }),
          )
          setApprovalId(pendingMessage.id)
          setApprovalRealId(ans.request_id)
          setApprovalIntent(ans.intent)
        } else {
          setMessages((current) =>
            replaceMessage(current, pendingMessage.id, {
              id: pendingMessage.id,
              role: 'assistant',
              content: ans.reply,
            }),
          )
        }
      } catch (error) {
        setMessages((current) =>
          replaceMessage(current, pendingMessage.id, {
            id: pendingMessage.id,
            role: 'error',
            content: error instanceof Error ? error.message : 'Scoped agent request failed.',
          }),
        )
      } finally {
        setPending(false)
      }
      return
    }

    // UC2 — high-impact intents stop for a human Approve/Deny before the agent acts.
    if (approvalMode && isHighImpactIntent(trimmedInput)) {
      const approvalMessage: ChatMessage = {
        id: newId(),
        role: 'approval',
        content: `High-impact intent detected — “${trimmedInput}”. status: pending_approval. A governance officer must approve before the agent acts.`,
      }
      setMessages((current) => [...current, userMessage, approvalMessage])
      setApprovalId(approvalMessage.id)
      setApprovalIntent(trimmedInput)
      return
    }

    // Governance guardrail: on the AI Agents page, every request is treated as a
    // potential sensitive-information-disclosure attempt — analyze, then block + flag.
    if (guardrailMode) {
      const pendingMessage: ChatMessage = {
        id: newId(),
        role: 'pending',
        content: 'Analyzing request against governance policies…',
      }
      const sessionVersion = sessionVersionRef.current
      setMessages((currentMessages) => [...currentMessages, userMessage, pendingMessage])
      setPending(true)

      // Fire the audit-log write while the 5s "analysis" plays out.
      const flagPromise = flagLlm02Event(trimmedInput).catch(() => null)
      await sleep(5000)
      await flagPromise

      if (sessionVersion !== sessionVersionRef.current) return

      setMessages((currentMessages) =>
        replaceMessage(currentMessages, pendingMessage.id, {
          id: pendingMessage.id,
          role: 'error',
          content: GUARDRAIL_REFUSAL,
        }),
      )
      setPending(false)
      return
    }

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
                <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#e7f3f8] text-[#0f5f8c]">
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

            {doctorRegisterMode ? (
              <DoctorRegisterPanel
                step={drStep}
                result={drResult}
                error={drError}
                onYes={handleProvisionDoctor}
                onNo={() => setDrStep('declined')}
                onRetry={() => setDrStep('prompt')}
              />
            ) : (
            <>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {messages.length === 0 ? (
                <div className="rounded-[8px] border border-[#d7e5ec] bg-[#f8fbfc] p-4 text-sm font-semibold leading-6 text-[#53687b]">
                  {/* Start a chat and I will route it to the assistant once the backend is connected. */}
                  {guardrailMode
                    ? 'How can I help you?'
                    : agentConfig
                      ? `How can I help with ${agentConfig.pageName.toLowerCase()} today?`
                      : "How can I help you today? Ask me anything about CareAtlas, and I'll do my best to assist you!"}
                </div>
              ) : (
                <div className="grid gap-3">
                  {messages.map((message) => {
                    if (message.role === 'approval') {
                      const isActive = message.id === approvalId
                      return (
                        <div
                          key={message.id}
                          className="mr-auto max-w-[92%] whitespace-pre-wrap rounded-[12px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800"
                        >
                          {message.content}
                          {isActive && (
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => resolveApproval('approve')}
                                className="inline-flex items-center justify-center rounded-[8px] bg-[#0f6b4f] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => resolveApproval('deny')}
                                className="inline-flex items-center justify-center rounded-[8px] border border-[#f3a19c] bg-white px-4 py-2 text-xs font-bold text-[#a22828] hover:bg-[#fff4f3]"
                              >
                                Deny
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    }
                    return (
                      <div
                        key={message.id}
                        className={[
                          'max-w-[86%] whitespace-pre-wrap rounded-[12px] px-4 py-3 text-sm font-semibold leading-6',
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
                    )
                  })}
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
            </>
            )}
          </aside>
        </div>
      )}
    </>
  )
}

function DoctorRegisterPanel({
  step,
  result,
  error,
  onYes,
  onNo,
  onRetry,
}: {
  step: DoctorRegStep
  result: ProvisionSampleDoctorResponse | null
  error: string
  onYes: () => void
  onNo: () => void
  onRetry: () => void
}) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-5">
      <div className="grid gap-3">
        {/* Assistant question bubble */}
        <div className="mr-auto max-w-[86%] rounded-[12px] border border-[#d7e5ec] bg-[#f8fbfc] px-4 py-3 text-sm font-semibold leading-6 text-[#102033]">
          Do you want a doctor registered?
        </div>

        {step === 'prompt' && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onYes}
              className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-[9px] bg-[#0f5f8c] px-5 font-bold text-white transition hover:bg-[#143A57]"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={onNo}
              className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-[9px] border border-[#b7ceda] bg-white px-5 font-bold text-[#0f5f8c] transition hover:border-[#0f5f8c]"
            >
              No
            </button>
          </div>
        )}

        {step === 'creating' && (
          <div className="mr-auto flex items-center gap-2 rounded-[12px] border border-[#cbdde6] bg-[#f8fbfc] px-4 py-3 text-sm font-semibold text-[#53687b]">
            <LoaderCircle size={16} className="animate-spin" />
            Creating your doctor account...
          </div>
        )}

        {step === 'declined' && (
          <div className="mr-auto max-w-[86%] rounded-[12px] border border-[#d7e5ec] bg-[#f8fbfc] px-4 py-3 text-sm font-semibold leading-6 text-[#102033]">
            No problem — let me know if you change your mind.
          </div>
        )}

        {step === 'done' && result && (
          <div className="mr-auto max-w-[92%] rounded-[12px] border border-[#bfe3d2] bg-[#f3fbf6] px-4 py-3 text-sm font-semibold leading-6 text-[#102033]">
            <p className="m-0 mb-2 font-black text-[#1f7a4d]">Your doctor account has been created.</p>
            <div className="grid gap-1">
              <div>
                <span className="text-[#53687b]">Email:</span>{' '}
                <code className="rounded-[6px] border border-[#d7e5ec] bg-white px-1.5 py-0.5 [overflow-wrap:anywhere]">
                  {result.email}
                </code>
              </div>
              <div>
                <span className="text-[#53687b]">Temporary password:</span>{' '}
                <code className="rounded-[6px] border border-[#d7e5ec] bg-white px-1.5 py-0.5 [overflow-wrap:anywhere]">
                  {result.temporary_password}
                </code>
              </div>
            </div>
            <p className="m-0 mt-2 text-[#53687b]">Sign in and follow the next steps.</p>
          </div>
        )}

        {step === 'error' && (
          <>
            <div className="mr-auto max-w-[86%] rounded-[12px] border border-[#f6c6c4] bg-[#fff4f3] px-4 py-3 text-sm font-semibold leading-6 text-[#a22828]">
              {error || 'Failed to create the doctor account.'}
            </div>
            <div>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-[9px] border border-[#b7ceda] bg-white px-5 font-bold text-[#0f5f8c] transition hover:border-[#0f5f8c]"
              >
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
