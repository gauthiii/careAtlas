import {
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  LoaderCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PatientPanel } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { patient, type Appointment } from '../../data/patientPortalData'
import { patientDisplayName, usePatientAuth } from '../../contexts/PatientAuthContext'
import { cn } from '../../lib/cn'
import {
  fetchPatientBookingAvailability,
  type BookingAppointment,
  type BookingCalendarResponse,
  type BookingDoctor,
} from '../../services/serviceNow'

const STEPS = [
  { number: 1, title: 'Reason for visit' },
  { number: 2, title: 'Choose time' },
  { number: 3, title: 'Review & Booking Confirmation' },
] as const

const fieldClass =
  'w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit'
const labelClass = 'grid gap-[7px] text-[0.84rem] font-bold'
const ANY_SPECIALITY = 'Any speciality'
const CALENDAR_START_HOUR = 9
const CALENDAR_END_HOUR = 18
const APPOINTMENT_DURATION_MINUTES = 60
const WEEK_LENGTH = 7
const BOOKING_RANGE_DAYS = 31
const APPOINTMENT_LOOKBACK_DAYS = 180
const APPOINTMENT_HISTORY_RANGE_DAYS = APPOINTMENT_LOOKBACK_DAYS + BOOKING_RANGE_DAYS
const MAX_WEEK_START_OFFSET = BOOKING_RANGE_DAYS - WEEK_LENGTH
const CALENDAR_HOURS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
  (_, index) => CALENDAR_START_HOUR + index,
)

type SpecialtySchedule = {
  startHour: number
  endHour: number
  breakHour: number
  breakLabel: string
}

const DEFAULT_SPECIALTY_SCHEDULE: SpecialtySchedule = {
  startHour: 10,
  endHour: 15,
  breakHour: 12,
  breakLabel: 'Break',
}

const SPECIALTY_SCHEDULES: Record<string, SpecialtySchedule> = {
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

function todayIso() {
  const now = new Date()
  return dateToIso(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
}

function dateToIso(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromIso(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function addDays(date: string, days: number) {
  const next = dateFromIso(date)
  next.setDate(next.getDate() + days)
  return dateToIso(next)
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(year, month - 1, day))
}

function formatShortDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2026, 0, 1, hours, minutes))
}

function formatAppointmentDateTime(date: string, time: string) {
  return `${formatDate(date)} at ${formatTime(time)}`
}

function hourTime(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

function timeRangeForHour(hour: number) {
  return `${formatTime(hourTime(hour))} - ${formatTime(hourTime(hour + 1))}`
}

function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0
  return hours * 60 + minutes
}

function doctorSpeciality(doctor: BookingDoctor) {
  return doctor.speciality || doctor.department || 'General'
}

function getScheduleForDoctor(doctor: BookingDoctor) {
  return SPECIALTY_SCHEDULES[doctorSpeciality(doctor).trim().toLowerCase()] ?? DEFAULT_SPECIALTY_SCHEDULE
}

function appointmentEndMinutes(appointment: BookingAppointment) {
  return minutesFromTime(appointment.start_time) + APPOINTMENT_DURATION_MINUTES
}

function appointmentOverlapsHour(appointment: BookingAppointment, hour: number) {
  const appointmentStart = minutesFromTime(appointment.start_time)
  const appointmentEnd = appointmentStart + APPOINTMENT_DURATION_MINUTES
  const hourStart = hour * 60
  const hourEnd = hourStart + 60
  return appointmentStart < hourEnd && appointmentEnd > hourStart
}

function appointmentOverlapsBreak(appointment: BookingAppointment, schedule: SpecialtySchedule) {
  const breakStart = schedule.breakHour * 60
  const breakEnd = breakStart + 60
  return minutesFromTime(appointment.start_time) < breakEnd && appointmentEndMinutes(appointment) > breakStart
}

function appointmentOutsideSchedule(appointment: BookingAppointment, schedule: SpecialtySchedule) {
  const appointmentStart = minutesFromTime(appointment.start_time)
  const appointmentEnd = appointmentEndMinutes(appointment)
  return appointmentStart < schedule.startHour * 60 || appointmentEnd > schedule.endHour * 60
}

function isSpecialAppointment(appointment: BookingAppointment, schedule: SpecialtySchedule) {
  return appointmentOverlapsBreak(appointment, schedule) || appointmentOutsideSchedule(appointment, schedule)
}

function isBookableHour(hour: number, schedule: SpecialtySchedule) {
  return hour >= schedule.startHour && hour < schedule.endHour
}

function isCancelledAppointment(appointment: BookingAppointment) {
  return appointment.status === 'cancelled' || appointment.status === 'canceled'
}

function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function appointmentSortValue(appointment: BookingAppointment) {
  return dateFromIso(appointment.date).getTime() + minutesFromTime(appointment.start_time) * 60_000
}

function appointmentReason(appointment: BookingAppointment) {
  return appointment.reason_category || appointment.reason_text || 'Appointment'
}

function selectedAppointmentFromSlot(doctor: BookingDoctor, date: string, hour: number): Appointment {
  return {
    id: `${doctor.doctor_record_id}-${date}-${hour}`,
    date: formatDate(date),
    time: timeRangeForHour(hour),
    doctor: doctor.name,
    department: doctorSpeciality(doctor),
    reason: 'Available appointment',
    status: 'Selected',
    location: 'CareAtlas clinic',
  }
}

export function BookAppointmentPage() {
  const { user } = usePatientAuth()
  const [step, setStep] = useState(1)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Appointment | null>(null)
  const [booked, setBooked] = useState(false)
  const [selectedSpeciality, setSelectedSpeciality] = useState(ANY_SPECIALITY)
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [weekStart, setWeekStart] = useState(todayIso())
  const [availability, setAvailability] = useState<BookingCalendarResponse | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true)

  const [visitType, setVisitType] = useState('In-person')
  const [reasonCategory, setReasonCategory] = useState('General check-up')
  const [specialty, setSpecialty] = useState('Any available')
  const [concern, setConcern] = useState('')
  const [provider, setProvider] = useState('')
  const [memberId, setMemberId] = useState('')
  const [accessibility, setAccessibility] = useState('No special needs')
  const [interpreter, setInterpreter] = useState('No interpreter')

  const today = useMemo(todayIso, [])
  const bookingEnd = useMemo(() => addDays(today, BOOKING_RANGE_DAYS - 1), [today])
  const availabilityStart = useMemo(() => addDays(today, -APPOINTMENT_LOOKBACK_DAYS), [today])
  const maxWeekStart = useMemo(() => addDays(today, MAX_WEEK_START_OFFSET), [today])
  const weekDays = useMemo(
    () => Array.from({ length: WEEK_LENGTH }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  )

  useEffect(() => {
    let active = true

    async function loadAvailability() {
      setIsLoadingAvailability(true)
      setAvailabilityError(null)
      try {
        const response = await fetchPatientBookingAvailability(availabilityStart, APPOINTMENT_HISTORY_RANGE_DAYS)
        if (!active) return
        setAvailability(response)
        if (response.doctors.length === 0) {
          setAvailabilityError('No active doctors were returned from ServiceNow.')
        }
      } catch (error) {
        if (!active) return
        setAvailability(null)
        setAvailabilityError(error instanceof Error ? error.message : 'Unable to load ServiceNow availability.')
      } finally {
        if (active) setIsLoadingAvailability(false)
      }
    }

    loadAvailability()

    return () => {
      active = false
    }
  }, [availabilityStart])

  const doctors = useMemo(() => availability?.doctors.filter((doctor) => doctor.active) ?? [], [availability])
  const appointments = useMemo(() => availability?.appointments ?? [], [availability])
  const currentPatientAppointments = useMemo(() => {
    const userTerms = user
      ? [
          patientDisplayName(user),
          user.attributes.email,
          user.username,
        ]
          .map(normalizeSearchValue)
          .filter(Boolean)
      : []
    const fallbackTerms = [
      `${patient.firstName} ${patient.lastName}`,
      patient.email,
      patient.username,
      patient.id,
    ]
      .map(normalizeSearchValue)
      .filter(Boolean)
    const terms = userTerms.length > 0 ? userTerms : fallbackTerms

    if (terms.length === 0) return []

    return appointments.filter((appointment) => {
      if (isCancelledAppointment(appointment)) return false

      const patientText = normalizeSearchValue(`${appointment.patient_display} ${appointment.patient_id}`)
      return terms.some((term) => patientText.includes(term))
    })
  }, [appointments, user])
  const specialityOptions = useMemo(() => {
    const names = new Set(doctors.map(doctorSpeciality).filter(Boolean))
    return [ANY_SPECIALITY, ...Array.from(names).sort((a, b) => a.localeCompare(b))]
  }, [doctors])
  const doctorOptions = useMemo(() => {
    const filteredDoctors =
      selectedSpeciality === ANY_SPECIALITY
        ? doctors
        : doctors.filter((doctor) => doctorSpeciality(doctor) === selectedSpeciality)
    return filteredDoctors.sort((a, b) => a.name.localeCompare(b.name))
  }, [doctors, selectedSpeciality])
  const selectedDoctor = useMemo(
    () => doctorOptions.find((doctor) => doctor.doctor_record_id === selectedDoctorId) ?? null,
    [doctorOptions, selectedDoctorId],
  )

  useEffect(() => {
    if (doctorOptions.length === 0) {
      setSelectedDoctorId('')
      setSelectedSlotId(null)
      setSelectedSlot(null)
      return
    }
    if (!doctorOptions.some((doctor) => doctor.doctor_record_id === selectedDoctorId)) {
      setSelectedDoctorId(doctorOptions[0].doctor_record_id)
      setSelectedSlotId(null)
      setSelectedSlot(null)
    }
  }, [doctorOptions, selectedDoctorId])

  const canGoPreviousWeek = weekStart > today
  const canGoNextWeek = weekStart < maxWeekStart
  const canGoNext = step === 1 || (step === 2 && selectedSlot !== null)

  function selectCalendarSlot(doctor: BookingDoctor, date: string, hour: number, selected: boolean) {
    if (selected) {
      setSelectedSlotId(null)
      setSelectedSlot(null)
      return
    }

    const nextSelectedSlot = selectedAppointmentFromSlot(doctor, date, hour)
    setSelectedSlotId(nextSelectedSlot.id)
    setSelectedSlot(nextSelectedSlot)
    if (step === 1) setStep(2)
  }

  function goNext() {
    if (step === 1) setStep(2)
    else if (step === 2 && selectedSlot) setStep(3)
  }

  function goPrevious() {
    if (step > 1) setStep(step - 1)
  }

  function goPreviousWeek() {
    if (canGoPreviousWeek) setWeekStart((current) => addDays(current, -WEEK_LENGTH))
  }

  function goNextWeek() {
    if (canGoNextWeek) {
      setWeekStart((current) => {
        const next = addDays(current, WEEK_LENGTH)
        return next > maxWeekStart ? maxWeekStart : next
      })
    }
  }

  return (
    <PatientPage
      title="Find an available clinic slot"
      intro="Choose a reason for visit, select a slot, and confirm your appointment."
    >
      <PatientPanel title="Clinic availability" icon={<CalendarDays size={21} />} tone="secure">
        <div className="mb-5 grid gap-4">
          <div>
            <p className="m-0 text-[0.9rem] font-semibold text-[#53687b]">
              Choose a speciality and doctor to view their weekly calendar.
            </p>
            {availability && (
              <p className="m-0 mt-1 text-[0.78rem] font-bold text-[#6b7f91]">
                Booking window: {formatDate(today)} through {formatDate(bookingEnd)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 max-[980px]:grid-cols-1">
            <label className={labelClass}>
              <span>Speciality</span>
              <select
                className={fieldClass}
                value={selectedSpeciality}
                onChange={(event) => setSelectedSpeciality(event.target.value)}
                disabled={isLoadingAvailability || doctors.length === 0}
              >
                {specialityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span>Doctor</span>
              <select
                className={fieldClass}
                value={selectedDoctorId}
                onChange={(event) => {
                  setSelectedDoctorId(event.target.value)
                  setSelectedSlotId(null)
                  setSelectedSlot(null)
                }}
                disabled={isLoadingAvailability || doctorOptions.length === 0}
              >
                {doctorOptions.length === 0 ? (
                  <option value="">No doctors available</option>
                ) : (
                  doctorOptions.map((doctor) => (
                    <option key={doctor.doctor_record_id} value={doctor.doctor_record_id}>
                      {doctor.name} - {doctorSpeciality(doctor)}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div className="flex items-center gap-2 max-[980px]:justify-between">
              <button
                type="button"
                onClick={goPreviousWeek}
                disabled={!canGoPreviousWeek}
                className="inline-flex min-h-[42px] items-center justify-center gap-1 rounded-[9px] border border-[#b7ceda] bg-white px-3 font-bold text-[#143A57] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft size={17} />
                Week
              </button>
              <button
                type="button"
                onClick={goNextWeek}
                disabled={!canGoNextWeek}
                className="inline-flex min-h-[42px] items-center justify-center gap-1 rounded-[9px] border border-[#b7ceda] bg-white px-3 font-bold text-[#143A57] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Week
                <ChevronRight size={17} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[0.74rem] font-black text-[#53687b]">
            <span className="rounded-full border border-[#a7dfbf] bg-[#e4f7eb] px-3 py-1 text-[#0f6b4f]">Available</span>
            <span className="rounded-full border border-[#f4d16f] bg-[#fff6cc] px-3 py-1 text-[#805b00]">Lunch</span>
            <span className="rounded-full border border-[#f3a19c] bg-[#feeceb] px-3 py-1 text-[#a22828]">Booked</span>
            <span className="rounded-full border border-[#f0b56a] bg-[#fff0db] px-3 py-1 text-[#9a4f00]">Special appointment</span>
          </div>
        </div>

        {isLoadingAvailability ? (
          <div className="flex min-h-[180px] items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] font-bold text-[#53687b]">
            <LoaderCircle size={18} className="animate-spin" />
            Loading clinic availability
          </div>
        ) : (
          <>
            {availabilityError && (
              <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-[#f6c6c4] bg-[#fff4f3] p-3 text-[0.86rem] font-bold text-[#a22828]">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <span>{availabilityError}</span>
              </div>
            )}

            {selectedDoctor ? (
              <DoctorWeeklyCalendar
                appointments={appointments}
                days={weekDays}
                doctor={selectedDoctor}
                selectedSlotId={selectedSlotId}
                onSelect={selectCalendarSlot}
              />
            ) : (
              <div className="rounded-[10px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-5 text-center text-sm font-bold text-[#53687b]">
                No doctor is available for this speciality.
              </div>
            )}
          </>
        )}
      </PatientPanel>

      <nav
        className="mt-6 grid grid-cols-3 gap-2 rounded-[14px] border border-[#d7e5ec] bg-white p-4 shadow-[0_12px_30px_rgba(25,64,93,0.07)] max-[720px]:grid-cols-1"
        aria-label="Booking progress"
      >
        {STEPS.map(({ number, title }) => {
          const isActive = step === number
          const isComplete = step > number

          return (
            <div
              key={number}
              className={cn(
                'flex items-center gap-3 rounded-[10px] px-3 py-2.5',
                isActive && 'bg-[#e7f3f8]',
                isComplete && !isActive && 'opacity-80',
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold',
                  isActive || isComplete
                    ? 'bg-[#143A57] text-white'
                    : 'border-2 border-[#cbdde6] bg-white text-[#53687b]',
                )}
              >
                {number}
              </span>
              <span
                className={cn(
                  'text-[0.9rem] font-bold leading-tight',
                  isActive ? 'text-[#143A57]' : 'text-[#53687b]',
                )}
              >
                {title}
              </span>
            </div>
          )
        })}
      </nav>

      {step === 1 && (
        <PatientPanel title="1. Reason for visit" icon={<FileText size={21} />} className="mt-6">
          <div className="grid gap-5">
            <label className={labelClass}>
              <span>Visit Type</span>
              <select className={fieldClass} value={visitType} onChange={(e) => setVisitType(e.target.value)}>
                <option>In-person</option>
                <option>Telehealth</option>
              </select>
            </label>

            <label className={labelClass}>
              <span>Reason category</span>
              <select
                className={fieldClass}
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
              >
                <option>General check-up</option>
                <option>Follow-up</option>
                <option>Urgent concern</option>
                <option>Specialist referral</option>
                <option>Mental health</option>
                <option>Chronic condition management</option>
              </select>
            </label>

            <label className={labelClass}>
              <span>Specialty (optional)</span>
              <select className={fieldClass} value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                <option>Any available</option>
                <option>Family Medicine</option>
                <option>Internal Medicine</option>
                <option>Cardiology</option>
                <option>Dermatology</option>
                <option>Orthopedics</option>
                <option>Behavioral Health</option>
              </select>
            </label>

            <label className="grid gap-[4px] text-[0.84rem] font-bold">
              <span>Briefly Describe Your Concern</span>
              <div className="grid gap-1">
                <textarea
                  className="min-h-[110px] w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
                  maxLength={200}
                  placeholder="Optional, max 200 characters"
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                />
                <div className="text-right text-[0.72rem] font-semibold text-[#7c8fa1]">
                  {concern.length} / 200
                </div>
              </div>
            </label>

            <div className="grid gap-4">
              <span className="text-[0.84rem] font-bold uppercase tracking-wide">Insurance details</span>
              <label className={labelClass}>
                <span>Provider</span>
                <select className={fieldClass} value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="" disabled>
                    Select provider
                  </option>
                  <option>Aetna</option>
                  <option>Blue Cross Blue Shield</option>
                  <option>Cigna</option>
                  <option>Humana</option>
                  <option>UnitedHealthcare</option>
                </select>
              </label>
              <label className={labelClass}>
                <span>Member ID</span>
                <input
                  type="text"
                  placeholder="e.g. ABC123456789"
                  className={fieldClass}
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-4">
              <span className="text-[0.84rem] font-bold uppercase tracking-wide">Accessibility needs</span>
              <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                <select
                  className="rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-[0.84rem] !font-bold"
                  value={accessibility}
                  onChange={(e) => setAccessibility(e.target.value)}
                >
                  <option>No special needs</option>
                  <option>Wheelchair access</option>
                  <option>Hearing assistance</option>
                  <option>Visual assistance</option>
                </select>
                <select
                  className="rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-[0.84rem] !font-bold"
                  value={interpreter}
                  onChange={(e) => setInterpreter(e.target.value)}
                >
                  <option>No interpreter</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>Mandarin</option>
                  <option>Arabic</option>
                </select>
              </div>
            </div>
          </div>
        </PatientPanel>
      )}

      {step === 2 && (
        <PatientPanel title="2. Choose a time" icon={<CalendarDays size={21} />} tone="secure" className="mt-6">
          {selectedSlot ? (
            <div className="rounded-[10px] border border-[#b7ceda] bg-[#f7fbfd] p-4 text-[0.92rem] font-semibold text-[#102033]">
              <strong className="block text-base">{selectedSlot.date} at {selectedSlot.time}</strong>
              <span className="mt-1 block">{selectedSlot.doctor}</span>
              <span className="block text-[#53687b]">{selectedSlot.department}</span>
            </div>
          ) : (
            <p className="m-0 rounded-[10px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-4 text-[0.9rem] font-bold text-[#53687b]">
              Select a green available cell in the calendar above to continue.
            </p>
          )}
        </PatientPanel>
      )}

      {step === 3 && (
        <PatientPanel
          title="3. Review & Booking Confirmation"
          icon={<CheckCircle2 size={21} />}
          tone="success"
          className="mt-6"
        >
          {booked ? (
            <div className="grid gap-4">
              <p className="rounded-[9px] bg-[#e8f7ef] p-4 font-bold text-[#0f6b4f]">
                Your appointment has been confirmed. A confirmation email will be sent shortly.
              </p>
              <Link
                className="inline-flex min-h-[42px] w-max items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] !font-bold text-white max-[720px]:w-full"
                to="/patient/dashboard"
              >
                Return to dashboard
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 rounded-[10px] border border-[#d7e5ec] bg-[#f7fbfd] p-4">
              {selectedSlot ? (
                <>
                  <div>
                    <strong className="text-[1rem]">
                      {selectedSlot.date} at {selectedSlot.time}
                    </strong>
                    <div className="mt-2">{selectedSlot.doctor}</div>
                    <div>{selectedSlot.department}</div>
                    <div>{selectedSlot.location}</div>
                  </div>
                  <div className="h-px bg-[#d7e5ec]" />
                  <div className="grid gap-2 text-[0.9rem]">
                    <div>
                      <strong>Visit Type:</strong> {visitType}
                    </div>
                    <div>
                      <strong>Reason:</strong> {reasonCategory}
                    </div>
                    <div>
                      <strong>Specialty:</strong> {specialty}
                    </div>
                    {concern && (
                      <div>
                        <strong>Concern:</strong> {concern}
                      </div>
                    )}
                    <div>
                      <strong>Insurance Provider:</strong> {provider || 'Not provided'}
                    </div>
                    <div>
                      <strong>Member ID:</strong> {memberId || 'Not provided'}
                    </div>
                    <div>
                      <strong>Accessibility:</strong> {accessibility}
                    </div>
                    <div>
                      <strong>Interpreter:</strong> {interpreter}
                    </div>
                  </div>
                </>
              ) : (
                <span className="text-[#53687b]">
                  No slot selected. Go back to choose an available slot.
                </span>
              )}
            </div>
          )}
        </PatientPanel>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d7e5ec] pt-4">
        <button
          type="button"
          onClick={goPrevious}
          disabled={step === 1 || booked}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-bold text-[#143A57] disabled:cursor-not-allowed disabled:opacity-50 max-[720px]:flex-1"
        >
          <ChevronLeft size={18} />
          Previous
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] !font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 max-[720px]:flex-1"
          >
            Next
            <ChevronRight size={18} />
          </button>
        ) : (
          !booked && (
            <button
              type="button"
              onClick={() => setBooked(true)}
              disabled={!selectedSlot}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] !font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 max-[720px]:flex-1"
            >
              Confirm booking
            </button>
          )
        )}
      </div>

      {currentPatientAppointments.length > 0 && (
        <ScheduledAppointmentsPanel appointments={currentPatientAppointments} today={today} />
      )}
      {!isLoadingAvailability && !availabilityError && currentPatientAppointments.length === 0 && (
        <p className="m-0 mt-6 rounded-[10px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-3 text-center text-[0.84rem] font-bold text-[#6b7f91]">
          You have not scheduled any appointments before.
        </p>
      )}
    </PatientPage>
  )
}

type AppointmentTab = 'upcoming' | 'past' | 'plan'

function ScheduledAppointmentsPanel({
  appointments,
  today,
}: {
  appointments: BookingAppointment[]
  today: string
}) {
  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.date >= today && !isCancelledAppointment(appointment))
        .sort((a, b) => appointmentSortValue(a) - appointmentSortValue(b)),
    [appointments, today],
  )
  const pastAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.date < today)
        .sort((a, b) => appointmentSortValue(b) - appointmentSortValue(a)),
    [appointments, today],
  )
  const [activeTab, setActiveTab] = useState<AppointmentTab>(() =>
    upcomingAppointments.length > 0 ? 'upcoming' : 'past',
  )

  const tabs: { id: AppointmentTab; label: string; count?: number }[] = [
    { id: 'upcoming', label: 'Upcoming appointments', count: upcomingAppointments.length },
    { id: 'past', label: 'Past appointments', count: pastAppointments.length },
    { id: 'plan', label: 'Plan' },
  ]

  return (
    <PatientPanel
      title="Appointments already scheduled for you"
      icon={<CalendarCheck2 size={21} />}
      tone="secure"
      className="mt-6"
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="m-0 max-w-[720px] text-[0.9rem] font-semibold leading-relaxed text-[#53687b]">
            There are already appointments scheduled for you. Review them before booking another visit so the
            new request fits your existing care plan.
          </p>
          {upcomingAppointments[0] && (
            <div className="rounded-[9px] border border-[#b7ceda] bg-[#f7fbfd] px-3 py-2 text-[0.78rem] font-black text-[#143A57]">
              Next: {formatAppointmentDateTime(upcomingAppointments[0].date, upcomingAppointments[0].start_time)}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[#d7e5ec] pb-3" role="tablist" aria-label="Scheduled appointments">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[9px] border px-3 text-[0.82rem] font-black transition',
                  isActive
                    ? 'border-[#143A57] bg-[#143A57] text-white'
                    : 'border-[#cbdde6] bg-white text-[#143A57] hover:bg-[#f7fbfd]',
                )}
              >
                {tab.label}
                {typeof tab.count === 'number' && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[0.7rem]',
                      isActive ? 'bg-white/20 text-white' : 'bg-[#e7f3f8] text-[#143A57]',
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {activeTab === 'upcoming' && (
          <AppointmentList
            appointments={upcomingAppointments}
            emptyText="No upcoming appointments were found in the current scheduling window."
          />
        )}
        {activeTab === 'past' && (
          <AppointmentList
            appointments={pastAppointments}
            emptyText="No past appointments were found in the recent history window."
          />
        )}
        {activeTab === 'plan' && (
          <AppointmentPlan appointments={appointments} pastAppointments={pastAppointments} upcomingAppointments={upcomingAppointments} />
        )}
      </div>
    </PatientPanel>
  )
}

function AppointmentList({ appointments, emptyText }: { appointments: BookingAppointment[]; emptyText: string }) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-4 text-center text-[0.86rem] font-bold text-[#53687b]">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {appointments.map((appointment) => (
        <div
          key={appointment.appointment_record_id || appointment.appointment_id}
          className="grid grid-cols-[1fr_auto] gap-3 rounded-[10px] border border-[#d7e5ec] bg-white p-4 max-[720px]:grid-cols-1"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-[0.98rem] text-[#102033]">
                {formatAppointmentDateTime(appointment.date, appointment.start_time)}
              </strong>
              <span className="rounded-full border border-[#cbdde6] bg-[#f7fbfd] px-2 py-0.5 text-[0.7rem] font-black text-[#53687b]">
                {appointment.status_label || appointment.status || 'Scheduled'}
              </span>
            </div>
            <div className="mt-2 text-[0.9rem] font-bold text-[#143A57]">{appointment.doctor_name}</div>
            <div className="mt-1 text-[0.82rem] font-semibold text-[#53687b]">
              {[appointment.speciality, appointment.department].filter(Boolean).join(' - ') || 'Clinic appointment'}
            </div>
            {(appointment.reason_category || appointment.reason_text) && (
              <div className="mt-2 text-[0.84rem] font-semibold text-[#102033]">
                {appointmentReason(appointment)}
                {appointment.reason_category && appointment.reason_text ? `: ${appointment.reason_text}` : ''}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end justify-between gap-2 text-right max-[720px]:items-start max-[720px]:text-left">
            <span className="rounded-[8px] bg-[#e7f3f8] px-2.5 py-1 text-[0.72rem] font-black text-[#143A57]">
              {appointment.appointment_id || 'Appointment'}
            </span>
            <span className="text-[0.74rem] font-bold text-[#6b7f91]">
              Patient: {appointment.patient_display || 'Matched patient'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function AppointmentPlan({
  appointments,
  pastAppointments,
  upcomingAppointments,
}: {
  appointments: BookingAppointment[]
  pastAppointments: BookingAppointment[]
  upcomingAppointments: BookingAppointment[]
}) {
  const nextAppointment = upcomingAppointments[0]
  const latestPastAppointment = pastAppointments[0]
  const focusCounts = appointments.reduce<Record<string, number>>((counts, appointment) => {
    const focus = appointmentReason(appointment)
    counts[focus] = (counts[focus] ?? 0) + 1
    return counts
  }, {})
  const careFocus =
    Object.entries(focusCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'General care coordination'

  const planItems = [
    {
      icon: <Clock3 size={18} />,
      label: 'Next scheduled visit',
      value: nextAppointment
        ? `${formatAppointmentDateTime(nextAppointment.date, nextAppointment.start_time)} with ${nextAppointment.doctor_name}`
        : 'No upcoming visit in this window',
    },
    {
      icon: <CalendarDays size={18} />,
      label: 'Recent visit reference',
      value: latestPastAppointment
        ? `${formatAppointmentDateTime(latestPastAppointment.date, latestPastAppointment.start_time)} with ${latestPastAppointment.doctor_name}`
        : 'No recent visit in this window',
    },
    {
      icon: <ClipboardList size={18} />,
      label: 'Care focus',
      value: careFocus,
    },
  ]

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
        {planItems.map((item) => (
          <div key={item.label} className="rounded-[10px] border border-[#d7e5ec] bg-[#f7fbfd] p-4">
            <div className="mb-2 flex items-center gap-2 text-[#143A57]">
              {item.icon}
              <span className="text-[0.74rem] font-black uppercase text-[#53687b]">{item.label}</span>
            </div>
            <p className="m-0 text-[0.9rem] font-bold leading-relaxed text-[#102033]">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-[10px] border border-[#b7ceda] bg-white p-4 text-[0.86rem] font-semibold leading-relaxed text-[#53687b]">
        Use this plan view to compare the appointment you are about to book against your existing schedule. If
        the next visit covers the same care focus, keep the current visit and bring new concerns to that
        appointment.
      </div>
    </div>
  )
}

function DoctorWeeklyCalendar({
  appointments,
  days,
  doctor,
  selectedSlotId,
  onSelect,
}: {
  appointments: BookingAppointment[]
  days: string[]
  doctor: BookingDoctor
  selectedSlotId: string | null
  onSelect: (doctor: BookingDoctor, date: string, hour: number, selected: boolean) => void
}) {
  const schedule = getScheduleForDoctor(doctor)
  const activeDoctorAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.doctor_record_id === doctor.doctor_record_id && !isCancelledAppointment(appointment),
      ),
    [appointments, doctor.doctor_record_id],
  )

  function appointmentForCell(date: string, hour: number) {
    return activeDoctorAppointments.find(
      (appointment) => appointment.date === date && appointmentOverlapsHour(appointment, hour),
    )
  }

  return (
    <div className="overflow-x-auto rounded-[12px] border border-[#d7e5ec] bg-white">
      <div className="grid min-w-[1180px] grid-cols-[92px_repeat(7,minmax(148px,1fr))]">
        <div className="border-b border-r border-[#d7e5ec] bg-[#f7fbfd] p-3 text-[0.72rem] font-black uppercase text-[#6b7f91]">
          Time
        </div>
        {days.map((date) => (
          <div key={date} className="border-b border-r border-[#d7e5ec] bg-[#f7fbfd] p-4 last:border-r-0">
            <div className="text-[0.94rem] font-black text-[#102033]">{formatDate(date)}</div>
            <div className="text-[0.72rem] font-bold text-[#6b7f91]">{doctor.name}</div>
          </div>
        ))}

        {CALENDAR_HOURS.map((hour) => (
          <CalendarRow
            key={hour}
            appointmentsForCell={appointmentForCell}
            days={days}
            doctor={doctor}
            hour={hour}
            schedule={schedule}
            selectedSlotId={selectedSlotId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function CalendarRow({
  appointmentsForCell,
  days,
  doctor,
  hour,
  schedule,
  selectedSlotId,
  onSelect,
}: {
  appointmentsForCell: (date: string, hour: number) => BookingAppointment | undefined
  days: string[]
  doctor: BookingDoctor
  hour: number
  schedule: SpecialtySchedule
  selectedSlotId: string | null
  onSelect: (doctor: BookingDoctor, date: string, hour: number, selected: boolean) => void
}) {
  return (
    <>
      <div className="flex min-h-[88px] items-start justify-end border-r border-t border-[#d7e5ec] bg-white p-3 text-[0.74rem] font-black text-[#7c8fa1]">
        {timeRangeForHour(hour)}
      </div>
      {days.map((date) => {
        const appointment = appointmentsForCell(date, hour)
        const isInDoctorSchedule = isBookableHour(hour, schedule)
        const isBreak = isInDoctorSchedule && hour === schedule.breakHour
        const specialAppointment = appointment !== undefined && isSpecialAppointment(appointment, schedule)
        const isBooked = appointment !== undefined && !specialAppointment
        const isUnavailable = !appointment && !isInDoctorSchedule
        const isAvailable = !appointment && isInDoctorSchedule && !isBreak
        const selectionId = `${doctor.doctor_record_id}-${date}-${hour}`
        const selected = selectedSlotId === selectionId

        return (
          <button
            key={`${date}-${hour}`}
            type="button"
            disabled={!isAvailable}
            onClick={() => {
              if (isAvailable) onSelect(doctor, date, hour, selected)
            }}
            title={appointment ? appointmentTooltip(appointment, hour, specialAppointment, schedule) : undefined}
            aria-label={cellLabel(date, hour, doctor, appointment, isBreak, isUnavailable, specialAppointment, schedule)}
            className={cn(
              'group relative min-h-[88px] border-r border-t p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#143A57]/40 last:border-r-0',
              isAvailable && !selected && 'border-[#a7dfbf] bg-[#e4f7eb] text-[#0f6b4f] hover:bg-[#d6f0df]',
              selected && 'border-[#2563eb] bg-[#dbeafe] text-[#1d4ed8] shadow-[inset_0_0_0_2px_#2563eb]',
              isBreak && !appointment && 'cursor-not-allowed border-[#f4d16f] bg-[#fff6cc] text-[#805b00]',
              isUnavailable && 'cursor-not-allowed border-[#d7e0e7] bg-[#eef2f5] text-[#74889a]',
              isBooked && 'cursor-not-allowed border-[#f3a19c] bg-[#feeceb] text-[#a22828]',
              specialAppointment && 'cursor-not-allowed border-[#f0b56a] bg-[#fff0db] text-[#9a4f00]',
            )}
          >
            <span className="block text-[0.82rem] font-black">
              {appointment ? formatTime(appointment.start_time) : formatTime(hourTime(hour))}
            </span>
            <span className="mt-1 block text-[0.76rem] font-bold leading-5">
              {isAvailable && (selected ? 'Selected' : 'Available')}
              {isBreak && !appointment && schedule.breakLabel}
              {isUnavailable && 'Unavailable'}
              {isBooked && 'Booked'}
              {specialAppointment && 'Special appointment'}
            </span>
            {appointment && (
              <>
                <span className="mt-2 block truncate text-[0.72rem] font-bold">
                  {appointment.patient_display || 'Patient unavailable'}
                </span>
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-[240px] -translate-x-1/2 rounded-[9px] border border-[#cbdde6] bg-white p-3 text-[0.76rem] font-bold leading-relaxed text-[#102033] shadow-[0_16px_36px_rgba(25,64,93,0.18)] group-hover:block group-focus:block">
                  <strong className="mb-1 block">
                    {specialAppointment ? 'Special appointment' : appointment.status_label || 'Booked'}
                  </strong>
                  {formatShortDate(date)} at {formatTime(appointment.start_time)}
                  <br />
                  Patient: {appointment.patient_display || 'Patient unavailable'}
                  {(appointment.reason_category || appointment.reason_text) && (
                    <>
                      <br />
                      {appointment.reason_category || appointment.reason_text}
                    </>
                  )}
                </span>
              </>
            )}
          </button>
        )
      })}
    </>
  )
}

function appointmentTooltip(
  appointment: BookingAppointment,
  hour: number,
  specialAppointment: boolean,
  schedule: SpecialtySchedule,
) {
  return [
    specialAppointment ? 'Special appointment' : appointment.status_label || 'Booked',
    timeRangeForHour(hour),
    `Appointment time: ${formatTime(appointment.start_time)}`,
    `Schedule: ${timeRangeForHour(schedule.startHour).split(' - ')[0]} - ${formatTime(hourTime(schedule.endHour))}`,
    `Patient: ${appointment.patient_display || 'Patient unavailable'}`,
    appointment.reason_category || appointment.reason_text,
  ]
    .filter(Boolean)
    .join('\n')
}

function cellLabel(
  date: string,
  hour: number,
  doctor: BookingDoctor,
  appointment: BookingAppointment | undefined,
  isBreak: boolean,
  isUnavailable: boolean,
  specialAppointment: boolean,
  schedule: SpecialtySchedule,
) {
  if (appointment) {
    return `${specialAppointment ? 'Special appointment' : 'Booked appointment'} for ${doctor.name} on ${formatDate(date)} at ${formatTime(appointment.start_time)}. Patient ${appointment.patient_display || 'unavailable'}.`
  }
  if (isBreak) return `${schedule.breakLabel} for ${doctor.name} on ${formatDate(date)} at ${timeRangeForHour(hour)}.`
  if (isUnavailable) return `Unavailable for ${doctor.name} on ${formatDate(date)} at ${timeRangeForHour(hour)}.`
  return `Available appointment for ${doctor.name} on ${formatDate(date)} at ${timeRangeForHour(hour)}.`
}
