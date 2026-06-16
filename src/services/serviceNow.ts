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

export interface SnowAIAsset {
  sys_id: string
  name: string
  display_name: string
  asset_type: string
  vendor: string
  managed_by: string
  lifecycle_phase: string
  state: string
  lifecycle_status: string
  risk_classification: string
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

/** ServiceNow sys_id of the patient Book Appointment scheduling agent. */
export const BOOK_APPOINTMENT_AGENT_ID = 'b2cdf70e1bd50f54d7eaea45604bcb0c'

/** ServiceNow sys_id of the unrestricted Bad Patient Agent (no ACL — leaks PII). */
export const BAD_PATIENT_AGENT_ID = 'e175cd041ba54f94b72fc9d3604bcb4c'

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
  triage_priority: string
  patient_id: string
  patient_display: string
}

export interface BookingCalendarDay {
  date: string
  label: string
  appointments: BookingAppointment[]
}

export interface BookingCalendarResponse {
  start_date: string
  end_date: string
  days: BookingCalendarDay[]
  doctors: BookingDoctor[]
  appointments: BookingAppointment[]
}

export interface BookPatientAppointmentRequest {
  email?: string | null
  username?: string | null
  name?: string | null
  doctor_record_id: string
  date: string
  start_time: string
  visit_type: string
  reason_category: string
  specialty?: string | null
  concern?: string | null
  insurance_provider?: string | null
  member_id?: string | null
  accessibility?: string | null
  interpreter?: string | null
}

export interface PasswordPwnedCheckResponse {
  pwned: boolean
  count: number
}

export interface PatientRegistrationSummary {
  sys_id: string
  patient_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  health_condition: string
  registration_status: string
  account_status: string
  confidence_score: string
  profile_complete: boolean
  created_on: string
}

export interface DoctorAppointmentOption {
  appointment_record_id: string
  appointment_id: string
  date: string
  start_time: string
  status: string
  status_label: string
  reason_category: string
  reason_text: string
  triage_priority: string
  patient_sys_id: string
  patient_name: string
}

export interface SummaryNote {
  sys_id: string
  summary_note_id: string
  appointment_record_id: string
  appointment_id: string
  doctor_record_id: string
  doctor_name: string
  patient_sys_id: string
  patient_name: string
  date: string
  start_time: string
  notes: string
  logged_by: string
  created_on: string
}

export interface CreateSummaryNoteRequest {
  appointment_record_id: string
  notes: string
  logged_by?: string | null
}

export interface AiDecisionLogEntry {
  sys_id: string
  log_id: string
  timestamp: string
  confidence_score: string
  model_version: string
  patient_anon: string
  reason_parsed: string
  triage_input: string
  slots_considered: string
  slots_returned: string
  appointment: string
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

export interface RegisterAgentPayload {
  name: string
  description: string
  instructions: string
  active: boolean
}

export interface RegisterAgentResult {
  sys_id: string
  name: string
}

export async function registerAgent(payload: RegisterAgentPayload): Promise<RegisterAgentResult> {
  const res = await fetch(`${API_BASE}/agents/register`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as RegisterAgentResult
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

export async function fetchManagedAIAssets(): Promise<SnowAIAsset[]> {
  const res = await fetch(`${API_BASE}/agents/managed`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as SnowAIAsset[]
}

export async function fetchUnmanagedAIAssets(): Promise<SnowAIAsset[]> {
  const res = await fetch(`${API_BASE}/agents/unmanaged`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as SnowAIAsset[]
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

export async function bookPatientAppointment(
  booking: BookPatientAppointmentRequest,
): Promise<BookingAppointment> {
  const res = await fetch(`${API_BASE}/patients/booking/appointments`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(booking),
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as BookingAppointment
}

export async function fetchPatientRegistrations(
  status?: string,
  limit = 100,
): Promise<PatientRegistrationSummary[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (status?.trim()) params.set('status', status.trim())

  const res = await fetch(`${API_BASE}/staff/registrations?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as PatientRegistrationSummary[]
}

export async function fetchDoctorAppointmentOptions(
  doctorSysId: string,
): Promise<DoctorAppointmentOption[]> {
  const params = new URLSearchParams({ doctor_sys_id: doctorSysId })
  const res = await fetch(`${API_BASE}/staff/appointment-options?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as DoctorAppointmentOption[]
}

export async function fetchAppointment(recordId: string): Promise<DoctorAppointmentOption> {
  const params = new URLSearchParams({ record_id: recordId })
  const res = await fetch(`${API_BASE}/staff/appointment?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as DoctorAppointmentOption
}

export async function fetchSummaryNotes(
  filters: { doctorSysId?: string; appointmentRecordId?: string; patientSysId?: string } = {},
  limit = 200,
): Promise<SummaryNote[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (filters.doctorSysId?.trim()) params.set('doctor_sys_id', filters.doctorSysId.trim())
  if (filters.appointmentRecordId?.trim())
    params.set('appointment_record_id', filters.appointmentRecordId.trim())
  if (filters.patientSysId?.trim()) params.set('patient_sys_id', filters.patientSysId.trim())

  const res = await fetch(`${API_BASE}/staff/summary-notes?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as SummaryNote[]
}

export async function updateSummaryNote(sysId: string, notes: string): Promise<SummaryNote> {
  const res = await fetch(`${API_BASE}/staff/summary-notes`, {
    method: 'PATCH',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ sys_id: sysId, notes }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as SummaryNote
}

export async function deleteSummaryNote(sysId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/staff/summary-notes/${encodeURIComponent(sysId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
}

export interface AppointmentUpdate {
  record_id: string
  status?: string
  date?: string
  start_time?: string
}

export async function updateAppointment(update: AppointmentUpdate): Promise<DoctorAppointmentOption> {
  const res = await fetch(`${API_BASE}/staff/appointments`, {
    method: 'PATCH',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as DoctorAppointmentOption
}

export interface CreateClinicianAppointmentRequest {
  doctor_record_id: string
  patient_sys_id: string
  date: string
  start_time: string
  reason_category?: string
  reason_text?: string
}

export async function createClinicianAppointment(
  req: CreateClinicianAppointmentRequest,
): Promise<DoctorAppointmentOption> {
  const res = await fetch(`${API_BASE}/staff/appointments`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as DoctorAppointmentOption
}

export async function updateRegistrationStatus(
  sysId: string,
  registrationStatus: string,
): Promise<PatientRegistrationSummary> {
  const res = await fetch(`${API_BASE}/staff/registrations`, {
    method: 'PATCH',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ sys_id: sysId, registration_status: registrationStatus }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as PatientRegistrationSummary
}

export interface PatientProfileUpdate {
  sys_id: string
  phone?: string
  address_line1?: string
  address_line2?: string
  city?: string
  postcode?: string
  emergency_name?: string
  emergency_phone?: string
  emergency_relationship?: string
  time_preference?: string
  primary_language?: string
}

export async function updatePatientProfile(update: PatientProfileUpdate): Promise<PatientProfile> {
  const res = await fetch(`${API_BASE}/patients/profile`, {
    method: 'PATCH',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as PatientProfile
}

export async function createSummaryNote(
  note: CreateSummaryNoteRequest,
): Promise<SummaryNote> {
  const res = await fetch(`${API_BASE}/staff/summary-notes`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(note),
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as SummaryNote
}

export async function fetchAiDecisionLog(limit = 25): Promise<AiDecisionLogEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  const res = await fetch(`${API_BASE}/governance/decision-log?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as AiDecisionLogEntry[]
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
