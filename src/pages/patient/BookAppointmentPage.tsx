import { CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppointmentCard } from '../../components/patient/AppointmentCard'
import { PatientPanel } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { bookingSlots } from '../../data/patientPortalData'
import { cn } from '../../lib/cn'

const STEPS = [
  { number: 1, title: 'Reason for visit' },
  { number: 2, title: 'Available slots' },
  { number: 3, title: 'Review & Booking Confirmation' },
] as const

const fieldClass =
  'w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit'
const labelClass = 'grid gap-[7px] text-[0.84rem] font-bold'

export function BookAppointmentPage() {
  const [step, setStep] = useState(1)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [booked, setBooked] = useState(false)

  const [visitType, setVisitType] = useState('In-person')
  const [reasonCategory, setReasonCategory] = useState('General check-up')
  const [specialty, setSpecialty] = useState('Any available')
  const [concern, setConcern] = useState('')
  const [provider, setProvider] = useState('')
  const [memberId, setMemberId] = useState('')
  const [accessibility, setAccessibility] = useState('No special needs')
  const [interpreter, setInterpreter] = useState('No interpreter')

  const selectedSlot = useMemo(
    () => bookingSlots.find((slot) => slot.id === selectedSlotId),
    [selectedSlotId],
  )

  const canGoNext =
    step === 1 || (step === 2 && selectedSlotId !== null)

  function goNext() {
    if (step === 1) setStep(2)
    else if (step === 2 && selectedSlotId) setStep(3)
  }

  function goPrevious() {
    if (step > 1) setStep(step - 1)
  }

  return (
    <PatientPage
      title="Find an available clinic slot"
      intro="Choose a reason for visit, select a slot, and confirm your appointment."
    >
      <nav
        className="grid grid-cols-3 gap-2 rounded-[14px] border border-[#d7e5ec] bg-white p-4 shadow-[0_12px_30px_rgba(25,64,93,0.07)] max-[720px]:grid-cols-1"
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
                  placeholder="Optional · max 200 characters"
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
            {bookingSlots.map((slot) => {
              const selected = selectedSlotId === slot.id

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={cn(
                    'rounded-xl text-left transition-all',
                    selected ? 'border-2 border-[#143A57]' : 'border-2 border-transparent',
                  )}
                >
                  <AppointmentCard
                    selectable
                    appointment={{
                      ...slot,
                      status: selected ? 'Selected' : 'Available',
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
            <>
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
            </>
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
