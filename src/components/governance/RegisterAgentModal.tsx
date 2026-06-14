import { useState, type FormEvent } from 'react'
import { Bot, Loader2, X } from 'lucide-react'
import { registerAgent } from '../../services/serviceNow'

interface Props {
  open: boolean
  onClose: () => void
  onRegistered: (sys_id: string, name: string) => void
}

export function RegisterAgentModal({ open, onClose, onRegistered }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [active, setActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await registerAgent({ name, description, instructions, active })
      onRegistered(result.sys_id, result.name)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (submitting) return
    setName('')
    setDescription('')
    setInstructions('')
    setActive(true)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#e5eef3] px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e7f3f8]">
            <Bot size={18} className="text-[#0f5f8c]" />
          </div>
          <h2 className="flex-1 text-base font-bold text-[#143A57]">Register New Agent</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg p-1 text-[#6b7c8f] hover:bg-[#f5f9fb] hover:text-[#143A57] disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <p className="text-xs text-[#53687b]">
            Creates a new agent record in ServiceNow AI Agent Studio (
            <span className="font-semibold text-[#143A57]">sn_aia_agent</span>). It will
            appear in Unmanaged Assets after the next refresh.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#143A57]">
              Agent name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Prior Auth Agent"
              className="w-full rounded-lg border border-[#cfe0ea] px-3 py-2 text-sm text-[#143A57] placeholder:text-[#9ab0bf] focus:border-[#0f5f8c] focus:outline-none focus:ring-1 focus:ring-[#0f5f8c]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#143A57]">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this agent do?"
              className="w-full resize-none rounded-lg border border-[#cfe0ea] px-3 py-2 text-sm text-[#143A57] placeholder:text-[#9ab0bf] focus:border-[#0f5f8c] focus:outline-none focus:ring-1 focus:ring-[#0f5f8c]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#143A57]">
              Prompt / Instructions <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="System prompt or step-by-step instructions for the agent…"
              className="w-full resize-none rounded-lg border border-[#cfe0ea] px-3 py-2 text-sm text-[#143A57] placeholder:text-[#9ab0bf] focus:border-[#0f5f8c] focus:outline-none focus:ring-1 focus:ring-[#0f5f8c]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive((v) => !v)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                active ? 'bg-[#0f5f8c]' : 'bg-[#c9d8e4]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  active ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-semibold text-[#143A57]">
              {active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-lg border border-[#cfe0ea] px-4 py-2 text-sm font-semibold text-[#53687b] hover:bg-[#f5f9fb] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#143A57] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f5f8c] disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Registering…' : 'Register Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
