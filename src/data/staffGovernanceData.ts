import { appointmentHistory, patient } from './patientPortalData'

export const staffAppointments = appointmentHistory.map((appointment, index) => ({
  id: appointment.id,
  date: appointment.date,
  time: appointment.time,
  doctor: appointment.doctor,
  department: appointment.department,
  reason: appointment.reason,
  status: index === 0 ? 'confirmed' : index === 1 ? 'checked in' : 'completed',
  patient: index === 0 ? `${patient.firstName} ${patient.lastName}` : ['Jordan Brooks', 'Priya Singh', 'Owen Miller'][index - 1] ?? 'Maya Patel',
}))

export const staffPatients = [
  {
    id: 'P-1048',
    name: `${patient.firstName} ${patient.lastName}`,
    dob: patient.dob,
    ethnicity: patient.ethnicity,
    language: patient.language,
    condition: patient.condition,
    phone: patient.phone,
    email: patient.email,
    address: `${patient.street1}, ${patient.city}, AZ ${patient.zip}`,
  },
  {
    id: 'P-2193',
    name: 'Jordan Brooks',
    dob: '1992-10-03',
    ethnicity: 'Mixed',
    language: 'English',
    condition: 'Mental health',
    phone: '(602) 555-0171',
    email: 'jordan.brooks@example.com',
    address: '77 Desert Willow St, Tempe, AZ 85281',
  },
]

export const aiDecisions = [
  { time: '08:42', slot: 'June 4, 9:20 AM', confidence: '94%', factors: 'condition priority, accessibility, physician continuity' },
  { time: '08:43', slot: 'Committed booking', confidence: 'Validated', factors: 'slot lock, no double-booking, audit log written' },
  { time: '08:45', slot: 'Profile accepted', confidence: '89%', factors: 'email match, coverage ID, phone verification' },
]

export const pendingApprovals = [
  { patient: 'Avery Long', condition: 'Urgent', confidence: '62%', reason: 'Address mismatch requires review' },
  { patient: 'Camila Rivera', condition: 'Preventative care', confidence: '71%', reason: 'Coverage ID pending validation' },
  { patient: 'Sam Taylor', condition: 'Mental health', confidence: '58%', reason: 'Duplicate profile candidate' },
]

export const adminCases = [
  { ref: 'CASE-7802', subject: 'Appointment query', patient: 'Maya Patel', age: '18m', status: 'New' },
  { ref: 'CASE-7791', subject: 'Billing', patient: 'Theo Adams', age: '2h', status: 'Assigned' },
  { ref: 'CASE-7788', subject: 'Technical issue', patient: 'Rina Shah', age: '4h', status: 'Waiting' },
]

export type AvailabilityTone = 'green' | 'blue' | 'gray'

export const weeklyAvailability: {
  day: string
  label: string
  time: string
  tone: AvailabilityTone
}[] = [
  { day: 'Mon', label: 'Available', time: '09:00-12:00', tone: 'green' },
  { day: 'Tue', label: 'Booked', time: '10:00-11:00', tone: 'blue' },
  { day: 'Wed', label: 'Training', time: '13:00-16:00', tone: 'gray' },
  { day: 'Thu', label: 'Telehealth', time: '09:30-12:30', tone: 'green' },
  { day: 'Fri', label: 'Admin time', time: '14:00-17:00', tone: 'gray' },
]

export const agents = [
  { name: 'Scheduling Ranker', status: 'active', last: '2 min ago', ci: 'CI-AI-2401', identity: 'nhid-schedule-01' },
  { name: 'Identity Verifier', status: 'active', last: '7 min ago', ci: 'CI-AI-2402', identity: 'nhid-verify-02' },
  { name: 'Appointment Summarizer', status: 'paused', last: '42 min ago', ci: 'CI-AI-2403', identity: 'nhid-summary-03' },
  { name: 'Legacy Slot Optimizer', status: 'quarantined', last: '1 day ago', ci: 'CI-AI-1988', identity: 'unknown' },
]

export const fairnessData = [
  { group: 'Asian', slots: 28, color: '#2563eb' },
  { group: 'Black', slots: 18, color: '#d97706' },
  { group: 'Mixed', slots: 25, color: '#059669' },
  { group: 'White', slots: 31, color: '#7c3aed' },
  { group: 'Other', slots: 17, color: '#dc2626' },
]

export const injectionAlerts = [
  { time: '09:14', session: 'S-9130', confidence: '98%', action: 'blocked' },
  { time: '08:52', session: 'S-9119', confidence: '91%', action: 'flagged' },
  { time: '08:17', session: 'S-9098', confidence: '96%', action: 'blocked' },
  { time: '07:44', session: 'S-9062', confidence: '88%', action: 'flagged' },
]

export const accessViolations = [
  { time: '09:21', agent: 'Scheduling Ranker', resource: 'clinical_notes', policy: 'PHI scope guard' },
  { time: '08:35', agent: 'Appointment Summarizer', resource: 'billing_records', policy: 'least privilege' },
]

export const auditLog = [
  { action: 'booking confirmation', subject: 'Maya Patel', trail: 'ranked slots -> selected slot -> Action Fabric validation' },
  { action: 'scheduling decision', subject: 'Jordan Brooks', trail: 'profile factors -> fairness check -> doctor availability query' },
  { action: 'identity queue', subject: 'Avery Long', trail: 'verification confidence below threshold -> human review' },
]

export type NHIPermission = {
  op: 'read' | 'write' | 'insert' | 'deny'
  target: string
  description: string
}

export type NHIAclRule = {
  label: string
  table: string
  level: 'table' | 'field' | 'deny'
}

export type NonHumanIdentity = {
  userId: string
  firstName: string
  lastName: string
  email: string
  group: string
  description: string
  iconKey: 'ShieldCheck' | 'CalendarDays' | 'Bell' | 'ClipboardList' | 'Activity'
  accentColor: string
  iconBg: string
  permissions: NHIPermission[]
  aclRules: NHIAclRule[]
  roles: string[]
}

export const nonHumanIdentities: NonHumanIdentity[] = [
  {
    userId: 'svc-identity-verification-agent',
    firstName: 'Identity Verification',
    lastName: 'Agent',
    email: 'svc-identity@noreply.internal',
    group: 'grp-identity-agent',
    description: 'Verifies patient identity by cross-referencing registration data, assigning confidence scores, and updating registration status. Has full read access to the patient table.',
    iconKey: 'ShieldCheck',
    accentColor: '#0f5f8c',
    iconBg: '#0f5f8c',
    permissions: [
      { op: 'read',  target: 'u_patient (all fields)',          description: 'Full table-level read access' },
      { op: 'write', target: 'u_patient.u_registration_status', description: 'Update registration status' },
      { op: 'write', target: 'u_patient.u_confidence_score',    description: 'Set identity confidence score' },
    ],
    aclRules: [
      { label: 'table read',  table: 'u_patient',             level: 'table' },
      { label: 'field write', table: 'u_registration_status', level: 'field' },
      { label: 'field write', table: 'u_confidence_score',    level: 'field' },
    ],
    roles: ['role_identity_read_patient', 'role_identity_write_status'],
  },
  {
    userId: 'svc-scheduling-agent',
    firstName: 'Scheduling',
    lastName: 'Agent',
    email: 'svc-scheduling@noreply.internal',
    group: 'grp-scheduling-agent',
    description: 'Ranks appointment slots based on health condition, accessibility, and time preferences. Reads only 5 non-PII patient fields; all identity fields are explicitly denied.',
    iconKey: 'CalendarDays',
    accentColor: '#5b21b6',
    iconBg: '#5b21b6',
    permissions: [
      { op: 'read',   target: 'u_patient (5 fields)',     description: 'patient_id, health_condition, accessibility, time_preference, account_status' },
      { op: 'insert', target: 'u_ai_decision_log',        description: 'Log scheduling decisions for audit trail' },
      { op: 'deny',   target: 'u_patient PII (7 fields)', description: 'ethnicity, gender, first/last name, email, phone, DOB — all denied' },
    ],
    aclRules: [
      { label: 'field read ×5', table: 'u_patient',         level: 'field' },
      { label: 'table insert',  table: 'u_ai_decision_log', level: 'table' },
      { label: 'PII deny ×7',   table: 'u_patient',         level: 'deny'  },
    ],
    roles: ['role_scheduling_read_patient', 'role_scheduling_write_decision_log'],
  },
  {
    userId: 'svc-reminder-agent',
    firstName: 'Reminder',
    lastName: 'Agent',
    email: 'svc-reminder@noreply.internal',
    group: 'grp-reminder-agent',
    description: 'Reads upcoming appointment records to dispatch patient reminders. Strictly read-only — no write, update, or delete permissions on any table.',
    iconKey: 'Bell',
    accentColor: '#b45309',
    iconBg: '#b45309',
    permissions: [
      { op: 'read', target: 'u_appointment', description: 'Full table-level read for reminder dispatch' },
    ],
    aclRules: [
      { label: 'table read', table: 'u_appointment', level: 'table' },
    ],
    roles: ['role_reminder_read_appointment'],
  },
  {
    userId: 'svc-notes-agent',
    firstName: 'Notes Summary',
    lastName: 'Agent',
    email: 'svc-notes@noreply.internal',
    group: 'grp-notes-agent',
    description: 'Summarises completed appointment notes and writes the patient summary field. A Business Rule blocks all field writes except u_patient_summary.',
    iconKey: 'ClipboardList',
    accentColor: '#0f6b4f',
    iconBg: '#0f6b4f',
    permissions: [
      { op: 'read',  target: 'u_appointment (completed)',    description: 'Read completed appointment notes' },
      { op: 'write', target: 'u_patient.u_patient_summary',  description: 'Write patient summary field only' },
    ],
    aclRules: [
      { label: 'table read',  table: 'u_appointment',    level: 'table' },
      { label: 'field write', table: 'u_patient_summary', level: 'field' },
    ],
    roles: ['role_notes_read_appointment', 'role_notes_write_summary'],
  },
  {
    userId: 'svc-triage-agent',
    firstName: 'Triage',
    lastName: 'Agent',
    email: 'svc-triage@noreply.internal',
    group: 'grp-triage-agent',
    description: 'Reads session reason text and health conditions to assign triage priority scores. Minimum-privilege access — only 2 patient fields visible.',
    iconKey: 'Activity',
    accentColor: '#a22828',
    iconBg: '#a22828',
    permissions: [
      { op: 'read', target: 'u_patient (2 fields)', description: 'u_reason_text and u_health_condition only' },
    ],
    aclRules: [
      { label: 'field read ×2', table: 'u_patient', level: 'field' },
    ],
    roles: ['role_triage_read_session'],
  },
]
