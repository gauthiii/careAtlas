import { FormEvent, useState } from 'react'
import { CheckCircle2, Lock, Send, ShieldCheck, UserCog, XCircle } from 'lucide-react'
import { isHighImpactIntent } from '../../data/useCaseDemoData'
import { governanceDisplayName, useGovernanceAuth } from '../../contexts/GovernanceAuthContext'
import { DemoTag } from './DemoTag'

type Stage = 'idle' | 'pending' | 'approved' | 'denied' | 'autoCompleted'

const HINTS = ['Approve the registration for the new patient', 'Write a clinical note for appointment A-2291']

/**
 * UC2 · Risk — human-approval gate for excessive agency.
 * High-impact intents stop at status=pending_approval until a governance
 * officer approves; the decision log records who approved.
 */
export function ApprovalGateDemo() {
  const { user } = useGovernanceAuth()
  const approver = governanceDisplayName(user)
  const [input, setInput] = useState(HINTS[0])
  const [intent, setIntent] = useState('')
  const [stage, setStage] = useState<Stage>('idle')

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setIntent(text)
    setStage(isHighImpactIntent(text) ? 'pending' : 'autoCompleted')
  }

  return (
    <section className="rounded-xl border border-[#d7e5ec] bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#eef3f7] text-[#40566b]">
            <Lock size={18} />
          </span>
          <div>
            <h3 className="m-0 text-sm font-bold text-[#102033]">Action requires approval</h3>
            <p className="m-0 text-[11px] font-semibold text-[#53687b]">
              UC2 · Risk · OWASP LLM06 — human gate on high-impact agent intents
            </p>
          </div>
        </div>
        <DemoTag />
      </div>

      <form onSubmit={submit}>
        <div className="flex items-end gap-2 rounded-lg border border-[#cbdde6] bg-white p-2 focus-within:border-[#0f5f8c]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-1 text-sm text-[#102033] outline-none"
            placeholder="Ask the agent to perform an action…"
            aria-label="Agent action request"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#0f5f8c] text-white hover:bg-[#143A57] disabled:opacity-45"
            aria-label="Send"
          >
            <Send size={15} />
          </button>
        </div>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {HINTS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => {
              setInput(h)
              setStage('idle')
            }}
            className="rounded-full border border-[#cbdde6] bg-slate-50 px-2.5 py-1 text-[10.5px] font-semibold text-[#53687b] hover:bg-slate-100"
          >
            {h.length > 38 ? `${h.slice(0, 38)}…` : h}
          </button>
        ))}
      </div>

      {stage === 'autoCompleted' && (
        <div className="mt-4 rounded-lg border border-[#a7dfbf] bg-[#f0fbf5] p-3 text-xs font-semibold text-[#0f6b4f]">
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck size={15} /> Completed
          </div>
          <p className="m-0 mt-1">Low-impact intent — the agent executed within its scope. No human gate required.</p>
        </div>
      )}

      {stage === 'pending' && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <UserCog size={16} /> status: pending_approval
          </div>
          <p className="m-0 mt-1 text-xs font-semibold text-amber-800">
            High-impact intent “{intent}” stopped at <code>/agents/execute</code>. A governance officer must approve.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setStage('approved')}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0f6b4f] px-3 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              <CheckCircle2 size={14} /> Approve
            </button>
            <button
              type="button"
              onClick={() => setStage('denied')}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#f3a19c] bg-white px-3 py-2 text-xs font-bold text-[#a22828] hover:bg-[#fff4f3]"
            >
              <XCircle size={14} /> Deny
            </button>
          </div>
        </div>
      )}

      {stage === 'approved' && (
        <div className="mt-4 rounded-lg border border-[#a7dfbf] bg-[#f0fbf5] p-3 text-xs font-semibold text-[#0f6b4f]">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={15} /> Approved & executed
          </div>
          <p className="m-0 mt-1">
            Decision log records the approver: <b>{approver}</b>. Action “{intent}” proceeded with a human in the loop.
          </p>
        </div>
      )}

      {stage === 'denied' && (
        <div className="mt-4 rounded-lg border border-[#f3a19c] bg-[#fff4f3] p-3 text-xs font-semibold text-[#a22828]">
          <div className="flex items-center gap-2 font-bold">
            <XCircle size={15} /> Denied
          </div>
          <p className="m-0 mt-1">
            Action “{intent}” was rejected by <b>{approver}</b>. The agent never executed it — blast radius contained.
          </p>
        </div>
      )}
    </section>
  )
}
