// Microsoft Entra External ID — Native Authentication API client.
//
// Thin typed wrapper over the FastAPI proxy in /server (see
// server/app/entra_native_auth.py). Every method maps 1:1 to one backend
// endpoint under /api/auth/entra/*. The backend normalises Entra's responses
// into a stable `{ status, ... }` shape, so the UI only has to branch on
// `status`. This client is only used by the throwaway Entra test console.

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'
const ENTRA_BASE = `${API_BASE}/auth/entra`

export type EntraStatus =
  | 'authenticated'
  | 'redirect_required'
  | 'mfa_required'
  | 'registration_required'
  | 'next_step'

export interface EntraTokens {
  tokenType?: string
  scope?: string
  expiresIn?: number
  accessToken?: string
  refreshToken?: string
  idToken?: string
}

export interface EntraMethod {
  id?: string
  challengeType?: string
  challengeChannel?: string
  challengeTarget?: string
  challengeTargetLabel?: string
  loginHint?: string
  [key: string]: unknown
}

// Normalised proxy response. Only `status` is guaranteed; the rest depend on
// which step of which flow produced it, so everything else is optional.
export interface EntraResponse {
  status?: EntraStatus | string
  continuationToken?: string
  tokens?: EntraTokens
  methods?: EntraMethod[]
  challengeType?: string
  challengeChannel?: string
  challengeTarget?: string
  challengeTargetLabel?: string
  codeLength?: number
  bindingMethod?: string
  requiredAttributes?: unknown
  error?: string
  suberror?: string
  errorDescription?: string
  traceId?: string
  correlationId?: string
  [key: string]: unknown
}

export interface EntraConfig {
  appId: string
  tenantId: string
  tenantSubdomain: string
  tenantDomain: string
  authorityUrl: string
  scopes: string[]
}

// Raised for any non-2xx proxy response. `detail` carries Entra's (camelCased)
// error payload — error / suberror / errorDescription / traceId / correlationId.
export class EntraApiError extends Error {
  status: number
  detail: Record<string, unknown>

  constructor(status: number, detail: Record<string, unknown>) {
    const description =
      (typeof detail?.errorDescription === 'string' && detail.errorDescription) ||
      (typeof detail?.error === 'string' && detail.error) ||
      `Request failed (${status})`
    super(description)
    this.name = 'EntraApiError'
    this.status = status
    this.detail = detail
  }
}

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${ENTRA_BASE}${path}`, {
      headers: { Accept: 'application/json', ...init?.headers },
      ...init,
    })
  } catch (err) {
    throw new EntraApiError(0, {
      error: 'network_error',
      errorDescription: err instanceof Error ? err.message : 'Could not reach the API.',
    })
  }

  const body = (await parseJson(res)) as Record<string, unknown>

  if (!res.ok) {
    // FastAPI wraps HTTPException payloads in `{ detail: ... }`.
    const detail =
      body && typeof body === 'object' && 'detail' in body ? body.detail : body
    throw new EntraApiError(
      res.status,
      (detail && typeof detail === 'object' ? detail : { error: String(detail) }) as Record<
        string,
        unknown
      >,
    )
  }

  return body as T
}

function post(path: string, payload: Record<string, unknown>): Promise<EntraResponse> {
  return request<EntraResponse>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// --- Configuration -------------------------------------------------------

export function getEntraConfig(): Promise<EntraConfig> {
  return request<EntraConfig>('/config')
}

// --- Sign-up flow --------------------------------------------------------

export function signupStart(args: {
  email: string
  password: string
  attributes?: Record<string, unknown>
}): Promise<EntraResponse> {
  return post('/signup/start', {
    email: args.email,
    password: args.password,
    attributes: args.attributes,
  })
}

export function signupChallenge(continuationToken: string): Promise<EntraResponse> {
  return post('/signup/challenge', { continuationToken })
}

export function signupVerify(continuationToken: string, code: string): Promise<EntraResponse> {
  return post('/signup/verify', { continuationToken, code })
}

// --- Sign-in flow --------------------------------------------------------

export function signinStart(email: string): Promise<EntraResponse> {
  return post('/signin/start', { email })
}

export function signinPassword(
  continuationToken: string,
  password: string,
): Promise<EntraResponse> {
  return post('/signin/password', { continuationToken, password })
}

export function signinMfaMethods(continuationToken: string): Promise<EntraResponse> {
  return post('/signin/mfa/methods', { continuationToken })
}

export function signinMfaChallenge(
  continuationToken: string,
  methodId: string,
): Promise<EntraResponse> {
  return post('/signin/mfa/challenge', { continuationToken, methodId })
}

export function signinMfaVerify(continuationToken: string, code: string): Promise<EntraResponse> {
  return post('/signin/mfa/verify', { continuationToken, code })
}

// --- MFA (strong auth) registration --------------------------------------

export function mfaRegisterMethods(continuationToken: string): Promise<EntraResponse> {
  return post('/mfa/register/methods', { continuationToken })
}

export function mfaRegisterChallenge(args: {
  continuationToken: string
  methodId: string
  challengeTarget?: string
  challengeChannel?: string
}): Promise<EntraResponse> {
  return post('/mfa/register/challenge', {
    continuationToken: args.continuationToken,
    methodId: args.methodId,
    challengeTarget: args.challengeTarget || undefined,
    challengeChannel: args.challengeChannel || undefined,
  })
}

export function mfaRegisterVerify(
  continuationToken: string,
  code?: string,
): Promise<EntraResponse> {
  return post('/mfa/register/verify', { continuationToken, code: code || undefined })
}

// --- Token utilities -----------------------------------------------------

export function tokenContinue(continuationToken: string): Promise<EntraResponse> {
  return post('/token/continue', { continuationToken })
}

export function tokenRefresh(refreshToken: string): Promise<EntraResponse> {
  return post('/token/refresh', { refreshToken })
}
