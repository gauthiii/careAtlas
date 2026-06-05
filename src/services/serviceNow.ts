// ServiceNow AI Control Tower — AI agent inventory
//
// Confirmed table (from /sn_aia_agent.do XML export):
//   sn_aia_agent
//
// Local dev uses /api/snow (Vite injects Basic Auth — see vite.config.ts).
// GitHub Pages is static, so deployed builds read a generated snapshot JSON.

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

// ServiceNow returns reference fields as { value, display_value } when sysparm_display_value=true
type SnowField = { display_value: string; value: string } | string

function displayVal(f: SnowField | undefined): string {
  return typeof f === 'object' && f !== null ? f.display_value : (f ?? '')
}

interface RawRecord {
  sys_id: SnowField
  name: SnowField
  internal_name: SnowField
  agent_type: SnowField
  strategy: SnowField
  role: SnowField
  description: SnowField
  proficiency: SnowField
  instructions: SnowField
  condition: SnowField
}

// Fields pulled from sn_aia_agent for the AI Agent inventory view.
const AGENT_FIELDS = [
  'sys_id',
  'name',
  'internal_name',
  'agent_type',
  'strategy',
  'role',
  'description',
  'proficiency',
  'instructions',
  'condition',
] as const

// Show every agent created on or after this date (newest first), not just a fixed page.
const AGENT_QUERY = 'sys_created_on>=2026-06-02 00:00:00^ORDERBYDESCsys_created_on'

function getServiceNowInventoryUrl(params: URLSearchParams): string {
  const proxyBase = import.meta.env.VITE_SNOW_API_BASE

  if (proxyBase) {
    return `${normalizeBase(proxyBase)}/api/now/table/sn_aia_agent?${params}`
  }

  if (import.meta.env.DEV) {
    return `/api/snow/api/now/table/sn_aia_agent?${params}`
  }

  return `${import.meta.env.BASE_URL}snow-ai-agent-inventory.json`
}

function getServiceNowApiUrl(path: string, params: URLSearchParams): string {
  const proxyBase = import.meta.env.VITE_SNOW_API_BASE

  if (proxyBase) {
    return `${normalizeBase(proxyBase)}${path}?${params}`
  }

  if (import.meta.env.DEV) {
    return `/api/snow${path}?${params}`
  }

  throw new Error('ServiceNow login checks need a deployed API proxy.')
}

function normalizeBase(base: string): string {
  return base.replace(/\/$/, '')
}

export async function fetchUnmanagedAIStewardSystems(): Promise<SnowAISystem[]> {
  const params = new URLSearchParams({
    sysparm_query: AGENT_QUERY,
    sysparm_fields: AGENT_FIELDS.join(','),
    sysparm_display_value: 'true',
  })

  const res = await fetch(getServiceNowInventoryUrl(params), {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      const errorMessage = body?.error?.message
      const errorDetail = body?.error?.detail
      detail = [errorMessage, errorDetail].filter(Boolean).join(': ') || JSON.stringify(body)
    } catch { /* ignore parse errors */ }
    throw new Error(`ServiceNow ${res.status}: ${detail}`)
  }

  const data: { result: RawRecord[] } = await res.json()

  return (data.result ?? []).map((r) => ({
    sys_id: displayVal(r.sys_id),
    name: displayVal(r.name),
    display_name: displayVal(r.internal_name),
    agent_type: displayVal(r.agent_type),
    strategy: displayVal(r.strategy),
    role: displayVal(r.role),
    description: displayVal(r.description),
    proficiency: displayVal(r.proficiency),
    instructions: displayVal(r.instructions),
    condition: displayVal(r.condition),
  }))
}

export async function validateServiceNowUserCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const trimmedUsername = username.trim()

  if (!trimmedUsername || !password) {
    return false
  }

  const params = new URLSearchParams({
    sysparm_query: `user_name=${trimmedUsername}^active=true`,
    sysparm_fields: 'sys_id,user_name,name,active',
    sysparm_display_value: 'true',
    sysparm_limit: '1',
  })

  const res = await fetch(getServiceNowApiUrl('/api/now/table/sys_user', params), {
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${btoa(`${trimmedUsername}:${password}`)}`,
    },
  })

  if (res.status === 401 || res.status === 403) {
    return false
  }

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      const errorMessage = body?.error?.message
      const errorDetail = body?.error?.detail
      detail = [errorMessage, errorDetail].filter(Boolean).join(': ') || JSON.stringify(body)
    } catch {
      // Keep the HTTP status text when ServiceNow does not return JSON.
    }
    throw new Error(`ServiceNow ${res.status}: ${detail}`)
  }

  const data: { result?: RawRecord[] } = await res.json()
  return (data.result ?? []).length > 0
}
