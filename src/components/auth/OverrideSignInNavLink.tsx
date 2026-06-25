import { useEffect, useRef, useState, type ComponentProps, type FormEvent, type MouseEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, KeyRound, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { OVERRIDE_AUTH_CODE } from '../../lib/overrideAuth'

type NavLinkClassName = ComponentProps<typeof NavLink>['className']

interface OverrideSignInNavLinkProps {
  to: string
  redirectTo: string
  label: string
  portalLabel: string
  icon: LucideIcon
  className: NavLinkClassName
  end?: boolean
  onOverrideLogin: () => void
}

export function OverrideSignInNavLink({
  to,
  redirectTo,
  label,
  portalLabel,
  icon: Icon,
  className,
  end,
  onOverrideLogin,
  collapsed,
}: OverrideSignInNavLinkProps & { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [isPromptOpen, setIsPromptOpen] = useState(false)
  const clickTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current)
    }
  }, [])

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()

    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      setIsPromptOpen(true)
      return
    }

    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null
      navigate(to)
    }, 260)
  }

  function handleAuthenticate() {
    onOverrideLogin()
    setIsPromptOpen(false)
    navigate(redirectTo, { replace: true })
  }

  return (
    <>
      <NavLink to={to} end={end} className={className} onClick={handleClick}>
        <span className="flex shrink-0 items-center justify-center transition-transform duration-300" style={{ transform: collapsed ? 'scale(1)' : 'scale(0.77)' }}><Icon size={17} /></span>
        {!collapsed && <span>{label}</span>}
      </NavLink>
      <OverrideCodePrompt
        isOpen={isPromptOpen}
        portalLabel={portalLabel}
        onAuthenticate={handleAuthenticate}
        onClose={() => setIsPromptOpen(false)}
      />
    </>
  )
}

function OverrideCodePrompt({
  isOpen,
  portalLabel,
  onAuthenticate,
  onClose,
}: {
  isOpen: boolean
  portalLabel: string
  onAuthenticate: () => void
  onClose: () => void
}) {
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setCode('')
    setErrorMessage('')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [isOpen])

  if (!isOpen) return null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (code.trim() !== OVERRIDE_AUTH_CODE) {
      setErrorMessage('Invalid override code.')
      return
    }

    onAuthenticate()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#102033]/45 px-4 py-6" role="presentation">
      <form
        onSubmit={handleSubmit}
        className="grid w-full max-w-[420px] gap-4 rounded-[12px] border border-[#d7e5ec] bg-white p-5 shadow-[0_18px_50px_rgba(16,32,51,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="override-code-title"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[#e7f3f8] text-[#0f5f8c]">
              <KeyRound size={18} />
            </span>
            <h2 id="override-code-title" className="m-0 text-lg font-bold text-[#102033]">
              {portalLabel} override
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-[9px] border border-[#d7e5ec] bg-white text-[#53687b]"
            aria-label="Close override code"
          >
            <X size={17} />
          </button>
        </div>

        <label className="grid gap-[7px] text-sm font-bold text-[#102033]">
          <span>Code</span>
          <input
            ref={inputRef}
            className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
            type="password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </label>

        {errorMessage && (
          <div className="flex items-start gap-2 rounded-[10px] border border-[#f2c9c9] bg-[#fff4f4] p-3 text-sm font-semibold text-[#8a2f2f]" role="alert">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white max-[720px]:w-full"
        >
          <KeyRound size={17} />
          Authenticate
        </button>
      </form>
    </div>
  )
}
