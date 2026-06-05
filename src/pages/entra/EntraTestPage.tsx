// Customer-facing demo of the Microsoft Entra External ID native-auth flows.
// Two cards — Register and Sign in — each backed by the FastAPI proxy. When a
// flow needs a one-time code (email verification on sign-up, or MFA on
// sign-in) the card swaps to an OTP step. Outcomes surface as a green success
// modal or a red error modal.
//
// NOTE: Temporary surface reachable from the "Entra" nav tab; remove once
// native auth is wired into the real patient flow.

import { type FormEvent, type ReactNode, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
  UserPlus,
  XCircle,
} from 'lucide-react'

import { PortalPage } from '../../components/portal/PortalShell'
import { cn } from '../../lib/cn'
import {
  EntraApiError,
  signinMfaChallenge,
  signinMfaMethods,
  signinMfaVerify,
  signinPassword,
  signinStart,
  signupChallenge,
  signupStart,
  signupVerify,
  type EntraResponse,
} from '../../services/entraAuth'

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

type Modal =
  | { variant: 'success'; title: string; message: string }
  | { variant: 'error'; title: string; message: string }

const cardClass =
  'grid gap-4 rounded-[14px] border border-[#d7e5ec] bg-white p-[26px] shadow-[0_12px_30px_rgba(25,64,93,0.07)]'

const inputClass =
  'w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit outline-none focus:border-[#0397AE]'

const primaryBtn =
  'inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white transition disabled:cursor-not-allowed disabled:opacity-60'

const linkBtn = 'text-left text-sm font-bold text-[#0397AE] disabled:opacity-50'

function messageFromError(err: unknown): string {
  if (err instanceof EntraApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Something went wrong. Please try again.'
}

function Field({
  label,
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string
  icon?: ReactNode
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <label className="grid gap-[7px] text-[0.92rem] font-bold text-[#40566b]">
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <input
        className={inputClass}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

function CardHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-[#143A57] text-white">
        {icon}
      </span>
      <div>
        <h2 className="m-0 text-[1.15rem] font-bold text-[#102033]">{title}</h2>
        <p className="mt-0.5 text-sm font-semibold text-[#607487]">{subtitle}</p>
      </div>
    </div>
  )
}

// One-time-code entry, reused by both flows.
function OtpStep({
  title,
  description,
  code,
  setCode,
  onSubmit,
  onResend,
  onBack,
  busy,
  resending,
  submitLabel,
}: {
  title: string
  description: ReactNode
  code: string
  setCode: (v: string) => void
  onSubmit: (e: FormEvent) => void
  onResend: () => void
  onBack: () => void
  busy: boolean
  resending: boolean
  submitLabel: string
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="flex items-center gap-2 rounded-lg border border-[#cfe6ee] bg-[#eef8fb] px-3.5 py-3 text-sm text-[#0f5f8c]">
        <Mail size={18} className="flex-shrink-0" />
        <span>{description}</span>
      </div>
      <label className="grid gap-[7px] text-[0.92rem] font-bold text-[#40566b]">
        <span>{title}</span>
        <input
          className={cn(inputClass, 'text-center font-mono text-xl tracking-[0.4em]')}
          inputMode="numeric"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
          placeholder="••••••"
        />
      </label>
      <button type="submit" className={primaryBtn} disabled={busy || code.length === 0}>
        {busy ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
        {busy ? 'Verifying…' : submitLabel}
      </button>
      <div className="flex items-center justify-between">
        <button type="button" className={linkBtn} onClick={onBack} disabled={busy}>
          ← Start over
        </button>
        <button
          type="button"
          className={cn(linkBtn, 'inline-flex items-center gap-1.5')}
          onClick={onResend}
          disabled={resending || busy}
        >
          {resending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Resend code
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Register card
// ---------------------------------------------------------------------------

function RegisterCard({ notify }: { notify: (m: Modal) => void }) {
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [token, setToken] = useState('')
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)

  function resetToForm() {
    setStep('form')
    setCode('')
    setToken('')
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const attributes = fullName.trim() ? { displayName: fullName.trim() } : undefined
      const started = await signupStart({ email, password, attributes })
      const challenged = await signupChallenge(started.continuationToken ?? '')
      setToken(challenged.continuationToken ?? started.continuationToken ?? '')
      setTarget(challenged.challengeTargetLabel || email)
      setCode('')
      setStep('otp')
    } catch (err) {
      notify({
        variant: 'error',
        title: 'Registration failed',
        message: messageFromError(err),
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res: EntraResponse = await signupVerify(token, code)
      if (res.status === 'authenticated' || res.status === 'next_step') {
        notify({
          variant: 'success',
          title: 'Account created',
          message: `Welcome${fullName ? `, ${fullName}` : ''}! Your account for ${email} is ready — you can now sign in.`,
        })
        setFullName('')
        setEmail('')
        setPassword('')
        resetToForm()
      } else {
        notify({
          variant: 'error',
          title: 'Verification incomplete',
          message: res.errorDescription || 'The code was accepted but the account is not yet active.',
        })
      }
    } catch (err) {
      notify({ variant: 'error', title: 'Verification failed', message: messageFromError(err) })
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    if (!token) return
    setResending(true)
    try {
      const res = await signupChallenge(token)
      setToken(res.continuationToken ?? token)
      notify({
        variant: 'success',
        title: 'Code resent',
        message: `We sent a fresh verification code to ${target}.`,
      })
    } catch (err) {
      notify({ variant: 'error', title: 'Could not resend code', message: messageFromError(err) })
    } finally {
      setResending(false)
    }
  }

  return (
    <div className={cardClass}>
      <CardHeader
        icon={<UserPlus size={22} />}
        title="Create your account"
        subtitle="Register with Microsoft Entra native authentication"
      />

      {step === 'form' ? (
        <form onSubmit={handleRegister} className="grid gap-4">
          <Field
            label="Full name"
            icon={<User size={14} />}
            value={fullName}
            onChange={setFullName}
            placeholder="Casey Jensen"
            autoComplete="name"
          />
          <Field
            label="Email"
            icon={<Mail size={14} />}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="casey@example.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            icon={<LockKeyhole size={14} />}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Create a password"
            autoComplete="new-password"
          />
          <button type="submit" className={primaryBtn} disabled={busy || !email || !password}>
            {busy ? <Loader2 size={17} className="animate-spin" /> : <UserPlus size={17} />}
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      ) : (
        <OtpStep
          title="Verification code"
          description={
            <>
              We emailed a verification code to <strong>{target}</strong>. Enter it to finish creating
              your account.
            </>
          }
          code={code}
          setCode={setCode}
          onSubmit={handleVerify}
          onResend={handleResend}
          onBack={resetToForm}
          busy={busy}
          resending={resending}
          submitLabel="Verify & create account"
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Login card
// ---------------------------------------------------------------------------

function LoginCard({ notify }: { notify: (m: Modal) => void }) {
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [token, setToken] = useState('')
  const [methodId, setMethodId] = useState('')
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)

  function resetToForm() {
    setStep('form')
    setCode('')
    setToken('')
    setMethodId('')
  }

  function welcome(res: EntraResponse) {
    const claims = decodeIdToken(res.tokens?.idToken)
    const name =
      (claims && (claims.name || claims.given_name || claims.preferred_username)) || email
    notify({
      variant: 'success',
      title: 'Signed in',
      message: `Welcome back, ${name}! You're now authenticated with Microsoft Entra.`,
    })
    resetToForm()
    setEmail('')
    setPassword('')
  }

  async function beginMfa(continuationToken: string) {
    const methods = await signinMfaMethods(continuationToken)
    const first = methods.methods?.[0]
    const id = (first && typeof first.id === 'string' && first.id) || ''
    const ct = methods.continuationToken ?? continuationToken
    const challenged = await signinMfaChallenge(ct, id)
    setMethodId(id)
    setToken(challenged.continuationToken ?? ct)
    setTarget(challenged.challengeTargetLabel || first?.loginHint || email)
    setCode('')
    setStep('otp')
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const started = await signinStart(email)
      const res = await signinPassword(started.continuationToken ?? '', password)

      if (res.status === 'authenticated') {
        welcome(res)
      } else if (res.status === 'mfa_required') {
        await beginMfa(res.continuationToken ?? '')
      } else if (res.status === 'registration_required') {
        notify({
          variant: 'error',
          title: 'Extra security setup needed',
          message:
            'This account must register a multi-factor method before signing in. Complete MFA enrolment in Microsoft Entra, then try again.',
        })
      } else {
        notify({
          variant: 'error',
          title: 'Sign-in incomplete',
          message: res.errorDescription || `Unexpected response: ${res.status ?? 'unknown'}.`,
        })
      }
    } catch (err) {
      notify({ variant: 'error', title: 'Sign-in failed', message: messageFromError(err) })
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await signinMfaVerify(token, code)
      if (res.status === 'authenticated') {
        welcome(res)
      } else {
        notify({
          variant: 'error',
          title: 'Verification incomplete',
          message: res.errorDescription || 'The code was accepted but sign-in did not complete.',
        })
      }
    } catch (err) {
      notify({ variant: 'error', title: 'Verification failed', message: messageFromError(err) })
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    if (!token) return
    setResending(true)
    try {
      const res = await signinMfaChallenge(token, methodId)
      setToken(res.continuationToken ?? token)
      notify({
        variant: 'success',
        title: 'Code resent',
        message: `We sent a fresh verification code to ${target}.`,
      })
    } catch (err) {
      notify({ variant: 'error', title: 'Could not resend code', message: messageFromError(err) })
    } finally {
      setResending(false)
    }
  }

  return (
    <div className={cardClass}>
      <CardHeader
        icon={<LogIn size={22} />}
        title="Sign in"
        subtitle="Authenticate with Microsoft Entra native authentication"
      />

      {step === 'form' ? (
        <form onSubmit={handleSignIn} className="grid gap-4">
          <Field
            label="Email"
            icon={<Mail size={14} />}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="casey@example.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            icon={<LockKeyhole size={14} />}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete="current-password"
          />
          <button type="submit" className={primaryBtn} disabled={busy || !email || !password}>
            {busy ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : (
        <OtpStep
          title="Verification code"
          description={
            <>
              For your security, we sent a verification code to <strong>{target}</strong>. Enter it to
              finish signing in.
            </>
          }
          code={code}
          setCode={setCode}
          onSubmit={handleVerify}
          onResend={handleResend}
          onBack={resetToForm}
          busy={busy}
          resending={resending}
          submitLabel="Verify & sign in"
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Result modal
// ---------------------------------------------------------------------------

function ResultModal({ modal, onClose }: { modal: Modal; onClose: () => void }) {
  const success = modal.variant === 'success'
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1f2e]/45 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] overflow-hidden rounded-[16px] border border-[#d7e5ec] bg-white shadow-[0_18px_50px_rgba(12,37,54,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'flex items-center gap-3 px-6 py-5',
            success ? 'bg-[#e9f8f0]' : 'bg-[#fdecec]',
          )}
        >
          <span
            className={cn(
              'grid h-11 w-11 flex-shrink-0 place-items-center rounded-full text-white',
              success ? 'bg-[#12805c]' : 'bg-[#dc2626]',
            )}
          >
            {success ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
          </span>
          <h2 className={cn('text-xl font-bold', success ? 'text-[#0f6f4f]' : 'text-[#b91c1c]')}>
            {modal.title}
          </h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-[0.95rem] leading-[1.6] text-[#40566b]">{modal.message}</p>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'mt-5 inline-flex min-h-[42px] w-full items-center justify-center rounded-[9px] px-4 font-bold text-white',
              success ? 'bg-[#12805c]' : 'bg-[#143A57]',
            )}
          >
            {success ? 'Done' : 'Try again'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function EntraTestPage() {
  const [modal, setModal] = useState<Modal | null>(null)

  return (
    <PortalPage
      label="Entra Native Auth (test)"
      title="Microsoft Entra account access"
      intro="Create an account or sign in using Microsoft Entra External ID native authentication. A one-time code keeps your sign-in secure."
    >
      <section className="px-6 pb-10">
        <div className="mx-auto grid w-full max-w-[1040px] items-start gap-6 lg:grid-cols-2">
          <RegisterCard notify={setModal} />
          <LoginCard notify={setModal} />
        </div>

        <p className="mx-auto mt-6 flex max-w-[1040px] items-center justify-center gap-2 text-[0.8rem] font-semibold text-[#8aa0b3]">
          <KeyRound size={14} /> Secured by Microsoft Entra External ID · Native Authentication
        </p>
      </section>

      {modal && <ResultModal modal={modal} onClose={() => setModal(null)} />}
    </PortalPage>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeIdToken(token?: string): Record<string, string> | null {
  if (!token) return null
  try {
    const part = token.split('.')[1]
    if (!part) return null
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}
