import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  FileText,
  Hash,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Stethoscope,
  Trash2,
  TriangleAlert,
  User,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { clinicianDisplayName, useClinicianAuth } from '../../contexts/ClinicianAuthContext'
import { useClinicianSchedule } from '../../hooks/useClinicianSchedule'
import { formatDate, formatTime } from '../../lib/scheduling'
import {
  createSummaryNote,
  deleteSummaryNote,
  fetchAppointment,
  fetchSummaryNotes,
  updateAppointment,
  updateSummaryNote,
  type DoctorAppointmentOption,
  type SummaryNote,
} from '../../services/serviceNow'

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no-show', label: 'No-show' },
]

function statusBadgeClass(status: string) {
  const value = status.toLowerCase()
  if (value === 'cancelled' || value === 'canceled') return 'bg-red-100 text-red-700'
  if (value === 'completed') return 'bg-emerald-100 text-emerald-700'
  if (value === 'confirmed') return 'bg-sky-100 text-[#0f5f8c]'
  if (value === 'arrived' || value === 'in-progress') return 'bg-amber-100 text-amber-700'
  if (value === 'no-show') return 'bg-slate-200 text-slate-600'
  return 'bg-slate-100 text-slate-600'
}

function triageClass(triage: string) {
  return triage.toLowerCase().includes('urgent')
    ? 'bg-red-100 text-red-700'
    : 'bg-slate-100 text-slate-600'
}

export function AppointmentDetailPage() {
  const { recordId = '' } = useParams()
  const { user } = useClinicianAuth()
  const { doctor } = useClinicianSchedule()
  const doctorName = doctor?.name || clinicianDisplayName(user)
  const loggedBy = doctor?.email || user?.attributes.email || ''

  const [appointment, setAppointment] = useState<DoctorAppointmentOption | null>(null)
  const [notes, setNotes] = useState<SummaryNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savingStatus, setSavingStatus] = useState(false)
  const [isAddOpen, setAddOpen] = useState(false)
  const [isRescheduleOpen, setRescheduleOpen] = useState(false)

  const loadNotes = useCallback(async () => {
    if (!recordId) return
    setNotes(await fetchSummaryNotes({ appointmentRecordId: recordId }))
  }, [recordId])

  const loadAll = useCallback(async () => {
    if (!recordId) return
    setLoading(true)
    setError(null)
    try {
      const [appt] = await Promise.all([fetchAppointment(recordId), loadNotes()])
      setAppointment(appt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load appointment.')
    } finally {
      setLoading(false)
    }
  }, [recordId, loadNotes])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  async function handleStatusChange(status: string) {
    if (!appointment) return
    setSavingStatus(true)
    setActionError(null)
    try {
      const updated = await updateAppointment({ record_id: appointment.appointment_record_id, status })
      setAppointment(updated)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update status.')
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <DoctorPage title="Appointment details" intro="Appointment record and its summary notes.">
      <div className="-mt-3 mb-5">
        <Link
          to="/staff/appointments"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0f5f8c] hover:underline"
        >
          <ArrowLeft size={15} />
          Back to appointments
        </Link>
      </div>

      {loading ? (
        <div className="inline-flex items-center gap-2 text-sm font-bold text-[#53687b]">
          <LoaderCircle size={16} className="animate-spin" />
          Loading appointment
        </div>
      ) : error ? (
        <div className="inline-flex items-center gap-2 text-sm font-bold text-[#a22828]">
          <AlertTriangle size={16} />
          {error}
        </div>
      ) : !appointment ? (
        <div className="text-sm font-bold text-[#53687b]">Appointment not found.</div>
      ) : (
        <>
          {/* Appointment summary card */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                <User size={20} className="text-[#0397AE]" />
                {appointment.patient_name || 'Unknown patient'}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {appointment.triage_priority && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${triageClass(appointment.triage_priority)}`}>
                    <TriangleAlert size={12} />
                    {appointment.triage_priority}
                  </span>
                )}
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(appointment.status)}`}>
                  {appointment.status_label || appointment.status || 'Unknown'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 max-[640px]:grid-cols-1">
              <DetailItem icon={<Hash size={15} />} label="Appointment ID">
                {appointment.appointment_id || '—'}
              </DetailItem>
              <DetailItem icon={<CalendarClock size={15} />} label="Date & time">
                {appointment.date ? formatDate(appointment.date) : '—'}
                {appointment.start_time ? ` · ${formatTime(appointment.start_time)}` : ''}
              </DetailItem>
              <DetailItem icon={<Stethoscope size={15} />} label="Doctor">
                {doctorName}
              </DetailItem>
              <DetailItem icon={<ClipboardList size={15} />} label="Reason">
                {appointment.reason_category || '—'}
                {appointment.reason_text ? (
                  <span className="block text-xs font-normal text-slate-500">{appointment.reason_text}</span>
                ) : null}
              </DetailItem>
            </div>

            {/* Status + reschedule controls */}
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                Status
                <select
                  value={STATUS_OPTIONS.some((o) => o.value === appointment.status) ? appointment.status : ''}
                  disabled={savingStatus}
                  onChange={(e) => void handleStatusChange(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white p-2 text-sm font-semibold disabled:opacity-60"
                >
                  {!STATUS_OPTIONS.some((o) => o.value === appointment.status) && (
                    <option value="">{appointment.status_label || 'Set status…'}</option>
                  )}
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {savingStatus && <LoaderCircle size={14} className="animate-spin text-slate-400" />}
              </label>
              <button
                type="button"
                onClick={() => setRescheduleOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#b7ceda] bg-white px-3 py-2 text-sm font-semibold text-[#0f5f8c] hover:bg-[#f5f9fb]"
              >
                <CalendarClock size={14} />
                Reschedule
              </button>
              {actionError && (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#a22828]">
                  <AlertTriangle size={14} /> {actionError}
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <FileText size={18} />
              Summary notes
              <span className="text-sm font-bold text-slate-400">({notes.length})</span>
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadNotes()}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-[9px] border border-[#0397AE] bg-white px-[15px] font-bold text-[#0397AE]"
              >
                <RefreshCw size={15} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-[9px] bg-[#143A57] px-[15px] font-bold text-white"
              >
                <Plus size={16} />
                Add note
              </button>
            </div>
          </div>

          {notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <FileText size={32} className="mx-auto mb-3 text-slate-400" />
              <h4 className="text-base font-semibold text-slate-700">No notes for this appointment</h4>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Use <strong>Add note</strong> to log a summary note against this appointment.
              </p>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-[9px] bg-[#143A57] px-4 py-2.5 font-bold text-white"
              >
                <Plus size={16} />
                Add note
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <NoteCard key={note.sys_id} note={note} onChanged={loadNotes} />
              ))}
            </div>
          )}

          {isAddOpen && (
            <AddNoteModal
              appointment={appointment}
              doctorName={doctorName}
              loggedBy={loggedBy}
              onClose={() => setAddOpen(false)}
              onSaved={() => {
                setAddOpen(false)
                void loadNotes()
              }}
            />
          )}

          {isRescheduleOpen && (
            <RescheduleModal
              appointment={appointment}
              onClose={() => setRescheduleOpen(false)}
              onSaved={(updated) => {
                setRescheduleOpen(false)
                setAppointment(updated)
              }}
            />
          )}
        </>
      )}
    </DoctorPage>
  )
}

function NoteCard({ note, onChanged }: { note: SummaryNote; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.notes)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!text.trim()) return
    setBusy(true)
    setErr(null)
    try {
      await updateSummaryNote(note.sys_id, text.trim())
      setEditing(false)
      await onChanged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to save.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    setBusy(true)
    setErr(null)
    try {
      await deleteSummaryNote(note.sys_id)
      await onChanged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to delete.')
      setBusy(false)
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#e7f3f8] px-2.5 py-1 text-[11px] font-bold text-[#0f5f8c]">
          {note.summary_note_id || 'Note'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">
            {note.logged_by ? `Logged by ${note.logged_by}` : 'Logged note'}
            {note.created_on ? ` · ${note.created_on}` : ''}
          </span>
          {!editing && (
            <>
              <button type="button" onClick={() => setEditing(true)} title="Edit" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-[#0f5f8c]">
                <Pencil size={14} />
              </button>
              <button type="button" onClick={() => void remove()} disabled={busy} title="Delete" className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
      {editing ? (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setText(note.notes) }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700">
              Cancel
            </button>
            <button type="button" onClick={() => void save()} disabled={busy || !text.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#143A57] px-3 py-1.5 text-sm font-bold text-white disabled:opacity-60">
              {busy ? <LoaderCircle size={14} className="animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{note.notes}</p>
      )}
      {err && <div className="mt-2 text-sm font-semibold text-[#a22828]">{err}</div>}
    </article>
  )
}

function RescheduleModal({
  appointment,
  onClose,
  onSaved,
}: {
  appointment: DoctorAppointmentOption
  onClose: () => void
  onSaved: (updated: DoctorAppointmentOption) => void
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
      const updated = await updateAppointment({
        record_id: appointment.appointment_record_id,
        date,
        start_time: `${time}:00`,
      })
      onSaved(updated)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Unable to reschedule.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell title="Reschedule appointment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 px-6 py-5">
        <Field label="Date" required>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full rounded-lg border border-slate-300 p-2.5 text-sm" />
        </Field>
        <Field label="Time" required>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="w-full rounded-lg border border-slate-300 p-2.5 text-sm" />
        </Field>
        {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-[#a22828]">{err}</div>}
        <ModalActions busy={busy} onClose={onClose} submitLabel="Save changes" />
      </form>
    </ModalShell>
  )
}

function AddNoteModal({
  appointment,
  doctorName,
  loggedBy,
  onClose,
  onSaved,
}: {
  appointment: DoctorAppointmentOption
  doctorName: string
  loggedBy: string
  onClose: () => void
  onSaved: () => void
}) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!notes.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      await createSummaryNote({
        appointment_record_id: appointment.appointment_record_id,
        notes: notes.trim(),
        logged_by: loggedBy || undefined,
      })
      onSaved()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Add summary note" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
        <Field label="Appointment">
          <ReadOnlyValue icon={<Hash size={15} />}>
            {appointment.appointment_id || appointment.appointment_record_id}
          </ReadOnlyValue>
        </Field>
        <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
          <Field label="Patient">
            <ReadOnlyValue icon={<User size={15} />}>{appointment.patient_name || '—'}</ReadOnlyValue>
          </Field>
          <Field label="Doctor">
            <ReadOnlyValue icon={<Stethoscope size={15} />}>{doctorName}</ReadOnlyValue>
          </Field>
        </div>
        <Field label="Notes" required>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            required
            rows={5}
            placeholder="Summary of the consultation, findings, follow-up…"
            className="w-full rounded-lg border border-slate-300 p-3 text-sm"
            autoFocus
          />
        </Field>
        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-[#a22828]">
            {saveError}
          </div>
        )}
        <ModalActions busy={saving} onClose={onClose} submitLabel="Add note" />
      </form>
    </ModalShell>
  )
}

// --- Shared small UI -------------------------------------------------------

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ClipboardList size={18} className="text-[#0397AE]" />
            {title}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalActions({ busy, onClose, submitLabel }: { busy: boolean; onClose: () => void; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button type="button" onClick={onClose} className="rounded-[9px] border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700">
        Cancel
      </button>
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-[9px] bg-[#143A57] px-4 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
        {busy ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}

function DetailItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <div className="font-semibold text-slate-900">{children}</div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-[#a22828]">*</span>}
      </span>
      {children}
    </label>
  )
}

function ReadOnlyValue({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-semibold text-slate-700">
      <span className="text-slate-400">{icon}</span>
      {children}
    </div>
  )
}
