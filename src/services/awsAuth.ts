const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export interface AwsAuthTokens {
  status: 'AUTH_SUCCESS'
  id_token: string
  access_token: string
  refresh_token?: string | null
}

export interface AwsLoginMfaSetupRequired {
  status: 'MFA_SETUP_REQUIRED'
  session: string
}

export interface AwsLoginMfaRequired {
  status: 'MFA_REQUIRED'
  session: string
}

export interface AwsLoginChallenge {
  status: 'CHALLENGE'
  challenge_name: string
  session: string
}

export type AwsLoginResponse =
  | AwsAuthTokens
  | AwsLoginMfaSetupRequired
  | AwsLoginMfaRequired
  | AwsLoginChallenge

export interface AwsRegisterResponse {
  status: 'SIGNUP_AND_CONFIRMED'
  user_sub: string
}

export interface AwsMfaSetupStartResponse {
  status: 'MFA_SETUP_TOKEN_CREATED'
  secret: string
  session: string
  otpauth_url: string
  qr_image_data_url: string
}

export interface AwsValidatedUser {
  status: 'VALID'
  username: string
  attributes: Record<string, string>
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body?.detail || JSON.stringify(body)
  } catch {
    return res.statusText
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as T
}

export function registerAwsPatient(name: string, email: string, password: string) {
  return postJson<AwsRegisterResponse>('/aws/register', { name, email, password })
}

export function loginAwsPatient(username: string, password: string) {
  return postJson<AwsLoginResponse>('/aws/login', { username, password })
}

export function completeAwsNewPasswordChallenge(
  session: string,
  username: string,
  newPassword: string,
  name: string,
) {
  return postJson<AwsLoginResponse>('/aws/login/new-password', {
    session,
    username,
    new_password: newPassword,
    name,
  })
}

export function startAwsMfaSetup(session: string, username: string) {
  return postJson<AwsMfaSetupStartResponse>('/aws/mfa/setup/start', { session, username })
}

export function verifyAwsMfaSetup(session: string, username: string, code: string) {
  return postJson<AwsAuthTokens>('/aws/mfa/setup/verify', { session, username, code })
}

export function verifyAwsLoginMfa(session: string, username: string, code: string) {
  return postJson<AwsAuthTokens>('/aws/login/verify-mfa', { session, username, code })
}

export function validateAwsToken(accessToken: string) {
  return postJson<AwsValidatedUser>('/aws/token/validate', { access_token: accessToken })
}

export function logoutAwsPatient(accessToken: string) {
  return postJson<{ status: 'LOGOUT_SUCCESSFUL' }>('/aws/logout', { access_token: accessToken })
}
