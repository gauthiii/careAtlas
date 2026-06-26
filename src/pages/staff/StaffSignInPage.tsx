import { type FormEvent, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, KeyRound, LoaderCircle, LockKeyhole, QrCode } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { OtpCodeInput } from '../../components/patient/OtpCodeInput'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { useClinicianAuth } from '../../contexts/ClinicianAuthContext'
import { startAwsMfaSetup, type AwsLoginResponse, type AwsMfaSetupStartResponse } from '../../services/awsAuth'

const setupRequests = new Map<string, Promise<AwsMfaSetupStartResponse>>()

function startMfaSetupOnce(session: string, username: string) {
  const key = `${username}:${session}`
  const existing = setupRequests.get(key)
  if (existing) return existing

  const request = startAwsMfaSetup(session, username)
  setupRequests.set(key, request)
  return request
}

export function StaffSignInPage() {
  const navigate = useNavigate()
  const {
    completeMfaSetup,
    completeNewPasswordChallenge,
    isAuthenticated,
    login,
    verifyLoginMfa,
  } = useClinicianAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [newPasswordSession, setNewPasswordSession] = useState('')
  const [mfaSession, setMfaSession] = useState('')
  const [setupSession, setSetupSession] = useState('')
  const [setupData, setSetupData] = useState<AwsMfaSetupStartResponse | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isStartingSetup, setIsStartingSetup] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isAuthenticated) navigate('/staff/doctor', { replace: true })
  }, [isAuthenticated, navigate])

  useEffect(() => {
    const normalizedUsername = username.trim()
    if (!setupSession || !normalizedUsername || setupData) return

    let cancelled = false
    setIsStartingSetup(true)
    setErrorMessage('')

    startMfaSetupOnce(setupSession, normalizedUsername)
      .then((response) => {
        if (cancelled) return
        setSetupData(response)
        setSetupSession(response.session)
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to start MFA setup.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsStartingSetup(false)
      })

    return () => {
      cancelled = true
    }
  }, [setupData, setupSession, username])

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
        navigate('/staff/doctor', { replace: true })
        return
      }

      if (setupData) {
        if (!otpCode.trim()) {
          setErrorMessage('Enter the 6-digit code from your authenticator app.')
          return
        }
        await completeMfaSetup(setupData.session, username.trim(), otpCode.trim())
        navigate('/staff/doctor', { replace: true })
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

  async function handleAuthResponse(response: AwsLoginResponse) {
    if (response.status === 'MFA_REQUIRED') {
      setMfaSession(response.session)
      setNewPasswordSession('')
      setSetupSession('')
      setSetupData(null)
      setOtpCode('')
      return
    }
    if (response.status === 'MFA_SETUP_REQUIRED') {
      setSetupSession(response.session)
      setMfaSession('')
      setNewPasswordSession('')
      setSetupData(null)
      setOtpCode('')
      return
    }
    if (response.status === 'CHALLENGE' && response.challenge_name === 'NEW_PASSWORD_REQUIRED') {
      setNewPasswordSession(response.session)
      setMfaSession('')
      setSetupSession('')
      setSetupData(null)
      setPassword('')
      setFullName('')
      setNewPassword('')
      setConfirmNewPassword('')
      setOtpCode('')
      return
    }
    if (response.status === 'CHALLENGE') {
      setErrorMessage(`Cognito returned an unsupported challenge: ${response.challenge_name}.`)
      return
    }
    navigate('/staff/doctor', { replace: true })
  }

  function resetChallenge() {
    setMfaSession('')
    setSetupSession('')
    setSetupData(null)
    setNewPasswordSession('')
    setPassword('')
    setFullName('')
    setNewPassword('')
    setConfirmNewPassword('')
    setOtpCode('')
    setErrorMessage('')
  }

  const isChallengeActive = Boolean(mfaSession || setupSession || newPasswordSession)
  const buttonLabel = isChecking
    ? 'Checking...'
    : newPasswordSession
      ? 'Set password'
      : mfaSession || setupData
        ? 'Verify code'
        : 'Sign in'

  return (
    <DoctorPage
      title="Access Clinical Operations"
      intro={
        newPasswordSession
          ? 'Set a permanent clinical account password before continuing to MFA.'
          : 'Use your clinical account email and password, then complete authenticator MFA.'
      }
    >
      <div className="flex items-center justify-center">
        <form onSubmit={handleSubmit} className="grid w-[620px] gap-4 rounded-xl border border-[#d7e5ec] bg-white p-6">
          <label className="grid gap-[7px] text-md font-bold">
            <span>Email</span>
            <input
              className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
              type="email"
              placeholder="clinician@example.com"
              value={username}
              disabled={isChallengeActive}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          {!isChallengeActive && (
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

          {isStartingSetup && (
            <div className="flex items-center gap-2 font-bold text-[#53687b]">
              <LoaderCircle size={18} className="animate-spin" />
              Preparing your QR code...
            </div>
          )}

          {setupData && (
            <section className="grid gap-4 rounded-[12px] border border-[#d7e5ec] bg-[#f7fbfd] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#53687b]">
                <QrCode size={18} />
                Scan this QR code with your authenticator app.
              </div>
              <img
                src={setupData.qr_image_data_url}
                alt="Clinician authenticator app QR code"
                className="h-56 w-56 rounded-[10px] border border-[#d7e5ec] bg-white p-2"
              />
              <div className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-[0.06em] text-[#607487]">
                  Manual setup key
                </span>
                <code className="rounded-[8px] border border-[#d7e5ec] bg-white px-3 py-2 text-sm font-bold [overflow-wrap:anywhere]">
                  {setupData.secret}
                </code>
              </div>
            </section>
          )}

          {(mfaSession || setupData) && <OtpCodeInput value={otpCode} onChange={setOtpCode} disabled={isChecking} />}

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-[10px] border border-[#f2c9c9] bg-[#fff4f4] p-4 text-sm font-semibold text-[#8a2f2f]" role="alert">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isChecking || isStartingSetup}
              className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] !font-semibold !text-white disabled:cursor-not-allowed disabled:opacity-70 max-[720px]:w-full"
            >
              {isChecking ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : mfaSession || setupData || newPasswordSession ? (
                <KeyRound size={17} />
              ) : (
                <LockKeyhole size={17} />
              )}
              {buttonLabel}
            </button>
            {isChallengeActive && (
              <button
                type="button"
                onClick={resetChallenge}
                className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-bold text-[#0f5f8c] max-[720px]:w-full"
              >
                Use a different account
              </button>
            )}
          </div>

          <div className="flex flex-col items-left gap-3.5 font-bold text-[#0397AE]">
            <a>Forgot password?</a>
          </div>
        </form>
      </div>
    </DoctorPage>
  )
}
