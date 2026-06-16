import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  Stethoscope,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PatientPage } from '../../components/patient/PatientShell'
import { usePatientSchedule } from '../../hooks/usePatientSchedule'
import {
  appointmentReason,
  formatDate,
  formatTime,
  isCancelledAppointment,
} from '../../lib/scheduling'
import { updateAppointment, type BookingAppointment } from '../../services/serviceNow'

function statusBadgeClass(status: string) {
  const v = status.toLowerCase()
  if (v === 'cancelled' || v === 'canceled') return 'bg-red-100 text-red-700'
  if (v === 'completed') return 'bg-emerald-100 text-emerald-700'
  if (v === 'confirmed') return 'bg-sky-100 text-[#0f5f8c]'
  if (v === 'arrived' || v === 'in-progress') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

export function AppointmentsPage() {
  const { upcoming, past, error, isLoading, refetch } = usePatientSchedule()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingAppointment | null>(null)

  async function cancel(a: BookingAppointment) {
    if (!window.confirm('Cancel this appointment?')) return
    setPendingId(a.appointment_record_id)
    setActionError(null)
    try {
      await updateAppointment({ record_id: a.appointment_record_id, status: 'cancelled' })
      refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to cancel.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <PatientPage title="My appointments" intro="Your upcoming and past visits. Open any appointment to see details and your doctor's visit summary.">
      <div className="-mt-3 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-bold text-[#53687b]">
          {isLoading ? (
            <span className="inline-flex items-center gap-2"><LoaderCircle size={16} className="animate-spin" /> Loading appointments</span>
          ) : (error || actionError) ? (
            <span className="inline-flex items-center gap-2 text-[#a22828]"><AlertTriangle size={16} /> {error || actionError}</span>
          ) : (
            <span>{upcoming.length} upcoming · {past.length} past</span>
          )}
        </div>
        <button type="button" onClick={refetch} className="inline-flex items-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-4 py-2 text-sm font-bold text-[#0f5f8c] hover:bg-[#f5f9fb]">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <Section title="Upcoming">
        {upcoming.length === 0 ? (
          <Empty>No upcoming appointments. <Link to="/patient/book" className="font-bold text-[#0f5f8c] hover:underline">Book a visit</Link>.</Empty>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <AppointmentRow
                key={a.appointment_record_id}
                appointment={a}
                busy={pendingId === a.appointment_record_id}
                onCancel={() => void cancel(a)}
                onReschedule={() => setRescheduleTarget(a)}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Past">
        {past.length === 0 ? (
          <Empty>No past appointments yet.</Empty>
        ) : (
          <div className="space-y-3">
            {past.map((a) => (
              <AppointmentRow key={a.appointment_record_id} appointment={a} />
            ))}
          </div>
        )}
      </Section>

      {rescheduleTarget && (
        <RescheduleModal
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSaved={() => {
            setRescheduleTarget(null)
            refetch()
          }}
        />
      )}
    </PatientPage>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-lg font-black text-[#102033]">{title}</h2>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-6 text-center text-sm font-bold text-[#53687b]">
      {children}
    </div>
  )
}

function AppointmentRow({
  appointment,
  busy,
  onCancel,
  onReschedule,
}: {
  appointment: BookingAppointment
  busy?: boolean
  onCancel?: () => void
  onReschedule?: () => void
}) {
  const cancelled = isCancelledAppointment(appointment)
  const manageable = Boolean(onCancel) && !cancelled
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/patient/appointments/${encodeURIComponent(appointment.appointment_record_id)}`} className="flex min-w-0 flex-1 items-center gap-3 !text-inherit">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#e7f3f8] text-[#0397AE]">
            <Stethoscope size={18} />
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900">{appointment.doctor_name || 'Doctor'}</div>
            <div className="truncate text-xs text-slate-500">
              {formatDate(appointment.date)} · {formatTime(appointment.start_time)} · {appointmentReason(appointment)}
            </div>
          </div>
        </Link>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadgeClass(appointment.status)}`}>
          {appointment.status_label || appointment.status}
        </span>
        {manageable && (
          <div className="flex items-center gap-1.5">
            {busy ? (
              <LoaderCircle size={16} className="animate-spin text-slate-400" />
            ) : (
              <>
                <button type="button" onClick={onReschedule} className="inline-flex items-center gap-1 rounded-lg border border-[#b7ceda] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0f5f8c] hover:bg-[#f5f9fb]">
                  <CalendarClock size={13} /> Reschedule
                </button>
                <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 rounded-lg border border-[#f3c0bc] bg-white px-2.5 py-1.5 text-xs font-bold text-[#a22828] hover:bg-[#fff4f3]">
                  <X size={13} /> Cancel
                </button>
              </>
            )}
          </div>
        )}
        <Link to={`/patient/appointments/${encodeURIComponent(appointment.appointment_record_id)}`} className="text-slate-400">
          <ChevronRight size={18} />
        </Link>
      </div>
    </div>
  )
}

function RescheduleModal({
  appointment,
  onClose,
  onSaved,
}: {
  appointment: BookingAppointment
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] = useState(appointment.date)
  const [time, setTime] = useState((appointment.start_time || '09:00:00').slice(0, 5))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await updateAppointment({ record_id: appointment.appointment_record_id, date, start_time: `${time}:00` })
      onSaved()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Unable to reschedule.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><CalendarClock size={18} className="text-[#0397AE]" /> Reschedule</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <p className="text-sm text-slate-500">Pick a new date and time for your appointment with {appointment.doctor_name}.</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full rounded-lg border border-slate-300 p-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="w-full rounded-lg border border-slate-300 p-2.5 text-sm" />
          </label>
          {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-[#a22828]">{err}</div>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-[9px] border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700">Cancel</button>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-[9px] bg-[#143A57] px-4 py-2.5 font-bold text-white disabled:opacity-60">
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <CalendarClock size={16} />}
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
