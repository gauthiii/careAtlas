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

const STORAGE_KEY = 'careatlas.governanceAuth'

export interface GovernanceAuthUser {
  username: string
  attributes: Record<string, string>
}

interface StoredGovernanceAuth {
  idToken: string
  accessToken: string
  refreshToken?: string | null
  user?: GovernanceAuthUser | null
}

interface GovernanceAuthContextValue {
  user: GovernanceAuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isHydrating: boolean
  login: (username: string, password: string) => Promise<AwsLoginResponse>
  completeNewPasswordChallenge: (session: string, username: string, newPassword: string, name: string) => Promise<AwsLoginResponse>
  verifyLoginMfa: (session: string, username: string, code: string) => Promise<void>
  completeMfaSetup: (session: string, username: string, code: string) => Promise<void>
  logout: () => Promise<void>
}

const GovernanceAuthContext = createContext<GovernanceAuthContextValue | null>(null)

function readStoredAuth(): StoredGovernanceAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredGovernanceAuth) : null
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function writeStoredAuth(auth: StoredGovernanceAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

function validatedUserToGovernanceUser(validated: AwsValidatedUser): GovernanceAuthUser {
  return {
    username: validated.username,
    attributes: validated.attributes,
  }
}

export function governanceDisplayName(user: GovernanceAuthUser | null): string {
  if (!user) return 'governance user'

  const name = user.attributes.name?.trim()
  if (name) return name

  const email = user.attributes.email?.trim() || user.username
  return email.split('@')[0] || 'governance user'
}

export function GovernanceAuthProvider({ children }: { children: ReactNode }) {
  const [storedAuth, setStoredAuth] = useState<StoredGovernanceAuth | null>(() => readStoredAuth())
  const [isHydrating, setIsHydrating] = useState(() => Boolean(readStoredAuth()?.accessToken))

  const clearAuth = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setStoredAuth(null)
  }, [])

  const persistTokens = useCallback(async (tokens: AwsAuthTokens) => {
    const validated = await validateAwsToken(tokens.access_token)
    const nextAuth: StoredGovernanceAuth = {
      idToken: tokens.id_token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      user: validatedUserToGovernanceUser(validated),
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

    let cancelled = false
    setIsHydrating(true)

    validateAwsToken(current.accessToken)
      .then((validated) => {
        if (cancelled) return
        const nextAuth = {
          ...current,
          user: validatedUserToGovernanceUser(validated),
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

  const logout = useCallback(async () => {
    const accessToken = storedAuth?.accessToken
    try {
      if (accessToken) await logoutAwsPatient(accessToken)
    } finally {
      clearAuth()
    }
  }, [clearAuth, storedAuth?.accessToken])

  const value = useMemo<GovernanceAuthContextValue>(
    () => ({
      user: storedAuth?.user ?? null,
      accessToken: storedAuth?.accessToken ?? null,
      isAuthenticated: Boolean(storedAuth?.accessToken),
      isHydrating,
      login,
      completeNewPasswordChallenge,
      verifyLoginMfa,
      completeMfaSetup,
      logout,
    }),
    [completeMfaSetup, completeNewPasswordChallenge, isHydrating, login, logout, storedAuth, verifyLoginMfa],
  )

  return <GovernanceAuthContext.Provider value={value}>{children}</GovernanceAuthContext.Provider>
}

export function useGovernanceAuth() {
  const context = useContext(GovernanceAuthContext)
  if (!context) {
    throw new Error('useGovernanceAuth must be used inside GovernanceAuthProvider')
  }
  return context
}
