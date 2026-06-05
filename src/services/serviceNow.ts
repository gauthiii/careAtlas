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
