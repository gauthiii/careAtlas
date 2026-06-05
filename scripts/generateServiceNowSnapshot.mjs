import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const {
  SNOW_INSTANCE,
  SNOW_USERNAME,
  SNOW_PASSWORD,
} = process.env

const outputPath = resolve('public/snow-ai-agent-inventory.json')

if (!SNOW_INSTANCE || !SNOW_USERNAME || !SNOW_PASSWORD) {
  throw new Error('Missing SNOW_INSTANCE, SNOW_USERNAME, or SNOW_PASSWORD.')
}

const params = new URLSearchParams({
  sysparm_query: 'ORDERBYDESCsys_created_on',
  sysparm_fields: [
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
  ].join(','),
  sysparm_display_value: 'true',
  sysparm_limit: '10',
})

const credentials = Buffer.from(`${SNOW_USERNAME}:${SNOW_PASSWORD}`).toString('base64')
const url = `https://${SNOW_INSTANCE}/api/now/table/sn_aia_agent?${params}`

const res = await fetch(url, {
  headers: {
    Accept: 'application/json',
    Authorization: `Basic ${credentials}`,
  },
})

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

const body = await res.json()

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(body, null, 2)}\n`)

console.log(`Wrote ServiceNow AI agent snapshot to ${outputPath}`)
