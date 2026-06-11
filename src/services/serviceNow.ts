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

export interface PatientRegistrationRequest {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  ethnicity: string
  primary_language: string
  phone: string
  email: string
  address_line1: string
  address_line2?: string | null
  city: string
  postcode: string
  health_condition: string
  accessibility: string
  insurance_id?: string | null
  emergency_name: string
  emergency_phone: string
  emergency_relationship: string
  username: string
  consent_accepted: boolean
}

export interface PatientRegistrationResponse {
  message: string
  sys_id: string
  patient_id: string
  first_name: string
  last_name: string
  email: string
  registration_status: string
}

export interface PatientProfile {
  sys_id: string
  patient_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  ethnicity: string
  primary_language: string
  phone: string
  email: string
  address_line1: string
  address_line2: string
  city: string
  postcode: string
  state_region: string
  health_condition: string
  accessibility: string
  insurance_id: string
  insurance_provider: string
  emergency_name: string
  emergency_phone: string
  emergency_relationship: string
  username: string
  registration_status: string
  account_status: string
  email_verified: boolean
  profile_complete: boolean
  blood_type: string
  known_allergies: string
  active_since: string
  confidence_score: string
  consent_accepted: boolean
  privacy_notice_version: string
  time_preference: string
  last_updated: string
}

export interface PatientProfileLookup {
  email?: string
  username?: string
  name?: string
}

export interface BookingDoctor {
  doctor_id: string
  doctor_record_id: string
  name: string
  first_name: string
  last_name: string
  department: string
  speciality: string
  email: string
  active: boolean
}

export interface BookingAppointmentOverlay {
  appointment_id: string
  appointment_record_id: string
  status: string
  reason_category: string
  reason_text: string
  patient_id: string
  patient_display: string
}

export interface BookingAppointment {
  appointment_id: string
  appointment_record_id: string
  doctor_id: string
  doctor_record_id: string
  doctor_name: string
  department: string
  speciality: string
  date: string
  start_time: string
  status: string
  status_label: string
  reason_category: string
  reason_text: string
  patient_id: string
  patient_display: string
}

export interface BookingSlot {
  slot_id: string
  slot_record_id: string
  doctor_id: string
  doctor_record_id: string
  doctor_name: string
  department: string
  speciality: string
  date: string
  start_time: string
  end_time: string
  status: string
  status_label: string
  appointment_type: string
  appointment_type_label: string
  location: string
  floor: string
  selectable: boolean
  appointment?: BookingAppointmentOverlay | null
}

export interface BookingCalendarDay {
  date: string
  label: string
  appointments: BookingAppointment[]
  slots: BookingSlot[]
}

export interface BookingCalendarResponse {
  start_date: string
  end_date: string
  days: BookingCalendarDay[]
  doctors: BookingDoctor[]
  appointments: BookingAppointment[]
  slots: BookingSlot[]
}

export interface PasswordPwnedCheckResponse {
  pwned: boolean
  count: number
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
  taskId?: string | null,
  systemContext?: string | null
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
      system_context: systemContext || undefined,
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

export async function registerPatient(
  registration: PatientRegistrationRequest
): Promise<PatientRegistrationResponse> {
  const res = await fetch(`${API_BASE}/patients/register`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(registration),
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as PatientRegistrationResponse
}

export async function fetchPatientProfile(lookup: PatientProfileLookup): Promise<PatientProfile | null> {
  const params = new URLSearchParams()
  if (lookup.email?.trim()) params.set('email', lookup.email.trim())
  if (lookup.username?.trim()) params.set('username', lookup.username.trim())
  if (lookup.name?.trim()) params.set('name', lookup.name.trim())

  if (!params.toString()) return null

  const res = await fetch(`${API_BASE}/patients/profile?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })

  if (res.status === 404) return null

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as PatientProfile
}

export async function checkPwnedPassword(password: string): Promise<PasswordPwnedCheckResponse> {
  const res = await fetch(`${API_BASE}/passwords/pwned-check`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as PasswordPwnedCheckResponse
}

export async function fetchPatientBookingAvailability(
  startDate: string,
  days = 14,
): Promise<BookingCalendarResponse> {
  const params = new URLSearchParams({ start_date: startDate, days: String(days) })
  const res = await fetch(`${API_BASE}/patients/booking/availability?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as BookingCalendarResponse
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
