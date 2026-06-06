// CareAtlas API client.
//
// All ServiceNow communication now lives in the FastAPI backend (see /server).
// The frontend only ever talks to our own API. In dev, requests to /api are
// proxied to the backend (see vite.config.ts); in prod, set VITE_API_BASE_URL
// to the deployed API origin.

export interface SnowAISystem {
  sys_id: string
  name: string
  display_name: string
  agent_type: string
  strategy: string
  role: string
  description: string
  proficiency: string
  instructions: string
  condition: string
}

export interface ExecuteAgentResponse {
  request_id: string
  output: string
  context_id?: string | null
  task_id?: string | null
  state?: string | null
  status?: 'pending' | 'completed' | 'error' | string
  error?: string | null
}

export interface AclTestCheck {
  label: string
  expected: 'allowed' | 'denied'
  actual: 'allowed' | 'denied' | 'inconclusive' | 'error'
  passed: boolean
  table: string
  fields: string[]
  status_code?: number | null
  detail: string
}

export interface AclTestResponse {
  service_account: string
  overall_status: 'passed' | 'failed' | 'inconclusive' | 'error'
  checks: AclTestCheck[]
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body?.detail || JSON.stringify(body)
  } catch {
    return res.statusText
  }
}

export async function fetchUnmanagedAIStewardSystems(): Promise<SnowAISystem[]> {
  const res = await fetch(`${API_BASE}/agents`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as SnowAISystem[]
}

export async function executeAgent(
  agentSysId: string,
  userInput: string,
  contextId?: string | null,
  taskId?: string | null
): Promise<ExecuteAgentResponse> {
  const res = await fetch(`${API_BASE}/agents/execute`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_sys_id: agentSysId,
      user_input: userInput,
      context_id: contextId || undefined,
      task_id: taskId || undefined,
    }),
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  const data: ExecuteAgentResponse = await res.json()
  return { ...data, output: data.output ?? '' }
}

export async function fetchAgentExecution(requestId: string): Promise<ExecuteAgentResponse> {
  const res = await fetch(`${API_BASE}/agents/execute/${encodeURIComponent(requestId)}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  const data: ExecuteAgentResponse = await res.json()
  return { ...data, output: data.output ?? '' }
}

export async function validateServiceNowUserCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/validate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  const data: { valid?: boolean } = await res.json()
  return Boolean(data.valid)
}

export async function testServiceAccountAcl(serviceAccount: string): Promise<AclTestResponse> {
  const res = await fetch(`${API_BASE}/acl/test`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ service_account: serviceAccount }),
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as AclTestResponse
}
