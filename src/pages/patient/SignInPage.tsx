import { type FormEvent, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PatientPage } from '../../components/patient/PatientShell'
import { validateServiceNowUserCredentials } from '../../services/serviceNow'

type LoginResult = 'correct' | 'incorrect' | 'error'

export function SignInPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsChecking(true)
    setLoginResult(null)
    setErrorMessage('')

    try {
      const isCorrect = await validateServiceNowUserCredentials(username, password)
      setLoginResult(isCorrect ? 'correct' : 'incorrect')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to validate credentials.')
      setLoginResult('error')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <PatientPage
      title="Access your patient dashboard"
      intro="Use your patient portal credentials. A one-time MFA code is sent after username and password validation."
    >
      <div className="flex items-center justify-center">
      <form onSubmit={handleSubmit} className="grid w-[540px] gap-4 rounded-[14px] border border-[#d7e5ec] bg-white p-[22px] shadow-[0_12px_30px_rgba(25,64,93,0.07)]">
        <label className="grid gap-[7px] text-md font-bold">
          <span className="flex flex-wrap items-baseline gap-1.5">Username</span>
          <input
            className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="grid gap-[7px] text-md font-bold">
          <span className="flex flex-wrap items-baseline gap-1.5">Password</span>
          <input
            className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" disabled={isChecking} className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white disabled:cursor-not-allowed disabled:opacity-70 max-[720px]:w-full">
        <LockKeyhole size={17} /> {isChecking ? 'Checking...' : 'Sign in'}
        </button>
        <div className="flex flex-col items-left gap-3.5 font-bold text-[#0397AE]">
          <a>Forgot password?</a>
          <Link to="/patient/register">New patient? Register here</Link>
        </div>
      </form>
      </div>
      {loginResult && (
        <LoginResultModal
          result={loginResult}
          errorMessage={errorMessage}
          onClose={() => setLoginResult(null)}
        />
      )}
    </PatientPage>
  )
}

function LoginResultModal({
  result,
  errorMessage,
  onClose,
}: {
  result: LoginResult
  errorMessage: string
  onClose: () => void
}) {
  const isCorrect = result === 'correct'
  const title = isCorrect ? 'Creds correct' : 'Creds incorrect'
  const message =
    result === 'error'
      ? errorMessage
      : isCorrect
        ? 'The username and password matched an active ServiceNow sys_user.'
        : 'The username or password did not match an active ServiceNow sys_user.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1f2e]/45 px-4">
      <div className="w-full max-w-[420px] rounded-[14px] border border-[#d7e5ec] bg-white p-6 shadow-[0_18px_50px_rgba(12,37,54,0.22)]">
        <h2 className={`text-xl font-bold ${isCorrect ? 'text-[#157a47]' : 'text-red-700'}`}>
          {title}
        </h2>
        <p className="mt-2 text-sm text-[#53687b]">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 inline-flex min-h-[40px] items-center justify-center rounded-[9px] bg-[#143A57] px-4 font-bold text-white"
        >
          Close
        </button>
      </div>
    </div>
  )
}
