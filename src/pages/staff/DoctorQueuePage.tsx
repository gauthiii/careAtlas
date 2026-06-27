import { AlertTriangle, Check, ChevronRight, LoaderCircle, RefreshCw, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { useClinicianSchedule } from '../../hooks/useClinicianSchedule'
import { appointmentSortValue, formatTime, isCancelledAppointment } from '../../lib/scheduling'
import { updateAppointment, type BookingAppointment } from '../../services/serviceNow'

// The check-in flow: a confirmed/booked patient arrives, is seen, then done.
const COLUMNS = [
  { key: 'waiting', label: 'Waiting', statuses: ['confirmed', 'booked', 'scheduled', 'pending'], next: 'arrived', nextLabel: 'Check in' },
  { key: 'arrived', label: 'Arrived', statuses: ['arrived'], next: 'in-progress', nextLabel: 'Start visit' },
  { key: 'in-progress', label: 'In progress', statuses: ['in-progress'], next: 'completed', nextLabel: 'Complete' },
  { key: 'completed', label: 'Completed', statuses: ['completed'], next: null, nextLabel: '' },
] as const

export function DoctorQueuePage() {
  const { doctor, doctorAppointments, error, isLoading, refetch, today } = useClinicianSchedule()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const todays = useMemo(
    () =>
      doctorAppointments
        .filter((a) => a.date === today && !isCancelledAppointment(a))
        .sort((a, b) => appointmentSortValue(a) - appointmentSortValue(b)),
    [doctorAppointments, today],
  )

  function statusOf(a: BookingAppointment) {
    return (overrides[a.appointment_record_id] ?? a.status).toLowerCase()
  }

  function columnFor(status: string) {
    const col = COLUMNS.find((c) => (c.statuses as readonly string[]).includes(status))
    return col?.key ?? 'waiting'
  }

  async function advance(a: BookingAppointment, next: string) {
    setPendingId(a.appointment_record_id)
    setActionError(null)
    try {
      await updateAppointment({ record_id: a.appointment_record_id, status: next })
      setOverrides((prev) => ({ ...prev, [a.appointment_record_id]: next }))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <DoctorPage
      title="Clinic queue"
      intro={`Today's check-in board for ${doctor?.name || 'this clinician'}. Move each patient through arrival, visit, and completion.`}
    >
      <div className="-mt-3 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-bold text-[#53687b]">
          {isLoading ? (
            <span className="inline-flex items-center gap-2"><LoaderCircle size={16} className="animate-spin" /> Loading queue</span>
          ) : (error || actionError) ? (
            <span className="inline-flex items-center gap-2 text-[#a22828]"><AlertTriangle size={16} /> {error || actionError}</span>
          ) : (
            <span>{todays.length} appointments today</span>
          )}
        </div>
        <button type="button" onClick={refetch} className="inline-flex items-center gap-2 rounded-[9px] border border-[#0397ae] bg-white px-4 py-2 text-sm font-bold text-[#0397ae]">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {todays.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">
          No appointments scheduled today.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
          {COLUMNS.map((col) => {
            const items = todays.filter((a) => columnFor(statusOf(a)) === col.key)
            return (
              <div key={col.key} className="rounded-2xl border border-slate-200 bg-[#f7fbfd] p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-sm font-black uppercase tracking-wide text-[#53687b]">{col.label}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#607487]">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => {
                    const busy = pendingId === a.appointment_record_id
                    return (
                      <div key={a.appointment_record_id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="truncate font-semibold text-slate-900">{a.patient_display || 'Patient'}</div>
                        <div className="mb-2 text-xs text-slate-500">{formatTime(a.start_time)} · {a.reason_category || 'Visit'}</div>
                        {col.next && (
                          <button
                            type="button"
                            onClick={() => void advance(a, col.next as string)}
                            disabled={busy}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#143A57] px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                          >
                            {busy ? <LoaderCircle size={13} className="animate-spin" /> : <ChevronRight size={13} />}
                            {col.nextLabel}
                          </button>
                        )}
                        {col.key === 'completed' && (
                          <div className="inline-flex items-center gap-1 text-xs font-bold text-[#0f6b4f]"><Check size={13} /> Done</div>
                        )}
                        {col.key !== 'waiting' && (
                          <button
                            type="button"
                            onClick={() => void advance(a, 'confirmed')}
                            disabled={busy}
                            className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-60"
                          >
                            <Undo2 size={11} /> Reset to waiting
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {items.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs font-semibold text-slate-400">
                      None
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DoctorPage>
  )
}
