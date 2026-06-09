import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppointmentCard } from '../../components/patient/AppointmentCard'
import { PatientPanel } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { bookingSlots, type Appointment } from '../../data/patientPortalData'
import { cn } from '../../lib/cn'
import {
  fetchPatientBookingAvailability,
  type BookingCalendarDay,
  type BookingCalendarResponse,
  type BookingSlot,
} from '../../services/serviceNow'

const STEPS = [
  { number: 1, title: 'Reason for visit' },
  { number: 2, title: 'Available slots' },
  { number: 3, title: 'Review & Booking Confirmation' },
] as const

const fieldClass =
  'w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit'
const labelClass = 'grid gap-[7px] text-[0.84rem] font-bold'
const ANY_SPECIALITY = 'Any speciality'
const CALENDAR_START_HOUR = 8
const CALENDAR_END_HOUR = 20
const CALENDAR_TOTAL_MINUTES = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60
const CALENDAR_HOURS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
  (_, index) => CALENDAR_START_HOUR + index,
)

function todayIso() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2026, 0, 1, hours, minutes))
}

function slotTimeRange(slot: BookingSlot) {
  return `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`
}

function slotSpeciality(slot: BookingSlot) {
  return slot.speciality || slot.department || 'General'
}

function appointmentFromSlot(slot: BookingSlot): Appointment {
  return {
    id: slot.slot_record_id,
    date: formatDate(slot.date),
    time: slotTimeRange(slot),
    doctor: slot.doctor_name,
    department: slot.department || slot.speciality || slot.appointment_type_label || 'Clinic',
    reason: slot.appointment?.reason_category || slot.appointment_type_label || 'General visit',
    status: slot.status_label || (slot.selectable ? 'Available' : 'Unavailable'),
    location: [slot.location, slot.floor ? `Floor ${slot.floor}` : ''].filter(Boolean).join(', ') || 'Clinic',
  }
}

export function BookAppointmentPage() {
  const [step, setStep] = useState(1)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [booked, setBooked] = useState(false)
  const [selectedSpeciality, setSelectedSpeciality] = useState(ANY_SPECIALITY)
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
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

  useEffect(() => {
    let active = true

    async function loadAvailability() {
      setIsLoadingAvailability(true)
      setAvailabilityError(null)
      try {
        const response = await fetchPatientBookingAvailability(todayIso(), 14)
        if (!active) return
        setAvailability(response)
        if (response.slots.length === 0) {
          setAvailabilityError('No live ServiceNow slots were returned. Showing fallback slots.')
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
  }, [])

  const liveSlots = useMemo(() => availability?.slots ?? [], [availability])
  const specialityOptions = useMemo(() => {
    const names = new Set(liveSlots.map(slotSpeciality).filter(Boolean))
    return [ANY_SPECIALITY, ...Array.from(names).sort((a, b) => a.localeCompare(b))]
  }, [liveSlots])
  const specialitySlots = useMemo(
    () =>
      selectedSpeciality === ANY_SPECIALITY
        ? liveSlots
        : liveSlots.filter((slot) => slotSpeciality(slot) === selectedSpeciality),
    [liveSlots, selectedSpeciality],
  )
  const doctorOptions = useMemo(() => {
    const doctors = new Map<string, { id: string; name: string; speciality: string; availableCount: number }>()
    for (const slot of specialitySlots) {
      const existing = doctors.get(slot.doctor_record_id)
      doctors.set(slot.doctor_record_id, {
        id: slot.doctor_record_id,
        name: slot.doctor_name,
        speciality: slotSpeciality(slot),
        availableCount: (existing?.availableCount ?? 0) + (slot.selectable ? 1 : 0),
      })
    }
    return Array.from(doctors.values()).sort((a, b) => {
      if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount
      return a.name.localeCompare(b.name)
    })
  }, [specialitySlots])
  const filteredDoctorSlots = useMemo(
    () => specialitySlots.filter((slot) => slot.doctor_record_id === selectedDoctorId),
    [specialitySlots, selectedDoctorId],
  )
  const liveAppointments = useMemo(() => filteredDoctorSlots.map(appointmentFromSlot), [filteredDoctorSlots])
  const hasLiveAvailability = liveSlots.length > 0
  const effectiveSlots = hasLiveAvailability ? liveAppointments : bookingSlots
  const selectableById = useMemo(() => {
    const entries = filteredDoctorSlots.map((slot) => [slot.slot_record_id, slot.selectable] as const)
    return new Map(entries)
  }, [filteredDoctorSlots])

  const selectedSlot = useMemo(
    () => effectiveSlots.find((slot) => slot.id === selectedSlotId),
    [effectiveSlots, selectedSlotId],
  )

  useEffect(() => {
    if (doctorOptions.length === 0) {
      setSelectedDoctorId('')
      return
    }
    if (!doctorOptions.some((doctor) => doctor.id === selectedDoctorId)) {
      setSelectedDoctorId(doctorOptions[0].id)
    }
  }, [doctorOptions, selectedDoctorId])

  useEffect(() => {
    if (selectedSlotId && hasLiveAvailability && !filteredDoctorSlots.some((slot) => slot.slot_record_id === selectedSlotId)) {
      setSelectedSlotId(null)
    }
  }, [filteredDoctorSlots, hasLiveAvailability, selectedSlotId])

  const canGoNext = step === 1 || (step === 2 && selectedSlot !== undefined)

  function selectLiveSlot(slot: BookingSlot) {
    if (!slot.selectable) return
    setSelectedSlotId(slot.slot_record_id)
  }

  function selectAppointmentSlot(slot: Appointment) {
    const selectable = !hasLiveAvailability || selectableById.get(slot.id) !== false
    if (!selectable) return
    setSelectedSlotId(slot.id)
  }

  function goNext() {
    if (step === 1) setStep(2)
    else if (step === 2 && selectedSlot) setStep(3)
  }

  function goPrevious() {
    if (step > 1) setStep(step - 1)
  }

  return (
    <PatientPage
      title="Find an available clinic slot"
      intro="Choose a reason for visit, select a slot, and confirm your appointment."
    >
      <PatientPanel title="Clinic availability" icon={<CalendarDays size={21} />} tone="secure">
        <div className="mb-4 grid gap-4">
          <div>
            <p className="m-0 text-[0.9rem] font-semibold text-[#53687b]">
              Choose a speciality and doctor to view their ServiceNow calendar.
            </p>
            {availability && (
              <p className="m-0 mt-1 text-[0.78rem] font-bold text-[#6b7f91]">
                {formatDate(availability.start_date)} through {formatDate(availability.end_date)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
            <label className={labelClass}>
              <span>Speciality</span>
              <select
                className={fieldClass}
                value={selectedSpeciality}
                onChange={(event) => setSelectedSpeciality(event.target.value)}
                disabled={isLoadingAvailability || !hasLiveAvailability}
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
                onChange={(event) => setSelectedDoctorId(event.target.value)}
                disabled={isLoadingAvailability || !hasLiveAvailability || doctorOptions.length === 0}
              >
                {doctorOptions.length === 0 ? (
                  <option value="">No doctors available</option>
                ) : (
                  doctorOptions.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} ({doctor.availableCount} available)
                    </option>
                  ))
                )}
              </select>
            </label>
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

            {hasLiveAvailability ? (
              <DoctorCalendarAvailability
                days={availability?.days.slice(0, 7) ?? []}
                slots={filteredDoctorSlots}
                selectedSlotId={selectedSlotId}
                onSelect={selectLiveSlot}
              />
            ) : (
              <div className="grid grid-cols-3 gap-3.5 max-[1100px]:grid-cols-1">
                {bookingSlots.slice(0, 3).map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlotId(slot.id)
                      if (step === 1) setStep(2)
                    }}
                    className={cn(
                      'rounded-xl text-left transition-all',
                      selectedSlotId === slot.id ? 'border-2 border-[#143A57]' : 'border-2 border-transparent',
                    )}
                  >
                    <AppointmentCard selectable appointment={slot} />
                  </button>
                ))}
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
        <PatientPanel title="2. Available slots" icon={<CalendarPlus size={21} />} tone="secure" className="mt-6">
          <p className="mb-4 text-[0.9rem] font-semibold text-[#53687b]">
            Select a time slot to continue to review.
          </p>
          <div className="grid grid-cols-3 gap-3.5 max-[1100px]:grid-cols-1">
            {effectiveSlots.map((slot) => {
              const selected = selectedSlotId === slot.id
              const selectable = !hasLiveAvailability || selectableById.get(slot.id) !== false

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => selectAppointmentSlot(slot)}
                  disabled={!selectable}
                  className={cn(
                    'rounded-xl text-left transition-all disabled:cursor-not-allowed disabled:opacity-60',
                    selected ? 'border-2 border-[#143A57]' : 'border-2 border-transparent',
                  )}
                >
                  <AppointmentCard
                    selectable={selectable}
                    appointment={{
                      ...slot,
                      status: selected ? 'Selected' : slot.status,
                    }}
                  />
                </button>
              )
            })}
          </div>
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
    </PatientPage>
  )
}

function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return CALENDAR_START_HOUR * 60
  return hours * 60 + minutes
}

function slotPosition(slot: BookingSlot) {
  const calendarStart = CALENDAR_START_HOUR * 60
  const calendarEnd = CALENDAR_END_HOUR * 60
  const rawStart = minutesFromTime(slot.start_time)
  const rawEnd = Math.max(minutesFromTime(slot.end_time), rawStart + 15)
  const visibleStart = Math.max(rawStart, calendarStart)
  const visibleEnd = Math.min(rawEnd, calendarEnd)
  const duration = Math.max(visibleEnd - visibleStart, 15)

  return {
    top: `${((visibleStart - calendarStart) / CALENDAR_TOTAL_MINUTES) * 100}%`,
    height: `${Math.max((duration / CALENDAR_TOTAL_MINUTES) * 100, 4)}%`,
  }
}

function slotDetails(slot: BookingSlot) {
  return [
    slot.doctor_name,
    `${formatDate(slot.date)} at ${slotTimeRange(slot)}`,
    slot.status_label,
    slot.appointment_type_label,
    [slot.location, slot.floor ? `Floor ${slot.floor}` : ''].filter(Boolean).join(', '),
    slotSpeciality(slot),
    slot.appointment?.reason_category,
    slot.appointment?.reason_text,
  ]
    .filter(Boolean)
    .join('\n')
}

function DoctorCalendarAvailability({
  days,
  slots,
  selectedSlotId,
  onSelect,
}: {
  days: BookingCalendarDay[]
  slots: BookingSlot[]
  selectedSlotId: string | null
  onSelect: (slot: BookingSlot) => void
}) {
  const slotsByDate = useMemo(() => {
    const groups = new Map<string, BookingSlot[]>()
    for (const slot of slots) {
      groups.set(slot.date, [...(groups.get(slot.date) ?? []), slot])
    }
    return groups
  }, [slots])

  return (
    <div className="overflow-x-auto rounded-[12px] border border-[#d7e5ec] bg-white">
      <div className="grid min-w-[980px] grid-cols-[72px_repeat(7,minmax(120px,1fr))]">
        <div className="border-b border-r border-[#d7e5ec] bg-[#f7fbfd] p-3 text-[0.72rem] font-black uppercase text-[#6b7f91]">
          Time
        </div>
        {days.map((day) => (
          <div key={day.date} className="border-b border-r border-[#d7e5ec] bg-[#f7fbfd] p-3 last:border-r-0">
            <div className="text-[0.9rem] font-black text-[#102033]">{day.label}</div>
            <div className="text-[0.72rem] font-bold text-[#6b7f91]">{formatDate(day.date)}</div>
          </div>
        ))}

        <div className="relative h-[720px] border-r border-[#d7e5ec] bg-white">
          {CALENDAR_HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute right-2 translate-y-[-50%] text-[0.68rem] font-bold text-[#7c8fa1]"
              style={{
                top: `${((hour - CALENDAR_START_HOUR) / (CALENDAR_END_HOUR - CALENDAR_START_HOUR)) * 100}%`,
              }}
            >
              {formatTime(`${String(hour).padStart(2, '0')}:00`)}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const daySlots = slotsByDate.get(day.date) ?? []

          return (
            <div
              key={day.date}
              className="relative h-[720px] border-r border-[#d7e5ec] bg-[#eef2f5] last:border-r-0"
              title="Grey time means this doctor is not working."
            >
              {CALENDAR_HOURS.slice(0, -1).map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-white/85"
                  style={{
                    top: `${((hour - CALENDAR_START_HOUR) / (CALENDAR_END_HOUR - CALENDAR_START_HOUR)) * 100}%`,
                  }}
                />
              ))}

              {daySlots.length === 0 && (
                <div className="absolute inset-x-3 top-4 rounded-[9px] border border-dashed border-[#c1ccd5] bg-white/70 p-2 text-center text-[0.72rem] font-bold text-[#6b7f91]">
                  Not working
                </div>
              )}

              {daySlots.map((slot) => {
                const selected = selectedSlotId === slot.slot_record_id
                const position = slotPosition(slot)

                return (
                  <button
                    key={slot.slot_record_id}
                    type="button"
                    aria-disabled={!slot.selectable}
                    onClick={() => {
                      if (slot.selectable) onSelect(slot)
                    }}
                    title={slotDetails(slot)}
                    aria-label={slotDetails(slot)}
                    className={cn(
                      'group absolute left-2 right-2 overflow-visible rounded-[8px] border px-2 py-1 text-left shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#143A57]/35',
                      slot.selectable
                        ? 'border-[#12805c] bg-[#dff4e8] text-[#0f6b4f] hover:bg-[#ccebdc]'
                        : 'cursor-not-allowed border-[#d25b55] bg-[#feeceb] text-[#a22828]',
                      selected && 'ring-2 ring-[#143A57]',
                    )}
                    style={position}
                  >
                    <span className="block truncate text-[0.72rem] font-black">
                      {formatTime(slot.start_time)}
                    </span>
                    <span className="block truncate text-[0.68rem] font-bold">
                      {selected ? 'Selected' : slot.status_label}
                    </span>
                    <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-[220px] -translate-x-1/2 rounded-[9px] border border-[#cbdde6] bg-white p-3 text-[0.76rem] font-bold leading-relaxed text-[#102033] shadow-[0_16px_36px_rgba(25,64,93,0.18)] group-hover:block group-focus:block">
                      <strong className="mb-1 block">{slot.status_label}</strong>
                      {slot.doctor_name}
                      <br />
                      {formatDate(slot.date)} at {slotTimeRange(slot)}
                      <br />
                      {slot.appointment_type_label}
                      <br />
                      {[slot.location, slot.floor ? `Floor ${slot.floor}` : ''].filter(Boolean).join(', ') || 'Clinic'}
                      <br />
                      {slotSpeciality(slot)}
                      {slot.appointment?.reason_category && (
                        <>
                          <br />
                          {slot.appointment.reason_category}
                        </>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
