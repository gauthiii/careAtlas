import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  completeAwsNewPasswordChallenge,
  loginAwsPatient,
  logoutAwsPatient,
  validateAwsToken,
  verifyAwsLoginMfa,
  verifyAwsMfaSetup,
  type AwsAuthTokens,
  type AwsLoginResponse,
  type AwsValidatedUser,
} from '../services/awsAuth'
import {
  clearOtherPortalAuth,
  createOverrideStoredAuth,
  isOverrideStoredAuth,
  PORTAL_AUTH_OVERRIDE_EVENT,
  PORTAL_AUTH_STORAGE_KEYS,
} from '../lib/overrideAuth'

const STORAGE_KEY = PORTAL_AUTH_STORAGE_KEYS.clinician

export interface ClinicianAuthUser {
  username: string
  attributes: Record<string, string>
}

interface StoredClinicianAuth {
  idToken: string
  accessToken: string
  refreshToken?: string | null
  isOverride?: boolean
  user?: ClinicianAuthUser | null
}

interface ClinicianAuthContextValue {
  user: ClinicianAuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isHydrating: boolean
  login: (username: string, password: string) => Promise<AwsLoginResponse>
  completeNewPasswordChallenge: (session: string, username: string, newPassword: string, name: string) => Promise<AwsLoginResponse>
  verifyLoginMfa: (session: string, username: string, code: string) => Promise<void>
  completeMfaSetup: (session: string, username: string, code: string) => Promise<void>
  overrideLogin: () => void
  logout: () => Promise<void>
}

const ClinicianAuthContext = createContext<ClinicianAuthContextValue | null>(null)

function readStoredAuth(): StoredClinicianAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredClinicianAuth) : null
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function writeStoredAuth(auth: StoredClinicianAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

function validatedUserToClinicianUser(validated: AwsValidatedUser): ClinicianAuthUser {
  return {
    username: validated.username,
    attributes: validated.attributes,
  }
}

export function clinicianDisplayName(user: ClinicianAuthUser | null): string {
  if (!user) return 'clinician'

  const name = user.attributes.name?.trim()
  if (name) return name

  const email = user.attributes.email?.trim() || user.username
  return email.split('@')[0] || 'clinician'
}

export function ClinicianAuthProvider({ children }: { children: ReactNode }) {
  const [storedAuth, setStoredAuth] = useState<StoredClinicianAuth | null>(() => readStoredAuth())
  const [isHydrating, setIsHydrating] = useState(() => Boolean(readStoredAuth()?.accessToken))

  const clearAuth = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setStoredAuth(null)
  }, [])

  useEffect(() => {
    function handlePortalOverride(event: Event) {
      const currentPortal = (event as CustomEvent<{ currentPortal?: string }>).detail?.currentPortal
      if (currentPortal !== 'clinician') clearAuth()
    }

    window.addEventListener(PORTAL_AUTH_OVERRIDE_EVENT, handlePortalOverride)
    return () => window.removeEventListener(PORTAL_AUTH_OVERRIDE_EVENT, handlePortalOverride)
  }, [clearAuth])

  const persistTokens = useCallback(async (tokens: AwsAuthTokens) => {
    const validated = await validateAwsToken(tokens.access_token)
    const nextAuth: StoredClinicianAuth = {
      idToken: tokens.id_token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      user: validatedUserToClinicianUser(validated),
    }
    writeStoredAuth(nextAuth)
    setStoredAuth(nextAuth)
  }, [])

  useEffect(() => {
    const current = readStoredAuth()
    if (!current?.accessToken) {
      setIsHydrating(false)
      return
    }
    if (isOverrideStoredAuth(current)) {
      setStoredAuth(current)
      setIsHydrating(false)
      return
    }

    let cancelled = false
    setIsHydrating(true)

    validateAwsToken(current.accessToken)
      .then((validated) => {
        if (cancelled) return
        const nextAuth = {
          ...current,
          user: validatedUserToClinicianUser(validated),
        }
        writeStoredAuth(nextAuth)
        setStoredAuth(nextAuth)
      })
      .catch(() => {
        if (!cancelled) clearAuth()
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false)
      })

    return () => {
      cancelled = true
    }
  }, [clearAuth])

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await loginAwsPatient(username, password)
      if (response.status === 'AUTH_SUCCESS') await persistTokens(response)
      return response
    },
    [persistTokens],
  )

  const completeNewPasswordChallenge = useCallback(
    async (session: string, username: string, newPassword: string, name: string) => {
      const response = await completeAwsNewPasswordChallenge(session, username, newPassword, name)
      if (response.status === 'AUTH_SUCCESS') await persistTokens(response)
      return response
    },
    [persistTokens],
  )

  const verifyLoginMfa = useCallback(
    async (session: string, username: string, code: string) => {
      const tokens = await verifyAwsLoginMfa(session, username, code)
      await persistTokens(tokens)
    },
    [persistTokens],
  )

  const completeMfaSetup = useCallback(
    async (session: string, username: string, code: string) => {
      const tokens = await verifyAwsMfaSetup(session, username, code)
      await persistTokens(tokens)
    },
    [persistTokens],
  )

  const overrideLogin = useCallback(() => {
    clearOtherPortalAuth('clinician')
    const nextAuth: StoredClinicianAuth = createOverrideStoredAuth('clinician')
    writeStoredAuth(nextAuth)
    setStoredAuth(nextAuth)
  }, [])

  const logout = useCallback(async () => {
    const accessToken = storedAuth?.accessToken
    try {
      if (accessToken && !isOverrideStoredAuth(storedAuth)) await logoutAwsPatient(accessToken)
    } finally {
      clearAuth()
    }
  }, [clearAuth, storedAuth])

  const value = useMemo<ClinicianAuthContextValue>(
    () => ({
      user: storedAuth?.user ?? null,
      accessToken: storedAuth?.accessToken ?? null,
      isAuthenticated: Boolean(storedAuth?.accessToken),
      isHydrating,
      login,
      completeNewPasswordChallenge,
      verifyLoginMfa,
      completeMfaSetup,
      overrideLogin,
      logout,
    }),
    [completeMfaSetup, completeNewPasswordChallenge, isHydrating, login, logout, overrideLogin, storedAuth, verifyLoginMfa],
  )

  return <ClinicianAuthContext.Provider value={value}>{children}</ClinicianAuthContext.Provider>
}

export function useClinicianAuth() {
  const context = useContext(ClinicianAuthContext)
  if (!context) {
    throw new Error('useClinicianAuth must be used inside ClinicianAuthProvider')
  }
  return context
}
