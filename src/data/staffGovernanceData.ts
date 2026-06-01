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

export const weeklyAvailability = [
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
