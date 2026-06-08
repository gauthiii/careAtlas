import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, KeyRound, LoaderCircle, QrCode } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { OtpCodeInput } from '../../components/patient/OtpCodeInput'
import { PatientPanel } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { usePatientAuth } from '../../contexts/PatientAuthContext'
import { startAwsMfaSetup, type AwsMfaSetupStartResponse } from '../../services/awsAuth'

type SetupState = {
  username?: string
  session?: string
  name?: string
}

const setupRequests = new Map<string, Promise<AwsMfaSetupStartResponse>>()

function startMfaSetupOnce(session: string, username: string) {
  const key = `${username}:${session}`
  const existing = setupRequests.get(key)
  if (existing) return existing

  const request = startAwsMfaSetup(session, username)
  setupRequests.set(key, request)
  return request
}

export function EmailVerificationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login, completeMfaSetup } = usePatientAuth()
  const incomingState = (location.state ?? {}) as SetupState
  const [username, setUsername] = useState(incomingState.username ?? '')
  const [password, setPassword] = useState('')
  const [setupSession, setSetupSession] = useState(incomingState.session ?? '')
  const [setupData, setSetupData] = useState<AwsMfaSetupStartResponse | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const patientName = useMemo(() => incomingState.name || username, [incomingState.name, username])

  useEffect(() => {
    const normalizedUsername = username.trim()
    if (!setupSession || !normalizedUsername || setupData) return

    let cancelled = false
    setIsStarting(true)
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
        if (!cancelled) setIsStarting(false)
      })

    return () => {
      cancelled = true
    }
  }, [setupData, setupSession, username])

  async function handleRestart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSetupData(null)
    setOtpCode('')

    if (!username.trim() || !password) {
      setErrorMessage('Enter your email and password to restart MFA setup.')
      return
    }

    setIsRestarting(true)
    try {
      const response = await login(username.trim(), password)
      if (response.status === 'MFA_SETUP_REQUIRED') {
        setSetupSession(response.session)
        return
      }
      if (response.status === 'MFA_REQUIRED') {
        navigate('/patient/sign-in', {
          state: {
            username: username.trim(),
            session: response.session,
            mode: 'mfa',
          },
        })
        return
      }
      if (response.status === 'CHALLENGE') {
        if (response.challenge_name === 'NEW_PASSWORD_REQUIRED') {
          navigate('/patient/sign-in', {
            state: {
              username: username.trim(),
              session: response.session,
              mode: 'new-password',
            },
          })
          return
        }
        setErrorMessage(`Cognito returned an unsupported challenge: ${response.challenge_name}.`)
        return
      }
      if (response.status === 'AUTH_SUCCESS') {
        navigate('/patient/dashboard')
        return
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to restart MFA setup.')
    } finally {
      setIsRestarting(false)
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (!setupData || !username.trim()) {
      setErrorMessage('MFA setup has not started yet.')
      return
    }
    if (!otpCode.trim()) {
      setErrorMessage('Enter the 6-digit code from your authenticator app.')
      return
    }

    setIsVerifying(true)
    try {
      await completeMfaSetup(setupData.session, username.trim(), otpCode.trim())
      navigate('/patient/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify MFA code.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <PatientPage
      title="Set up authenticator MFA"
      intro="Scan the QR code with an authenticator app, then enter the 6-digit code to finish securing your patient account."
    >
      <div className="grid gap-4 grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] max-[1100px]:grid-cols-1">
        <PatientPanel title="Authenticator setup" icon={<QrCode size={21} />} tone="secure">
          {isStarting && (
            <div className="flex items-center gap-2 font-bold text-[#53687b]">
              <LoaderCircle size={18} className="animate-spin" />
              Preparing your QR code...
            </div>
          )}

          {!setupSession && (
            <p className="mt-1.5 mb-0 leading-normal text-[#607487]">
              Enter your patient portal credentials to restart MFA setup.
            </p>
          )}

          {setupData && (
            <form onSubmit={handleVerify} className="grid gap-4">
              <div className="grid gap-3 rounded-[12px] border border-[#d7e5ec] bg-[#f7fbfd] p-4">
                <div className="text-sm font-bold text-[#53687b]">
                  Setting up MFA for {patientName || 'your account'}
                </div>
                <img
                  src={setupData.qr_image_data_url}
                  alt="Authenticator app QR code"
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
              </div>

              <OtpCodeInput value={otpCode} onChange={setOtpCode} disabled={isVerifying} />

              <button
                type="submit"
                disabled={isVerifying}
                className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white disabled:cursor-not-allowed disabled:opacity-70 max-[720px]:w-full"
              >
                {isVerifying ? <LoaderCircle size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                {isVerifying ? 'Verifying...' : 'Finish setup'}
              </button>
            </form>
          )}
        </PatientPanel>

        <PatientPanel title="Restart setup" icon={<KeyRound size={21} />} tone="default">
          <form onSubmit={handleRestart} className="grid gap-4">
            <p className="mt-1.5 mb-0 leading-normal text-[#607487]">
              If this page was refreshed, sign in again to request a fresh QR setup session.
            </p>
            <label className="grid gap-[7px] text-md font-bold">
              <span>Email</span>
              <input
                className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
                type="email"
                placeholder="you@example.com"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="grid gap-[7px] text-md font-bold">
              <span>Password</span>
              <input
                className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={isRestarting}
              className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-extrabold text-[#0f5f8c] disabled:cursor-not-allowed disabled:opacity-70 max-[720px]:w-full"
            >
              {isRestarting ? <LoaderCircle size={17} className="animate-spin" /> : null}
              {isRestarting ? 'Restarting...' : 'Restart MFA setup'}
            </button>
          </form>
        </PatientPanel>
      </div>

      {errorMessage && (
        <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-[#f2c9c9] bg-[#fff4f4] p-4 text-sm font-semibold text-[#8a2f2f]" role="alert">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </PatientPage>
  )
}
