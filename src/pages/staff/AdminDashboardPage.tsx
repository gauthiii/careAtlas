import { useEffect, useMemo, useState } from 'react'
import { Activity, CalendarCheck, MessageSquare, Search, UserCheck, DoorOpen, CalendarPlus, X, Check, LoaderCircle, RefreshCw } from 'lucide-react'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { PortalPanel, PortalTable } from '../../components/portal/PortalShell'
import {
  createClinicianAppointment,
  fetchPatientBookingAvailability,
  fetchPatientProfile,
  fetchPatientRegistrations,
  updateAppointment,
  updateRegistrationStatus,
  type BookingAppointment,
  type BookingDoctor,
  type PatientRegistrationSummary,
} from '../../services/serviceNow'
import {
  APPOINTMENT_HISTORY_RANGE_DAYS,
  APPOINTMENT_LOOKBACK_DAYS,
  addDays,
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

function statusBadgeClass(status: string) {
  const v = status.toLowerCase()
  if (v === 'cancelled' || v === 'canceled') return 'bg-red-100 text-red-700'
  if (v === 'completed') return 'bg-emerald-100 text-emerald-700'
  if (v === 'confirmed') return 'bg-sky-100 text-[#0f5f8c]'
  if (v === 'arrived' || v === 'in-progress') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

export function AdminDashboardPage() {
  const [appointments, setAppointments] = useState<BookingAppointment[]>([])
  const [doctors, setDoctors] = useState<BookingDoctor[]>([])
  const [registrations, setRegistrations] = useState<PatientRegistrationSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreateOpen, setCreateOpen] = useState(false)

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
        setDoctors(availability.doctors.filter((d) => d.active))
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
  }, [windowStart, refreshKey])

  const refresh = () => setRefreshKey((k) => k + 1)

  const todaysAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.date === today),
    [appointments, today],
  )

  const visibleAppointments = useMemo(() => {
    const base = todaysAppointments.length > 0
      ? todaysAppointments
      : [...appointments].sort((a, b) => appointmentSortValue(b) - appointmentSortValue(a)).slice(0, 12)
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

  async function runAppointmentAction(recordId: string, status: string) {
    setPendingId(recordId)
    setActionError(null)
    try {
      await updateAppointment({ record_id: recordId, status })
      refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setPendingId(null)
    }
  }

  async function runRegistrationAction(sysId: string, status: string) {
    setPendingId(sysId)
    setActionError(null)
    try {
      await updateRegistrationStatus(sysId, status)
      setRegistrations((prev) => prev.filter((r) => r.sys_id !== sysId))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setPendingId(null)
    }
  }

  const appointmentsTitle = todaysAppointments.length > 0 ? 'All appointments today' : 'Recent appointments'

  return (
    <DoctorPage
      title="Master schedule and intake queue"
      intro="A receptionist/admin view for all appointments, patient lookup, manual actions, registration approvals, and contact cases. Appointments and approvals are live from ServiceNow."
    >
      <div className="-mt-3 mb-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-[9px] bg-[#143A57] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d5c87]"
        >
          <CalendarPlus size={15} />
          Create manual appointment
        </button>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-4 py-2 text-sm font-bold text-[#0f5f8c] hover:bg-[#f5f9fb]"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {(error || actionError) && (
        <div className="mb-4 rounded-[10px] border border-[#f6c6c4] bg-[#fff4f3] p-3 text-[0.86rem] font-bold text-[#a22828]">
          {error || actionError}
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
            <div className="divide-y divide-[#eef3f6]">
              {visibleAppointments.map((appointment) => {
                const recordId = appointment.appointment_record_id
                const busy = pendingId === recordId
                const cancelled = isCancelledAppointment(appointment)
                const arrived = appointment.status.toLowerCase() === 'arrived'
                return (
                  <div key={recordId} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-[#102033]">{appointment.patient_display || '—'}</div>
                      <div className="truncate text-xs text-[#607487]">
                        {formatShortDate(appointment.date)} · {formatTime(appointment.start_time)} · {appointment.doctor_name}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadgeClass(appointment.status)}`}>
                      {appointment.status_label || appointment.status}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {busy ? (
                        <LoaderCircle size={16} className="animate-spin text-slate-400" />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void runAppointmentAction(recordId, 'arrived')}
                            disabled={cancelled || arrived}
                            title="Mark patient as arrived"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#b7ceda] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0f6b4f] hover:bg-[#f1faf4] disabled:opacity-40"
                          >
                            <Check size={13} /> Arrived
                          </button>
                          <button
                            type="button"
                            onClick={() => void runAppointmentAction(recordId, 'cancelled')}
                            disabled={cancelled}
                            title="Cancel appointment"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#f3c0bc] bg-white px-2.5 py-1.5 text-xs font-bold text-[#a22828] hover:bg-[#fff4f3] disabled:opacity-40"
                          >
                            <X size={13} /> Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </PortalPanel>

        <PortalPanel title="Pending registration approvals" icon={<UserCheck size={21} />} tone="warning">
          {isLoading ? (
            <div className="flex items-center gap-2 p-2 text-[#607487]"><LoaderCircle size={18} className="animate-spin" /> Loading</div>
          ) : registrations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#d7e5ec] p-4 text-center text-sm text-[#607487]">No registrations are pending approval.</div>
          ) : (
            <div className="divide-y divide-[#eef3f6]">
              {registrations.map((registration) => {
                const busy = pendingId === registration.sys_id
                return (
                  <div key={registration.sys_id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-[#102033]">
                        {`${registration.first_name} ${registration.last_name}`.trim() || registration.email}
                      </div>
                      <div className="truncate text-xs text-[#607487]">
                        {registration.health_condition || 'No condition noted'}
                        {registration.confidence_score ? ` · ${registration.confidence_score}% confidence` : ''}
                      </div>
                    </div>
                    {busy ? (
                      <LoaderCircle size={16} className="animate-spin text-slate-400" />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void runRegistrationAction(registration.sys_id, 'approved')}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#a7dfbf] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0f6b4f] hover:bg-[#f1faf4]"
                        >
                          <Check size={13} /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void runRegistrationAction(registration.sys_id, 'rejected')}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#f3c0bc] bg-white px-2.5 py-1.5 text-xs font-bold text-[#a22828] hover:bg-[#fff4f3]"
                        >
                          <X size={13} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
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

      {isCreateOpen && (
        <CreateAppointmentModal
          doctors={doctors}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            refresh()
          }}
        />
      )}
    </DoctorPage>
  )
}

function CreateAppointmentModal({
  doctors,
  onClose,
  onCreated,
}: {
  doctors: BookingDoctor[]
  onClose: () => void
  onCreated: () => void
}) {
  const [patientQuery, setPatientQuery] = useState('')
  const [patientSysId, setPatientSysId] = useState('')
  const [patientLabel, setPatientLabel] = useState('')
  const [resolving, setResolving] = useState(false)
  const [doctorRecordId, setDoctorRecordId] = useState(doctors[0]?.doctor_record_id ?? '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [reason, setReason] = useState('general-checkup')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function resolvePatient() {
    const name = patientQuery.trim()
    if (!name) return
    setResolving(true)
    setErr(null)
    setPatientSysId('')
    try {
      const profile = await fetchPatientProfile({ name })
      if (profile?.sys_id) {
        setPatientSysId(profile.sys_id)
        setPatientLabel(`${profile.first_name} ${profile.last_name}`.trim() || name)
      } else {
        setErr('No patient found with that name.')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Patient lookup failed.')
    } finally {
      setResolving(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!patientSysId || !doctorRecordId || !date) return
    setBusy(true)
    setErr(null)
    try {
      await createClinicianAppointment({
        doctor_record_id: doctorRecordId,
        patient_sys_id: patientSysId,
        date,
        start_time: `${time}:00`,
        reason_category: reason,
      })
      onCreated()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Unable to create appointment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <CalendarPlus size={18} className="text-[#0397AE]" />
            Create manual appointment
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Patient<span className="ml-0.5 text-[#a22828]">*</span></span>
            <div className="flex gap-2">
              <input
                value={patientQuery}
                onChange={(e) => { setPatientQuery(e.target.value); setPatientSysId('') }}
                placeholder="Patient full name"
                className="flex-1 rounded-lg border border-slate-300 p-2.5 text-sm"
              />
              <button type="button" onClick={() => void resolvePatient()} disabled={resolving || !patientQuery.trim()} className="inline-flex items-center gap-1.5 rounded-lg border border-[#b7ceda] bg-white px-3 text-sm font-bold text-[#0f5f8c] disabled:opacity-50">
                {resolving ? <LoaderCircle size={14} className="animate-spin" /> : <Search size={14} />}
                Find
              </button>
            </div>
            {patientSysId && (
              <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#0f6b4f]"><Check size={13} /> Matched: {patientLabel}</div>
            )}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Doctor<span className="ml-0.5 text-[#a22828]">*</span></span>
            <select value={doctorRecordId} onChange={(e) => setDoctorRecordId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
              {doctors.map((d) => (
                <option key={d.doctor_record_id} value={d.doctor_record_id}>{d.name}{d.speciality ? ` · ${d.speciality}` : ''}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Date<span className="ml-0.5 text-[#a22828]">*</span></span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full rounded-lg border border-slate-300 p-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Time<span className="ml-0.5 text-[#a22828]">*</span></span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="w-full rounded-lg border border-slate-300 p-2.5 text-sm" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Reason</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
              <option value="general-checkup">General check-up</option>
              <option value="follow-up">Follow-up</option>
              <option value="urgent">Urgent</option>
              <option value="specialist">Specialist referral</option>
              <option value="chronic">Chronic condition</option>
            </select>
          </label>

          {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-[#a22828]">{err}</div>}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-[9px] border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700">Cancel</button>
            <button type="submit" disabled={busy || !patientSysId || !date} className="inline-flex items-center gap-2 rounded-[9px] bg-[#143A57] px-4 py-2.5 font-bold text-white disabled:opacity-60">
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
              {busy ? 'Creating…' : 'Create appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
