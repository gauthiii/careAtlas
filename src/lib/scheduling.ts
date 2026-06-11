import type { ClinicianAuthUser } from '../contexts/ClinicianAuthContext'
import type { BookingAppointment, BookingDoctor, PatientProfile } from '../services/serviceNow'

export const ANY_SPECIALITY = 'Any speciality'
export const CALENDAR_START_HOUR = 9
export const CALENDAR_END_HOUR = 18
export const APPOINTMENT_DURATION_MINUTES = 60
export const WEEK_LENGTH = 7
export const BOOKING_RANGE_DAYS = 31
export const APPOINTMENT_LOOKBACK_DAYS = 180
export const APPOINTMENT_HISTORY_RANGE_DAYS = APPOINTMENT_LOOKBACK_DAYS + BOOKING_RANGE_DAYS
export const MAX_WEEK_START_OFFSET = BOOKING_RANGE_DAYS - WEEK_LENGTH
export const CALENDAR_HOURS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
  (_, index) => CALENDAR_START_HOUR + index,
)

export type SpecialtySchedule = {
  startHour: number
  endHour: number
  breakHour: number
  breakLabel: string
}

export type CalendarSlot = {
  doctor: BookingDoctor
  date: string
  hour: number
}

export const DEFAULT_SPECIALTY_SCHEDULE: SpecialtySchedule = {
  startHour: 10,
  endHour: 15,
  breakHour: 12,
  breakLabel: 'Break',
}

export const SPECIALTY_SCHEDULES: Record<string, SpecialtySchedule> = {
  cardiology: { startHour: 10, endHour: 16, breakHour: 13, breakLabel: 'Break' },
  'general practice': { startHour: 9, endHour: 18, breakHour: 12, breakLabel: 'Lunch' },
  general: { startHour: 9, endHour: 18, breakHour: 12, breakLabel: 'Lunch' },
  'mental health': { startHour: 10, endHour: 15, breakHour: 12, breakLabel: 'Break' },
  neurology: { startHour: 9, endHour: 14, breakHour: 11, breakLabel: 'Break' },
  oncology: { startHour: 8, endHour: 13, breakHour: 10, breakLabel: 'Break' },
  orthopedics: { startHour: 11, endHour: 17, breakHour: 14, breakLabel: 'Break' },
  paediatrics: { startHour: 8, endHour: 15, breakHour: 12, breakLabel: 'Break' },
  pediatrics: { startHour: 8, endHour: 15, breakHour: 12, breakLabel: 'Break' },
}

export function todayIso() {
  const now = new Date()
  return dateToIso(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
}

export function dateToIso(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateFromIso(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function addDays(date: string, days: number) {
  const next = dateFromIso(date)
  next.setDate(next.getDate() + days)
  return dateToIso(next)
}

export function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(year, month - 1, day))
}

export function formatShortDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2026, 0, 1, hours, minutes))
}

export function formatAppointmentDateTime(date: string, time: string) {
  return `${formatDate(date)} at ${formatTime(time)}`
}

export function hourTime(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

export function timeRangeForHour(hour: number) {
  return `${formatTime(hourTime(hour))} - ${formatTime(hourTime(hour + 1))}`
}

export function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0
  return hours * 60 + minutes
}

export function doctorSpeciality(doctor: BookingDoctor) {
  return doctor.speciality || doctor.department || 'General'
}

export function getScheduleForDoctor(doctor: BookingDoctor) {
  return SPECIALTY_SCHEDULES[doctorSpeciality(doctor).trim().toLowerCase()] ?? DEFAULT_SPECIALTY_SCHEDULE
}

export function appointmentEndMinutes(appointment: BookingAppointment) {
  return minutesFromTime(appointment.start_time) + APPOINTMENT_DURATION_MINUTES
}

export function appointmentOverlapsHour(appointment: BookingAppointment, hour: number) {
  const appointmentStart = minutesFromTime(appointment.start_time)
  const appointmentEnd = appointmentStart + APPOINTMENT_DURATION_MINUTES
  const hourStart = hour * 60
  const hourEnd = hourStart + 60
  return appointmentStart < hourEnd && appointmentEnd > hourStart
}

export function appointmentOverlapsBreak(appointment: BookingAppointment, schedule: SpecialtySchedule) {
  const breakStart = schedule.breakHour * 60
  const breakEnd = breakStart + 60
  return minutesFromTime(appointment.start_time) < breakEnd && appointmentEndMinutes(appointment) > breakStart
}

export function appointmentOutsideSchedule(appointment: BookingAppointment, schedule: SpecialtySchedule) {
  const appointmentStart = minutesFromTime(appointment.start_time)
  const appointmentEnd = appointmentEndMinutes(appointment)
  return appointmentStart < schedule.startHour * 60 || appointmentEnd > schedule.endHour * 60
}

export function isSpecialAppointment(appointment: BookingAppointment, schedule: SpecialtySchedule) {
  return appointmentOverlapsBreak(appointment, schedule) || appointmentOutsideSchedule(appointment, schedule)
}

export function isBookableHour(hour: number, schedule: SpecialtySchedule) {
  return hour >= schedule.startHour && hour < schedule.endHour
}

export function isCancelledAppointment(appointment: BookingAppointment) {
  return appointment.status === 'cancelled' || appointment.status === 'canceled'
}

export function appointmentSortValue(appointment: BookingAppointment) {
  return dateFromIso(appointment.date).getTime() + minutesFromTime(appointment.start_time) * 60_000
}

export function appointmentReason(appointment: BookingAppointment) {
  return appointment.reason_category || appointment.reason_text || 'Appointment'
}

export function activeAppointmentsForDoctor(appointments: BookingAppointment[], doctor: BookingDoctor) {
  return appointments.filter(
    (appointment) =>
      appointment.doctor_record_id === doctor.doctor_record_id && !isCancelledAppointment(appointment),
  )
}

export function appointmentForCell(appointments: BookingAppointment[], date: string, hour: number) {
  return appointments.find((appointment) => appointment.date === date && appointmentOverlapsHour(appointment, hour))
}

export function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

export function normalizedSearchTerms(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map(normalizeSearchValue)
        .filter((value) => value.length >= 2),
    ),
  )
}

export function nameParts(value: string | null | undefined) {
  return normalizeSearchValue(value)
    .split(/\s+/)
    .filter((part) => part.length >= 2)
}

export function patientAppointmentTerms(patient: PatientProfile) {
  return normalizedSearchTerms([
    patient.sys_id,
    patient.patient_id,
    `${patient.first_name} ${patient.last_name}`,
    patient.first_name,
    patient.last_name,
    patient.email,
    patient.username,
  ])
}

export function appointmentsForPatient(appointments: BookingAppointment[], patient: PatientProfile | null) {
  if (!patient) return []
  const terms = patientAppointmentTerms(patient)
  if (terms.length === 0) return []

  return appointments.filter((appointment) => {
    if (isCancelledAppointment(appointment)) return false

    const appointmentTerms = normalizedSearchTerms([
      appointment.patient_id,
      appointment.patient_display,
      ...nameParts(appointment.patient_display),
    ])
    return terms.some((term) =>
      appointmentTerms.some(
        (appointmentTerm) => appointmentTerm === term || appointmentTerm.includes(term) || term.includes(appointmentTerm),
      ),
    )
  })
}

export function matchDoctorForClinician(doctors: BookingDoctor[], user: ClinicianAuthUser | null) {
  const activeDoctors = doctors.filter((doctor) => doctor.active)
  if (activeDoctors.length === 0) return null

  const email = normalizeSearchValue(user?.attributes.email)
  if (email) {
    const doctor = activeDoctors.find((item) => normalizeSearchValue(item.email) === email)
    if (doctor) return doctor
  }

  const fullName = normalizeSearchValue(user?.attributes.name || user?.username)
  if (fullName) {
    const doctor = activeDoctors.find((item) => normalizeSearchValue(item.name) === fullName)
    if (doctor) return doctor
  }

  const parts = nameParts(user?.attributes.name || user?.username)
  if (parts.length > 0) {
    const doctor = activeDoctors.find((item) => {
      const doctorTerms = normalizedSearchTerms([item.name, item.first_name, item.last_name])
      return parts.every((part) => doctorTerms.some((term) => term.includes(part) || part.includes(term)))
    })
    if (doctor) return doctor
  }

  return activeDoctors[0]
}

export function findNextAvailableSlot(
  doctor: BookingDoctor,
  appointments: BookingAppointment[],
  startDate: string,
  days = WEEK_LENGTH,
): CalendarSlot | null {
  const schedule = getScheduleForDoctor(doctor)
  const doctorAppointments = activeAppointmentsForDoctor(appointments, doctor)

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const date = addDays(startDate, dayOffset)
    for (const hour of CALENDAR_HOURS) {
      const appointment = appointmentForCell(doctorAppointments, date, hour)
      const isBreak = isBookableHour(hour, schedule) && hour === schedule.breakHour
      if (!appointment && isBookableHour(hour, schedule) && !isBreak) return { doctor, date, hour }
    }
  }

  return null
}
