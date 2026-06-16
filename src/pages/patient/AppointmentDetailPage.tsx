import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  FileText,
  Hash,
  LoaderCircle,
  Stethoscope,
  TriangleAlert,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PatientPage } from '../../components/patient/PatientShell'
import { formatDate, formatTime } from '../../lib/scheduling'
import {
  fetchAppointment,
  fetchSummaryNotes,
  type DoctorAppointmentOption,
  type SummaryNote,
} from '../../services/serviceNow'

function statusBadgeClass(status: string) {
  const v = status.toLowerCase()
  if (v === 'cancelled' || v === 'canceled') return 'bg-red-100 text-red-700'
  if (v === 'completed') return 'bg-emerald-100 text-emerald-700'
  if (v === 'confirmed') return 'bg-sky-100 text-[#0f5f8c]'
  if (v === 'arrived' || v === 'in-progress') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

export function PatientAppointmentDetailPage() {
  const { recordId = '' } = useParams()
  const [appointment, setAppointment] = useState<DoctorAppointmentOption | null>(null)
  const [notes, setNotes] = useState<SummaryNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!recordId) return
    setLoading(true)
    setError(null)
    try {
      const [appt, noteRows] = await Promise.all([
        fetchAppointment(recordId),
        fetchSummaryNotes({ appointmentRecordId: recordId }),
      ])
      setAppointment(appt)
      setNotes(noteRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load appointment.')
    } finally {
      setLoading(false)
    }
  }, [recordId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <PatientPage title="Appointment details" intro="Your visit details and your doctor's summary notes.">
      <div className="-mt-3 mb-5">
        <Link to="/patient/appointments" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0f5f8c] hover:underline">
          <ArrowLeft size={15} /> Back to my appointments
        </Link>
      </div>

      {loading ? (
        <div className="inline-flex items-center gap-2 text-sm font-bold text-[#53687b]"><LoaderCircle size={16} className="animate-spin" /> Loading</div>
      ) : error ? (
        <div className="inline-flex items-center gap-2 text-sm font-bold text-[#a22828]"><AlertTriangle size={16} /> {error}</div>
      ) : !appointment ? (
        <div className="text-sm font-bold text-[#53687b]">Appointment not found.</div>
      ) : (
        <>
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                <Stethoscope size={20} className="text-[#0397AE]" />
                {/* doctor name isn't on the option; reason/patient are. Show appointment summary */}
                Appointment {appointment.appointment_id}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {appointment.triage_priority && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${appointment.triage_priority.toLowerCase().includes('urgent') ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    <TriangleAlert size={12} /> {appointment.triage_priority}
                  </span>
                )}
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(appointment.status)}`}>
                  {appointment.status_label || appointment.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 max-[640px]:grid-cols-1">
              <DetailItem icon={<Hash size={15} />} label="Appointment ID">{appointment.appointment_id || '—'}</DetailItem>
              <DetailItem icon={<CalendarClock size={15} />} label="Date & time">
                {appointment.date ? formatDate(appointment.date) : '—'}
                {appointment.start_time ? ` · ${formatTime(appointment.start_time)}` : ''}
              </DetailItem>
              <DetailItem icon={<FileText size={15} />} label="Reason">
                {appointment.reason_category || '—'}
                {appointment.reason_text ? <span className="block text-xs font-normal text-slate-500">{appointment.reason_text}</span> : null}
              </DetailItem>
            </div>
          </div>

          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FileText size={18} /> Visit summary from your doctor
            <span className="text-sm font-bold text-slate-400">({notes.length})</span>
          </h3>

          {notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">
              Your doctor hasn't added a visit summary for this appointment yet.
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <article key={note.sys_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                    <span>{note.doctor_name ? `Dr. ${note.doctor_name}` : 'Your doctor'}</span>
                    <span>{note.created_on}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{note.notes}</p>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </PatientPage>
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
