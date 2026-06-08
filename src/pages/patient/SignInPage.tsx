import { type FormEvent, useEffect, useState } from 'react'
import { AlertTriangle, KeyRound, LoaderCircle, LockKeyhole } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { OtpCodeInput } from '../../components/patient/OtpCodeInput'
import { PatientPage } from '../../components/patient/PatientShell'
import { usePatientAuth } from '../../contexts/PatientAuthContext'

type SignInRouteState = {
  username?: string
  session?: string
  mode?: 'mfa' | 'new-password'
  from?: string
}

export function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = (location.state ?? {}) as SignInRouteState
  const { completeNewPasswordChallenge, login, verifyLoginMfa, isAuthenticated } = usePatientAuth()
  const [username, setUsername] = useState(routeState.username ?? '')
  const [password, setPassword] = useState('')
  const [mfaSession, setMfaSession] = useState(routeState.mode === 'mfa' ? routeState.session ?? '' : '')
  const [newPasswordSession, setNewPasswordSession] = useState(routeState.mode === 'new-password' ? routeState.session ?? '' : '')
  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isAuthenticated) navigate(routeState.from || '/patient/dashboard', { replace: true })
  }, [isAuthenticated, navigate, routeState.from])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsChecking(true)
    setErrorMessage('')

    try {
      if (newPasswordSession) {
        if (!fullName.trim()) {
          setErrorMessage('Enter your full name to complete account setup.')
          return
        }
        if (!newPassword) {
          setErrorMessage('Enter a new password to continue.')
          return
        }
        if (newPassword !== confirmNewPassword) {
          setErrorMessage('New password and confirmation must match.')
          return
        }
        const response = await completeNewPasswordChallenge(
          newPasswordSession,
          username.trim(),
          newPassword,
          fullName.trim(),
        )
        await handleAuthResponse(response)
        return
      }

      if (mfaSession) {
        if (!otpCode.trim()) {
          setErrorMessage('Enter the 6-digit code from your authenticator app.')
          return
        }
        await verifyLoginMfa(mfaSession, username.trim(), otpCode.trim())
        navigate('/patient/dashboard', { replace: true })
        return
      }

      const response = await login(username.trim(), password)
      await handleAuthResponse(response)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.')
    } finally {
      setIsChecking(false)
    }
  }

  async function handleAuthResponse(response: Awaited<ReturnType<typeof login>>) {
    if (response.status === 'MFA_REQUIRED') {
      setMfaSession(response.session)
      setNewPasswordSession('')
      setOtpCode('')
      return
    }
    if (response.status === 'MFA_SETUP_REQUIRED') {
      navigate('/patient/verify-email', {
        state: {
          username: username.trim(),
          session: response.session,
        },
      })
      return
    }
    if (response.status === 'CHALLENGE' && response.challenge_name === 'NEW_PASSWORD_REQUIRED') {
      setNewPasswordSession(response.session)
      setMfaSession('')
      setPassword('')
      setFullName('')
      setNewPassword('')
      setConfirmNewPassword('')
      return
    }
    if (response.status === 'CHALLENGE') {
      setErrorMessage(`Cognito returned an unsupported challenge: ${response.challenge_name}.`)
      return
    }
    navigate('/patient/dashboard', { replace: true })
  }

  return (
    <PatientPage
      title="Access your patient dashboard"
      intro={newPasswordSession ? 'Set a permanent patient portal password before continuing to MFA.' : 'Use your patient portal email and password, then confirm the one-time code from your authenticator app.'}
    >
      <div className="flex items-center justify-center">
        <form onSubmit={handleSubmit} className="grid w-[540px] gap-4 rounded-[14px] border border-[#d7e5ec] bg-white p-[22px] shadow-[0_12px_30px_rgba(25,64,93,0.07)]">
          <label className="grid gap-[7px] text-md font-bold">
            <span>Email</span>
            <input
              className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
              type="email"
              placeholder="Enter email"
              value={username}
              disabled={Boolean(mfaSession || newPasswordSession)}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          {!mfaSession && !newPasswordSession && (
            <label className="grid gap-[7px] text-md font-bold">
              <span>Password</span>
              <input
                className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}

          {newPasswordSession && (
            <>
              <label className="grid gap-[7px] text-md font-bold">
                <span>Full name</span>
                <input
                  className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
              <label className="grid gap-[7px] text-md font-bold">
                <span>New password</span>
                <input
                  className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
              <label className="grid gap-[7px] text-md font-bold">
                <span>Confirm new password</span>
                <input
                  className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </label>
            </>
          )}

          {mfaSession && <OtpCodeInput value={otpCode} onChange={setOtpCode} disabled={isChecking} />}

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-[10px] border border-[#f2c9c9] bg-[#fff4f4] p-4 text-sm font-semibold text-[#8a2f2f]" role="alert">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={isChecking} className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white disabled:cursor-not-allowed disabled:opacity-70 max-[720px]:w-full">
              {isChecking ? <LoaderCircle size={17} className="animate-spin" /> : mfaSession || newPasswordSession ? <KeyRound size={17} /> : <LockKeyhole size={17} />}
              {isChecking ? 'Checking...' : mfaSession ? 'Verify code' : newPasswordSession ? 'Set password' : 'Sign in'}
            </button>
            {(mfaSession || newPasswordSession) && (
              <button
                type="button"
                onClick={() => {
                  setMfaSession('')
                  setNewPasswordSession('')
                  setOtpCode('')
                  setPassword('')
                  setFullName('')
                  setNewPassword('')
                  setConfirmNewPassword('')
                  setErrorMessage('')
                }}
                className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-bold text-[#0f5f8c] max-[720px]:w-full"
              >
                Use a different account
              </button>
            )}
          </div>

          <div className="flex flex-col items-left gap-3.5 font-bold text-[#0397AE]">
            <a>Forgot password?</a>
            <Link to="/patient/register">New patient? Register here</Link>
          </div>
        </form>
      </div>
    </PatientPage>
  )
}
