import { useEffect, useMemo, useState } from 'react'
import { Activity, CalendarCheck, MessageSquare, Search, UserCheck, DoorOpen, CalendarPlus, X, Check, Mail, ArrowUpRight, LoaderCircle } from 'lucide-react'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { PortalPanel, PortalTable } from '../../components/portal/PortalShell'
import {
  fetchPatientBookingAvailability,
  fetchPatientRegistrations,
  type BookingAppointment,
  type PatientRegistrationSummary,
} from '../../services/serviceNow'
import {
  APPOINTMENT_HISTORY_RANGE_DAYS,
  APPOINTMENT_LOOKBACK_DAYS,
  addDays,
  appointmentReason,
  appointmentSortValue,
  formatTime,
  formatShortDate,
  isCancelledAppointment,
  todayIso,
} from '../../lib/scheduling'

// Demo-only data: no ServiceNow table backs contact cases or room status.
const adminCases = [
  { ref: 'CASE-7802', subject: 'Appointment query', status: 'New' },
  { ref: 'CASE-7791', subject: 'Billing', status: 'Assigned' },
  { ref: 'CASE-7788', subject: 'Technical issue', status: 'Waiting' },
]

const rooms: [string, string][] = [
  ['1A', 'Occupied'], ['1B', 'Available'], ['1C', 'Cleaning'],
  ['2A', 'Occupied'], ['2B', 'Available'], ['2C', 'Available'],
  ['3C', 'Occupied'], ['4A', 'Cleaning'], ['4B', 'Available'],
]

function AdminStat({ label, value, helper, color = 'text-[#102033]' }: { label: string; value: string; helper: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[#d7e5ec] bg-white p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[#607487]">{label}</div>
      <div className={`mt-2 text-3xl font-black ${color}`}>{value}</div>
      <div className="mt-1 text-sm text-[#607487]">{helper}</div>
    </div>
  )
}

export function AdminDashboardPage() {
  const [appointments, setAppointments] = useState<BookingAppointment[]>([])
  const [registrations, setRegistrations] = useState<PatientRegistrationSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const today = useMemo(todayIso, [])
  const windowStart = useMemo(() => addDays(today, -APPOINTMENT_LOOKBACK_DAYS), [today])

  useEffect(() => {
    let active = true

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [availability, pending] = await Promise.all([
          fetchPatientBookingAvailability(windowStart, APPOINTMENT_HISTORY_RANGE_DAYS),
          fetchPatientRegistrations('pending', 50),
        ])
        if (!active) return
        setAppointments(availability.appointments)
        setRegistrations(pending)
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Unable to load ServiceNow data.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [windowStart])

  const todaysAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.date === today),
    [appointments, today],
  )

  // Fall back to the most recent appointments when there are none scheduled for today.
  const visibleAppointments = useMemo(() => {
    const base = todaysAppointments.length > 0
      ? todaysAppointments
      : [...appointments].sort((a, b) => appointmentSortValue(b) - appointmentSortValue(a)).slice(0, 8)
    const term = query.trim().toLowerCase()
    if (!term) return base
    return base.filter((appointment) =>
      [appointment.patient_display, appointment.doctor_name, appointment.appointment_id, appointment.reason_category]
        .some((value) => value.toLowerCase().includes(term)),
    )
  }, [appointments, todaysAppointments, query])

  const departments = useMemo(
    () => new Set(todaysAppointments.map((appointment) => appointment.department).filter(Boolean)).size,
    [todaysAppointments],
  )

  const appointmentsTitle = todaysAppointments.length > 0 ? 'All appointments today' : 'Recent appointments'

  return (
    <DoctorPage
      title="Master schedule and intake queue"
      intro="A receptionist/admin view for all appointments, patient lookup, manual actions, registration approvals, and contact cases. Appointments and approvals are live from ServiceNow."
    >
      {error && (
        <div className="mb-4 rounded-[10px] border border-[#f6c6c4] bg-[#fff4f3] p-3 text-[0.86rem] font-bold text-[#a22828]">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
        <AdminStat label="Total Today" value={isLoading ? '—' : String(todaysAppointments.length)} helper={`${departments} departments`} />
        <AdminStat label="Pending Approvals" value={isLoading ? '—' : String(registrations.length)} helper="Needs action" color="text-amber-600" />
        <AdminStat label="Open Cases" value={String(adminCases.length)} helper="Demo data" color="text-red-600" />
        <AdminStat label="Rooms Available" value="4" helper="of 9 total · demo" color="text-emerald-600" />
      </div>

      <div className="mb-4 rounded-xl border border-[#d7e5ec] bg-white p-3">
        <div className="flex items-center gap-3">
          <Search size={18} />
          <input
            className="flex-1 bg-transparent outline-none"
            placeholder="Search by patient name, ID, doctor, or reason..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 max-[1100px]:grid-cols-1">
        <PortalPanel title={appointmentsTitle} icon={<CalendarCheck size={21} />} tone="success">
          {isLoading ? (
            <div className="flex items-center gap-2 p-2 text-[#607487]"><LoaderCircle size={18} className="animate-spin" /> Loading appointments</div>
          ) : visibleAppointments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#d7e5ec] p-4 text-center text-sm text-[#607487]">No appointments found.</div>
          ) : (
            <PortalTable
              columns={['When', 'Patient', 'Doctor', 'Status']}
              rows={visibleAppointments.map((appointment) => [
                `${formatShortDate(appointment.date)} · ${formatTime(appointment.start_time)}`,
                appointment.patient_display || '—',
                appointment.doctor_name,
                appointment.status_label || appointment.status,
              ])}
            />
          )}
        </PortalPanel>

        <PortalPanel title="Quick actions" icon={<Activity size={21} />}>
          <div className="grid gap-2.5">
            {[
              [<CalendarPlus key="a" size={18} />, 'Create manual appointment'],
              [<X key="b" size={18} />, 'Cancel appointment'],
              [<Check key="c" size={18} />, 'Mark patient as arrived'],
              [<Mail key="d" size={18} />, 'Send reminders'],
            ].map(([icon, label]) => (
              <button key={String(label)} className="flex min-h-11 w-full items-center justify-between rounded-[10px] border border-[#d7e5ec] bg-white px-3 py-2.5 font-bold">
                <span className="flex items-center gap-2.5">{icon}{label}</span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
        </PortalPanel>

        <PortalPanel title="Pending registration approvals" icon={<UserCheck size={21} />} tone="warning">
          {isLoading ? (
            <div className="flex items-center gap-2 p-2 text-[#607487]"><LoaderCircle size={18} className="animate-spin" /> Loading</div>
          ) : registrations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#d7e5ec] p-4 text-center text-sm text-[#607487]">No registrations are pending approval.</div>
          ) : (
            <PortalTable
              columns={['Patient', 'Condition', 'Confidence']}
              rows={registrations.map((registration) => [
                `${registration.first_name} ${registration.last_name}`.trim() || registration.email,
                registration.health_condition || '—',
                registration.confidence_score ? `${registration.confidence_score}%` : '—',
              ])}
            />
          )}
        </PortalPanel>

        <PortalPanel title="Unresolved contact cases" icon={<MessageSquare size={21} />} tone="danger">
          <PortalTable
            columns={['Reference', 'Subject', 'Status']}
            rows={adminCases.map((item) => [item.ref, item.subject, item.status])}
          />
        </PortalPanel>

        <PortalPanel title="Recent activity log" icon={<Activity size={21} />}>
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-[#607487]"><LoaderCircle size={18} className="animate-spin" /> Loading</div>
            ) : (
              [...appointments]
                .sort((a, b) => appointmentSortValue(b) - appointmentSortValue(a))
                .filter((appointment) => !isCancelledAppointment(appointment))
                .slice(0, 3)
                .map((appointment) => (
                  <div key={appointment.appointment_record_id} className="border-b border-[#d7e5ec] pb-2">
                    <div className="font-bold">
                      {(appointment.patient_display || 'Patient')} · {appointment.status_label || appointment.status}
                    </div>
                    <div className="text-sm text-[#607487]">
                      {formatShortDate(appointment.date)} {formatTime(appointment.start_time)} · {appointment.doctor_name}
                    </div>
                  </div>
                ))
            )}
          </div>
        </PortalPanel>

        <PortalPanel title="Room status" icon={<DoorOpen size={21} />}>
          <div className="grid grid-cols-3 gap-2">
            {rooms.map(([room, status]) => (
              <div key={room} className="rounded-lg border border-[#d7e5ec] p-3 text-center">
                <div className="font-black">{room}</div>
                <div className="text-xs text-[#607487]">{status}</div>
              </div>
            ))}
          </div>
        </PortalPanel>
      </div>
    </DoctorPage>
  )
}
