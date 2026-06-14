import { AlertTriangle, CalendarDays, LoaderCircle, Mail, RefreshCw, Stethoscope, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { useClinicianSchedule } from '../../hooks/useClinicianSchedule'
import {
  appointmentReason,
  appointmentSortValue,
  formatAppointmentDateTime,
  getScheduleForDoctor,
  hourTime,
  isCancelledAppointment,
  timeRangeForHour,
} from '../../lib/scheduling'

export function DoctorProfilePage() {
  const { doctor, doctorAppointments, error, isLoading, refetch, today, user } = useClinicianSchedule()
  const schedule = doctor ? getScheduleForDoctor(doctor) : null
  const upcomingAppointments = doctorAppointments
    .filter((appointment) => appointment.date >= today && !isCancelledAppointment(appointment))
    .sort((a, b) => appointmentSortValue(a) - appointmentSortValue(b))

  return (
    <DoctorPage
      title="Doctor profile"
      intro="Clinician identity and schedule context matched from the ServiceNow doctor and appointment tables."
    >
      <div className="-mt-3 mb-4 flex justify-end">
        <button
          type="button"
          onClick={refetch}
          className="inline-flex items-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-4 py-2 text-sm font-bold text-[#0f5f8c] hover:bg-[#f5f9fb]"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#d7e5ec] bg-[#f7fbfd] p-3 text-sm font-bold text-[#53687b]">
          <LoaderCircle size={17} className="animate-spin" />
          Loading doctor profile
        </div>
      )}
      {!isLoading && error && (
        <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-[#f6c6c4] bg-[#fff4f3] p-3 text-[0.86rem] font-bold text-[#a22828]">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)] gap-4 max-[1000px]:grid-cols-1">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <UserRound size={18} />
            Matched doctor record
          </h3>
          <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
            <ProfileField label="Doctor ID" value={doctor?.doctor_id || 'Not matched'} />
            <ProfileField label="ServiceNow sys_id" value={doctor?.doctor_record_id || 'Not matched'} />
            <ProfileField label="Name" value={doctor?.name || user?.attributes.name || user?.username || 'Clinician'} />
            <ProfileField label="Email" value={doctor?.email || user?.attributes.email || 'Not provided'} icon={<Mail size={15} />} />
            <ProfileField label="Department" value={doctor?.department || 'Not provided'} />
            <ProfileField label="Speciality" value={doctor?.speciality || 'General'} icon={<Stethoscope size={15} />} />
            <ProfileField label="Status" value={doctor?.active ? 'Active' : doctor ? 'Inactive' : 'Pending match'} />
            <ProfileField
              label="Calendar rule"
              value={schedule ? `${timeRangeForHour(schedule.startHour)} · ${schedule.breakLabel} ${hourTime(schedule.breakHour)}` : 'Pending'}
              icon={<CalendarDays size={15} />}
            />
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <CalendarDays size={18} />
            Schedule summary
          </h3>
          <div className="grid gap-3 text-sm">
            <SummaryLine label="Loaded appointments" value={`${doctorAppointments.length}`} />
            <SummaryLine label="Upcoming appointments" value={`${upcomingAppointments.length}`} />
            <SummaryLine label="Schedule basis" value="Clinic hours and booked visits" />
            <SummaryLine label="Profile source" value="ServiceNow doctor record" />
          </div>
        </aside>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <CalendarDays size={18} />
          Upcoming appointments
        </h3>
        {upcomingAppointments.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-4 text-center text-sm font-bold text-[#53687b]">
            No upcoming appointments were found for this doctor.
          </div>
        ) : (
          <div className="grid gap-3">
            {upcomingAppointments.slice(0, 8).map((appointment) => (
              <div
                key={appointment.appointment_record_id || appointment.appointment_id}
                className="grid grid-cols-[1fr_auto] gap-3 rounded-[10px] border border-[#d7e5ec] bg-white p-4 max-[720px]:grid-cols-1"
              >
                <div className="min-w-0">
                  <strong>{formatAppointmentDateTime(appointment.date, appointment.start_time)}</strong>
                  <div className="mt-1 text-sm font-bold text-[#143A57]">
                    {appointment.patient_display || 'Patient unavailable'}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#53687b]">{appointmentReason(appointment)}</div>
                </div>
                <span className="h-max rounded-[8px] bg-[#e7f3f8] px-2.5 py-1 text-[0.72rem] font-black text-[#143A57]">
                  {appointment.status_label || appointment.status || 'Scheduled'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </DoctorPage>
  )
}

function ProfileField({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="grid gap-[5px] rounded-[10px] border border-[#e5eef3] bg-white p-3">
      <span className="flex items-center gap-1.5 text-[0.74rem] font-black uppercase tracking-[0.06em] text-[#607487]">
        {icon}
        {label}
      </span>
      <strong className="[overflow-wrap:anywhere] text-[#102033]">{value}</strong>
    </div>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[10px] border border-[#e5eef3] bg-[#f7fbfd] p-3">
      <span className="font-bold text-[#607487]">{label}</span>
      <strong className="text-right text-[#102033]">{value}</strong>
    </div>
  )
}
