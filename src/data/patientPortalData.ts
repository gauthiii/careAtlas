export type Appointment = {
  id: string
  date: string
  time: string
  doctor: string
  department: string
  reason: string
  status: string
  location: string
}

export type PatientField = {
  label: string
  required?: boolean
  optional?: boolean
  type?: 'text' | 'date' | 'password' | 'email' | 'tel' | 'select' | 'checkbox'
  options?: string[]
  value?: string
  sensitive?: boolean
}

export type RegistrationSection = {
  title: string
  description: string
  fields: PatientField[]
}

export const hospital = {
  name: 'Northstar General Hospital',
  portalName: 'Patient Portal',
  phone: '(602) 555-0100',
  hours: 'Monday–Friday',
  timing: '8:00 AM – 6:00 PM',
  addressLine1: '400 E Careway Drive',
  addressLine2: 'Phoenix, AZ 85004',
  email: 'support@northstarhospital.org',
}

export const patient = {
  firstName: 'Maya',
  lastName: 'Patel',
  id: 'P-1048',
  dob: '1986-04-18',
  gender: 'Female',
  ethnicity: 'Asian',
  language: 'English',
  phone: '(602) 555-0148',
  email: 'maya.patel@example.com',
  street1: '214 Copper Ridge Ave',
  street2: 'Apt 4B',
  city: 'Phoenix',
  zip: '85004',
  condition: 'Chronic condition',
  accessibility: 'No',
  insuranceId: 'NGH-4820-19',
  emergencyName: 'Ravi Patel',
  emergencyPhone: '(602) 555-0191',
  emergencyRelationship: 'Spouse',
  username: 'maya.patel',
  profileStatus: 'Complete',
}

export const upcomingAppointment: Appointment = {
  id: 'APT-7008',
  date: 'June 4, 2026',
  time: '9:20 AM',
  doctor: 'Dr. Elena Rao',
  department: 'Primary Care',
  reason: 'Follow-up',
  status: 'Confirmed',
  location: 'Clinic B, Room 214',
}

export const appointmentHistory: Appointment[] = [
  upcomingAppointment,
  {
    id: 'APT-6811',
    date: 'May 9, 2026',
    time: '2:10 PM',
    doctor: 'Dr. Leah Grant',
    department: 'Cardiology',
    reason: 'Chronic condition management',
    status: 'Completed',
    location: 'Clinic C, Room 108',
  },
  {
    id: 'APT-6504',
    date: 'April 3, 2026',
    time: '11:00 AM',
    doctor: 'Dr. Elena Rao',
    department: 'Primary Care',
    reason: 'General check-up',
    status: 'Completed',
    location: 'Clinic B, Room 210',
  },
  {
    id: 'APT-6209',
    date: 'March 18, 2026',
    time: '10:45 AM',
    doctor: 'Dr. Noah Finch',
    department: 'Behavioral Health',
    reason: 'Follow-up',
    status: 'Completed',
    location: 'Telehealth',
  },
]

export const bookingSlots: Appointment[] = [
  {
    id: 'SLOT-2201',
    date: 'June 5, 2026',
    time: '10:40 AM',
    doctor: 'Dr. Elena Rao',
    department: 'Primary Care',
    reason: 'General check-up',
    status: 'Available',
    location: 'Clinic B, Room 212',
  },
  {
    id: 'SLOT-2202',
    date: 'June 5, 2026',
    time: '1:15 PM',
    doctor: 'Dr. Leah Grant',
    department: 'Cardiology',
    reason: 'Chronic condition management',
    status: 'Available',
    location: 'Clinic C, Room 108',
  },
  {
    id: 'SLOT-2203',
    date: 'June 6, 2026',
    time: '8:50 AM',
    doctor: 'Dr. Noah Finch',
    department: 'Behavioral Health',
    reason: 'Mental health',
    status: 'Available',
    location: 'Telehealth',
  },
  {
    id: 'SLOT-2204',
    date: 'June 7, 2026',
    time: '3:30 PM',
    doctor: 'Dr. Imani Cole',
    department: 'Specialist Clinic',
    reason: 'Specialist referral',
    status: 'Available',
    location: 'Clinic D, Room 302',
  },
  {
    id: 'SLOT-2205',
    date: 'June 8, 2026',
    time: '9:45 AM',
    doctor: 'Dr. Elena Rao',
    department: 'Primary Care',
    reason: 'Urgent concern',
    status: 'Available',
    location: 'Clinic B, Room 214',
  },
]

export const registrationSections: RegistrationSection[] = [
  {
    title: 'Personal information',
    description: 'These details identify the patient account and support appointment access needs',
    fields: [
      { label: 'First name', required: true, value: patient.firstName },
      { label: 'Last name', required: true, value: patient.lastName },
      { label: 'Date of birth', type: 'date', required: true, value: patient.dob, sensitive: true },
      { label: 'Gender', type: 'select', required: true, options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'], value: patient.gender },
      { label: 'Ethnicity', type: 'select', required: true, options: ['Asian', 'Black or Black British', 'Mixed', 'White', 'Other', 'Prefer not to say'], value: patient.ethnicity, sensitive: true },
      { label: 'Primary language', type: 'select', required: true, options: ['English', 'Spanish', 'Hindi', 'Arabic', 'Mandarin', 'Other'], value: patient.language },
      { label: 'Contact phone number', type: 'tel', required: true, value: patient.phone },
      { label: 'Email address', type: 'email', required: true, value: patient.email },
    ],
  },
  {
    title: 'Address',
    description: 'Used for identity verification and clinic communications',
    fields: [
      { label: 'Street address line 1', required: true, value: patient.street1 },
      { label: 'Street address line 2', optional: true, value: patient.street2 },
      { label: 'City', required: true, value: patient.city },
      { label: 'Postcode / ZIP', required: true, value: patient.zip },
    ],
  },
  {
    title: 'Health information',
    description: 'These fields influence scheduling priority and appointment fit',
    fields: [
      { label: 'Primary health condition category', type: 'select', required: true, options: ['General', 'Chronic condition', 'Mental health', 'Urgent', 'Preventative care'], value: patient.condition, sensitive: true },
      { label: 'Do you have any mobility or accessibility requirements?', type: 'select', required: true, options: ['Yes', 'No'], value: patient.accessibility },
      { label: 'Insurance / coverage ID number', optional: true, value: patient.insuranceId },
      { label: 'Emergency contact name', required: true, value: patient.emergencyName },
      { label: 'Emergency contact phone', type: 'tel', required: true, value: patient.emergencyPhone },
      { label: 'Relationship to emergency contact', required: true, value: patient.emergencyRelationship },
    ],
  },
  {
    title: 'Account credentials',
    description: 'Used for secure portal access',
    fields: [
      { label: 'Create a username', required: true, value: patient.username },
      { label: 'Create a password', type: 'password', required: true },
      { label: 'Confirm password', type: 'password', required: true },
    ],
  },
]

export const notifications = [
  'Your next appointment is confirmed. Please arrive 15 minutes early.',
  'Follow-up instructions are available in your appointment history.',
]

export const dashboardActions = [
  { label: 'Book new appointment', to: '/patient/book' },
  { label: 'View my profile', to: '/patient/profile' },
  { label: 'Contact us', to: '/patient/contact' },
]

export const profileControls = [
  { label: 'Change password', detail: 'Update portal credentials' },
  { label: 'Email reminders', detail: 'Appointment reminders enabled' },
  { label: 'SMS reminders', detail: 'Text reminders enabled' },
  { label: 'Download my data', detail: 'Generate a records summary' },
  { label: 'Request account deletion', detail: 'Creates an admin review request', danger: true },
]

export const verificationStates = {
  success: {
    title: 'Email verified',
    detail: 'Your email address has been confirmed. You can now continue to sign in.',
  },
  expired: {
    title: 'Verification link expired',
    detail: 'Request a new verification email to continue setting up the account.',
  },
}
