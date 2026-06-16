import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  User,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { clinicianDisplayName, useClinicianAuth } from '../../contexts/ClinicianAuthContext'
import { useClinicianSchedule } from '../../hooks/useClinicianSchedule'
import { formatDate, formatTime } from '../../lib/scheduling'
import {
  fetchDoctorAppointmentOptions,
  type DoctorAppointmentOption,
} from '../../services/serviceNow'

function statusBadgeClass(status: string) {
  const value = status.toLowerCase()
  if (value === 'cancelled' || value === 'canceled') return 'bg-red-100 text-red-700'
  if (value === 'completed') return 'bg-emerald-100 text-emerald-700'
  if (value === 'confirmed') return 'bg-sky-100 text-[#0f5f8c]'
  return 'bg-slate-100 text-slate-600'
}

export function DoctorAppointmentsPage() {
  const { user } = useClinicianAuth()
  const { doctor, error: scheduleError, isLoading: scheduleLoading } = useClinicianSchedule()
  const doctorName = doctor?.name || clinicianDisplayName(user)
  const doctorSysId = doctor?.doctor_record_id ?? ''

  const [appointments, setAppointments] = useState<DoctorAppointmentOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAppointments = useCallback(async () => {
    if (!doctorSysId) return
    setLoading(true)
    setError(null)
    try {
      setAppointments(await fetchDoctorAppointmentOptions(doctorSysId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load appointments.')
    } finally {
      setLoading(false)
    }
  }, [doctorSysId])

  useEffect(() => {
    void loadAppointments()
  }, [loadAppointments])

  const isBusy = scheduleLoading || loading

  return (
    <DoctorPage
      title="Appointments"
      intro={`All appointments for ${doctorName}. Open one to view its details and summary notes.`}
    >
      <div className="-mt-3 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-bold text-[#53687b]">
          {isBusy && (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle size={16} className="animate-spin" />
              Loading appointments
            </span>
          )}
          {!isBusy && (scheduleError || error) && (
            <span className="inline-flex items-center gap-2 text-[#a22828]">
              <AlertTriangle size={16} />
              {scheduleError || error}
            </span>
          )}
          {!isBusy && !scheduleError && !error && (
            <span>
              {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void loadAppointments()}
          disabled={!doctorSysId}
          className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-bold text-[#0f5f8c] disabled:cursor-not-allowed disabled:opacity-60 max-[720px]:w-full"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {appointments.length === 0 && !isBusy ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <CalendarClock size={32} className="mx-auto mb-3 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-700">No appointments</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            There are no appointments on record for this doctor.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {appointments.map((appointment, index) => (
            <Link
              key={appointment.appointment_record_id}
              to={`/staff/appointments/${encodeURIComponent(appointment.appointment_record_id)}`}
              className={`flex items-center gap-4 px-5 py-4 !text-inherit hover:bg-slate-50 ${
                index > 0 ? 'border-t border-slate-100' : ''
              }`}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#e7f3f8] text-[#0397AE]">
                <User size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {appointment.patient_name || 'Unknown patient'}
                </p>
                <p className="truncate text-xs font-semibold text-slate-500">
                  {appointment.appointment_id || 'No appointment ID'}
                </p>
              </div>
              <div className="hidden text-right text-sm sm:block">
                <p className="font-semibold text-slate-900">
                  {appointment.date ? formatDate(appointment.date) : '—'}
                </p>
                <p className="text-xs text-slate-500">
                  {appointment.start_time ? formatTime(appointment.start_time) : '--:--'}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadgeClass(
                  appointment.status,
                )}`}
              >
                {appointment.status_label || appointment.status || 'Unknown'}
              </span>
              <ChevronRight size={18} className="flex-shrink-0 text-slate-400" />
            </Link>
          ))}
        </div>
      )}
    </DoctorPage>
  )
}
