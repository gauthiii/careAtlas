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

export interface RegulatoryEvidenceCandidate {
  sys_id: string
  name: string
  state: string
  risk_classification: string
  updated_on: string
  evidence_url: string
}

export interface RegulatoryEvidence {
  query: string
  target_sys_id: string
  target_name: string
  state: string
  risk_classification: string
  evidence_url: string
  candidates: RegulatoryEvidenceCandidate[]
  assessment_tasks_count: number
  risk_assessment_results_count: number
  entity_maps_count: number
  post_assessment_actions_count: number
  fria_actions_active_count: number
  fria_actions_inactive_count: number
  has_ai_system_record: boolean
  has_completed_classification: boolean
  has_assessment_task: boolean
  has_risk_assessment_result: boolean
  has_entity_mapping: boolean
  has_post_assessment_actions: boolean
  fria_attached: boolean
  demo_ready: boolean
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
  operation: 'read' | 'write'
  status_code?: number | null
  detail: string
}

export interface AclTestResponse {
  service_account: string
  overall_status: 'passed' | 'failed' | 'inconclusive' | 'error'
  checks: AclTestCheck[]
}

export interface AclSummary {
  agents_tested: number
  agents_passed: number
  checks_total: number
  access_blocked: number
  write_denials: number
  leaks: number
}

export async function fetchAclSummary(): Promise<AclSummary> {
  const res = await fetch(`${API_BASE}/acl/summary`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as AclSummary
}

export interface ApprovalLogEntry {
  sys_id: string
  timestamp: string
  decision: 'approved' | 'denied' | 'unknown'
  detail: string
  created_by: string
}

export async function fetchApprovalLog(limit = 50): Promise<ApprovalLogEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  const res = await fetch(`${API_BASE}/governance/approval/log?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as ApprovalLogEntry[]
}

export interface ApprovalRecord {
  request_id: string
  intent: string
  high_impact: boolean
  reason: string
  status: 'pending_approval' | 'auto_completed' | 'approved' | 'denied'
  approver: string
  audit_logged: boolean
}

export interface ScopedFieldValue {
  label: string
  value: string
}

export interface ScopedAgentAnswer {
  kind: 'scoped_data' | 'approval' | 'info'
  agent_key: string
  agent_label: string
  agent_username: string
  scope: string
  patient_ref: string
  allowed: ScopedFieldValue[]
  denied: string[]
  reply: string
  request_id: string
  intent: string
  reason: string
}

export async function askScopedAgent(input: {
  agentKey: string
  question: string
  patientEmail?: string
  patientSysId?: string
}): Promise<ScopedAgentAnswer> {
  const res = await fetch(`${API_BASE}/governance/agent/ask`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_key: input.agentKey,
      question: input.question,
      patient_email: input.patientEmail ?? '',
      patient_sys_id: input.patientSysId ?? '',
    }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as ScopedAgentAnswer
}

export async function submitApprovalIntent(intent: string): Promise<ApprovalRecord> {
  const res = await fetch(`${API_BASE}/governance/approval/submit`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as ApprovalRecord
}

export async function decideApproval(
  requestId: string,
  decision: 'approve' | 'deny',
  approver: string,
): Promise<ApprovalRecord> {
  const res = await fetch(`${API_BASE}/governance/approval/${requestId}/decision`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, approver }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as ApprovalRecord
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

export interface PatientSearchResult {
  sys_id: string
  patient_id: string
  name: string
  email: string
}

export async function searchPatients(q: string, limit = 8): Promise<PatientSearchResult[]> {
  const term = q.trim()
  if (term.length < 2) return []
  const params = new URLSearchParams({ q: term, limit: String(limit) })
  const res = await fetch(`${API_BASE}/patients/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }
  return (await res.json()) as PatientSearchResult[]
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

export interface Llm02AuditEntry {
  sys_id: string
  log_id: string
  timestamp: string
  agent_identity: string
  action_type: string
  final_action: string
  rejection_reason: string
  patient_id_anon: string
  agent_authorised: boolean
  created_by: string
}

export async function flagLlm02Event(requestText: string): Promise<Llm02AuditEntry> {
  const res = await fetch(`${API_BASE}/governance/llm02/flag`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ request_text: requestText }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as Llm02AuditEntry
}

export async function fetchLlm02AuditLog(): Promise<Llm02AuditEntry[]> {
  const res = await fetch(`${API_BASE}/governance/llm02/audit-log`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as Llm02AuditEntry[]
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

export async function fetchRegulatoryEvidence(query = 'Triage Appointment DG1'): Promise<RegulatoryEvidence> {
  const params = new URLSearchParams({ query })
  const res = await fetch(`${API_BASE}/governance/regulation/evidence?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as RegulatoryEvidence
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

export interface PiiFieldAclStatus {
  field: string
  label: string
  protected: boolean
}

export interface PrivacyControls {
  pii_acl_status: 'enforced' | 'partial' | 'off'
  protected_field_count: number
  pii_fields: PiiFieldAclStatus[]
  deny_probe_ran: boolean
  deny_probe_passed: boolean
  deny_probe_detail: string
  visible_pii_fields: string[]
  redaction_on: boolean
  active_pii_filters: number
  active_filter_total: number
  pii_pattern_count: number
  anonymization_rate: number
  decision_log_rows: number
  anonymized_rows: number
}

export async function fetchPrivacyControls(): Promise<PrivacyControls> {
  const res = await fetch(`${API_BASE}/governance/privacy-controls`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as PrivacyControls
}

export interface AgentIdentity {
  key: 'restricted' | 'privileged'
  label: string
  username: string
  role: string
  has_pii_role: boolean
  served_by: string
  reachable: boolean
  note: string
}

export interface PatientFieldAccess {
  key: string
  label: string
  category: 'pii' | 'safe'
  privileged_value: string
  restricted_value: string
  redacted_for_restricted: boolean
}

export interface PatientAccessComparison {
  patient_sys_id: string
  patient_ref: string
  restricted: AgentIdentity
  privileged: AgentIdentity
  fields: PatientFieldAccess[]
  redacted_count: number
}

export async function fetchPatientAccessComparison(
  opts?: string | { q?: string; sysId?: string },
): Promise<PatientAccessComparison> {
  const params = new URLSearchParams()
  // Back-compat: a bare string is treated as the `q` search term.
  const normalized = typeof opts === 'string' ? { q: opts } : (opts ?? {})
  if (normalized.q && normalized.q.trim()) params.set('q', normalized.q.trim())
  if (normalized.sysId && normalized.sysId.trim()) params.set('sys_id', normalized.sysId.trim())
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE}/governance/privacy/patient-lookup${suffix}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await readError(res)}`)
  }

  return (await res.json()) as PatientAccessComparison
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

// ---------------------------------------------------------------------------
// Notification reminders
// ---------------------------------------------------------------------------

export type NotificationAudience = 'patient' | 'staff'

export interface NotificationItem {
  sys_id: string
  notification_id: string
  audience: string
  notification_type: string
  message: string
  patient_sys_id: string
  patient_name: string
  doctor_sys_id: string
  doctor_name: string
  appointment_sys_id: string
  summary_note_sys_id: string
  patient_read: boolean
  staff_read: boolean
  event_time: string
  created_on: string
}

interface NotificationListResponse {
  items: NotificationItem[]
}

/** Fetch notifications for a patient (by patient sys_id) or a doctor (by doctor sys_id). */
export async function fetchNotifications(params: {
  audience: NotificationAudience
  patientId?: string | null
  doctorId?: string | null
}): Promise<NotificationItem[]> {
  const search = new URLSearchParams({ audience: params.audience })
  if (params.audience === 'patient' && params.patientId) search.set('patient_id', params.patientId)
  if (params.audience === 'staff' && params.doctorId) search.set('doctor_id', params.doctorId)

  const res = await fetch(`${API_BASE}/notifications?${search.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  const body = (await res.json()) as NotificationListResponse
  return body.items ?? []
}

/** Mark a single notification read for the given audience. */
export async function markNotificationRead(
  sysId: string,
  audience: NotificationAudience,
): Promise<void> {
  const res = await fetch(`${API_BASE}/notifications/${encodeURIComponent(sysId)}/read`, {
    method: 'PATCH',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ audience }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
}

// ---------------------------------------------------------------------------
// UC6 Fairness — Non-Discriminatory Scheduling
// ---------------------------------------------------------------------------

export interface FairnessGroupItem {
  group: string
  pct: number
  expected: number
  count: number
  skewed: boolean
}

export interface FairnessData {
  by_gender: FairnessGroupItem[]
  by_ethnicity: FairnessGroupItem[]
  by_age: FairnessGroupItem[]
  total_appointments: number
  bias_risk_statements: string[]
  fairness_metric_count: number
  max_skew_pp: number
  skew_alert: boolean
}

export async function fetchFairnessData(): Promise<FairnessData> {
  const res = await fetch(`${API_BASE}/governance/fairness`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as FairnessData
}

// ---------------------------------------------------------------------------
// UC5 Security — Prompt-Injection Defense + Output-Pattern Detection
// ---------------------------------------------------------------------------

export interface MatchedPattern {
  name: string
  surface: 'input' | 'output'
}

export interface GuardrailScanResult {
  verdict: 'blocked' | 'flagged' | 'clean'
  matched_patterns: MatchedPattern[]
  action: string
  ai_case_number: string | null
  ai_case_sys_id: string | null
}

export interface SecurityKpis {
  ai_cases_open: number
  active_injection_filters: number
  injection_output_patterns: number
  automation_rules_active: number
  recent_cases: Array<{
    number: string
    short_description: string
    created_on: string
    priority: string
    state: string
  }>
}

export async function scanGuardrailApi(text: string): Promise<GuardrailScanResult> {
  const res = await fetch(`${API_BASE}/governance/guardrail/scan`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as GuardrailScanResult
}

export async function fetchSecurityKpis(): Promise<SecurityKpis> {
  const res = await fetch(`${API_BASE}/governance/security-kpis`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await readError(res)}`)
  return (await res.json()) as SecurityKpis
}
