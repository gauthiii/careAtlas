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
  agent_type: string
  role: string
  description: string
  active: string
}

// ServiceNow returns reference fields as { value, display_value } when sysparm_display_value=true
type SnowField = { display_value: string; value: string } | string

function displayVal(f: SnowField): string {
  return typeof f === 'object' && f !== null ? f.display_value : (f ?? '')
}

interface RawRecord {
  sys_id: SnowField
  name: SnowField
  agent_type: SnowField
  role: SnowField
  description: SnowField
  active: SnowField
}

function getServiceNowInventoryUrl(params: URLSearchParams): string {
  const proxyBase = import.meta.env.VITE_SNOW_API_BASE

  if (proxyBase) {
    const normalizedBase = proxyBase.replace(/\/$/, '')
    return `${normalizedBase}/api/now/table/sn_aia_agent?${params}`
  }

  if (import.meta.env.DEV) {
    return `/api/snow/api/now/table/sn_aia_agent?${params}`
  }

  return `${import.meta.env.BASE_URL}snow-ai-agent-inventory.json`
}

export async function fetchUnmanagedAIStewardSystems(): Promise<SnowAISystem[]> {
  const params = new URLSearchParams({
    sysparm_query: 'ORDERBYDESCsys_created_on',
    sysparm_fields: [
      'sys_id',
      'name',
      'agent_type',
      'role',
      'description',
      'active',
    ].join(','),
    sysparm_display_value: 'true',
    sysparm_limit: '10',
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
    agent_type: displayVal(r.agent_type),
    role: displayVal(r.role),
    description: displayVal(r.description),
    active: displayVal(r.active),
  }))
}
