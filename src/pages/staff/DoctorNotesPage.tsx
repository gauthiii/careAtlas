import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  User,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { clinicianDisplayName, useClinicianAuth } from '../../contexts/ClinicianAuthContext'
import { useClinicianSchedule } from '../../hooks/useClinicianSchedule'
import { formatDate, formatTime } from '../../lib/scheduling'
import {
  createSummaryNote,
  fetchDoctorAppointmentOptions,
  fetchSummaryNotes,
  type DoctorAppointmentOption,
  type SummaryNote,
} from '../../services/serviceNow'

function appointmentLabel(option: DoctorAppointmentOption) {
  const date = option.date ? formatDate(option.date) : 'Unknown date'
  const time = option.start_time ? formatTime(option.start_time) : '--:--'
  const patient = option.patient_name || 'Unknown patient'
  return `${date} · ${patient} · ${time}`
}

export function DoctorNotesPage() {
  const { user } = useClinicianAuth()
  const { doctor, error: scheduleError, isLoading: scheduleLoading } = useClinicianSchedule()
  const doctorName = doctor?.name || clinicianDisplayName(user)
  const doctorSysId = doctor?.doctor_record_id ?? ''
  const loggedBy = doctor?.email || user?.attributes.email || ''

  const [notes, setNotes] = useState<SummaryNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [isModalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((n) =>
      [n.patient_name, n.appointment_id, n.notes, n.date, n.logged_by].some((v) =>
        (v || '').toLowerCase().includes(q),
      ),
    )
  }, [notes, query])

  const loadNotes = useCallback(async () => {
    if (!doctorSysId) return
    setNotesLoading(true)
    setNotesError(null)
    try {
      setNotes(await fetchSummaryNotes({ doctorSysId }))
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : 'Unable to load notes.')
    } finally {
      setNotesLoading(false)
    }
  }, [doctorSysId])

  useEffect(() => {
    void loadNotes()
  }, [loadNotes])

  const isBusy = scheduleLoading || notesLoading

  return (
    <DoctorPage
      title="My Notes"
      intro={`Summary notes logged by ${doctorName}. Link a note to one of your appointments to keep patient, date and time consistent.`}
    >
      <div className="-mt-3 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-bold text-[#53687b]">
          {isBusy && (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle size={16} className="animate-spin" />
              Loading notes
            </span>
          )}
          {!isBusy && (scheduleError || notesError) && (
            <span className="inline-flex items-center gap-2 text-[#a22828]">
              <AlertTriangle size={16} />
              {scheduleError || notesError}
            </span>
          )}
          {!isBusy && !scheduleError && !notesError && (
            <span>
              {query.trim() ? `${filteredNotes.length} of ${notes.length}` : notes.length}{' '}
              {notes.length === 1 ? 'note' : 'notes'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadNotes()}
            disabled={!doctorSysId}
            className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-bold text-[#0f5f8c] disabled:cursor-not-allowed disabled:opacity-60 max-[720px]:w-full"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={!doctorSysId}
            className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-[#143A57] px-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 max-[720px]:w-full"
          >
            <Plus size={16} />
            Add note
          </button>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="relative mb-4 max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes by patient, ID, text, date…"
            className="w-full rounded-[9px] border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
      )}

      {notes.length === 0 && !isBusy ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <FileText size={32} className="mx-auto mb-3 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-700">No notes yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            You haven&apos;t logged any summary notes. Use <strong>Add note</strong> to record one
            against an appointment.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={!doctorSysId}
            className="mt-5 inline-flex items-center gap-2 rounded-[9px] bg-[#143A57] px-4 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            Add note
          </button>
        </div>
      ) : filteredNotes.length === 0 && !isBusy ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">
          No notes match your search.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
          {filteredNotes.map((note) => (
            <article
              key={note.sys_id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <User size={16} className="text-[#0397AE]" />
                  {note.patient_name || 'Unknown patient'}
                </div>
                <span className="rounded-full bg-[#e7f3f8] px-2.5 py-1 text-[11px] font-bold text-[#0f5f8c]">
                  {note.appointment_id || 'No appointment'}
                </span>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock size={13} />
                  {note.date ? formatDate(note.date) : '—'}
                  {note.start_time ? ` · ${formatTime(note.start_time)}` : ''}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {note.notes}
              </p>
              <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-400">
                {note.logged_by ? `Logged by ${note.logged_by}` : 'Logged note'}
                {note.created_on ? ` · ${note.created_on}` : ''}
              </div>
            </article>
          ))}
        </div>
      )}

      {isModalOpen && (
        <AddNoteModal
          doctorName={doctorName}
          doctorSysId={doctorSysId}
          loggedBy={loggedBy}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            void loadNotes()
          }}
        />
      )}
    </DoctorPage>
  )
}

function AddNoteModal({
  doctorName,
  doctorSysId,
  loggedBy,
  onClose,
  onSaved,
}: {
  doctorName: string
  doctorSysId: string
  loggedBy: string
  onClose: () => void
  onSaved: () => void
}) {
  const [options, setOptions] = useState<DoctorAppointmentOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [appointmentId, setAppointmentId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setOptionsLoading(true)
      setLoadError(null)
      try {
        const result = await fetchDoctorAppointmentOptions(doctorSysId)
        if (active) setOptions(result)
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : 'Unable to load appointments.')
      } finally {
        if (active) setOptionsLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [doctorSysId])

  const selected = useMemo(
    () => options.find((option) => option.appointment_record_id === appointmentId) ?? null,
    [options, appointmentId],
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!selected || !notes.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      await createSummaryNote({
        appointment_record_id: selected.appointment_record_id,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ClipboardList size={18} className="text-[#0397AE]" />
            Add summary note
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <Field label="Appointment" required>
            {optionsLoading ? (
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <LoaderCircle size={15} className="animate-spin" />
                Loading appointments
              </div>
            ) : loadError ? (
              <div className="text-sm font-semibold text-[#a22828]">{loadError}</div>
            ) : options.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No appointments found for this doctor.
              </div>
            ) : (
              <select
                value={appointmentId}
                onChange={(event) => setAppointmentId(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
              >
                <option value="" disabled>
                  Select an appointment…
                </option>
                {options.map((option) => (
                  <option key={option.appointment_record_id} value={option.appointment_record_id}>
                    {appointmentLabel(option)}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Doctor">
            <ReadOnlyValue icon={<Stethoscope size={15} />}>{doctorName}</ReadOnlyValue>
          </Field>

          <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
            <Field label="Patient">
              <ReadOnlyValue icon={<User size={15} />}>
                {selected?.patient_name || '—'}
              </ReadOnlyValue>
            </Field>
            <Field label="Date">
              <ReadOnlyValue icon={<CalendarClock size={15} />}>
                {selected?.date ? formatDate(selected.date) : '—'}
              </ReadOnlyValue>
            </Field>
          </div>

          <Field label="Time">
            <ReadOnlyValue icon={<CalendarClock size={15} />}>
              {selected?.start_time ? formatTime(selected.start_time) : '—'}
            </ReadOnlyValue>
          </Field>

          <Field label="Notes" required>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              required
              rows={5}
              placeholder="Summary of the consultation, findings, follow-up…"
              className="w-full rounded-lg border border-slate-300 p-3 text-sm"
            />
          </Field>

          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-[#a22828]">
              {saveError}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[9px] border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selected || !notes.trim()}
              className="inline-flex items-center gap-2 rounded-[9px] bg-[#143A57] px-4 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
              {saving ? 'Saving…' : 'Add note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
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
