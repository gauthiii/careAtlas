import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  ClipboardList,
  Clock3,
  FileText,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  UserCheck,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { WeekNav } from '../../components/staff/WeekNav'
import { clinicianDisplayName, useClinicianAuth } from '../../contexts/ClinicianAuthContext'
import { useClinicianSchedule } from '../../hooks/useClinicianSchedule'
import {
  WEEK_LENGTH,
  addDays,
  appointmentReason,
  appointmentSortValue,
  findNextAvailableSlot,
  formatAppointmentDateTime,
  formatDate,
  formatShortDate,
  formatTime,
  getScheduleForDoctor,
  hourTime,
  isCancelledAppointment,
  timeRangeForHour,
} from '../../lib/scheduling'
import type { BookingAppointment } from '../../services/serviceNow'

type StatCardProps = {
  label: string
  value: string
  badge?: string
  badgeColor?: 'success' | 'warning'
  subtitle?: string
}

function StatCard({ label, value, badge, badgeColor, subtitle }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
      {badge && (
        <div
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            badgeColor === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {badge}
        </div>
      )}
      {subtitle && <div className="mt-2 text-sm text-slate-500">{subtitle}</div>}
    </div>
  )
}

function patientInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
  return initials || 'PT'
}

function statusCount(appointments: BookingAppointment[], status: string) {
  return appointments.filter((appointment) => appointment.status.toLowerCase() === status).length
}

export function DoctorDashboardPage() {
  const { user } = useClinicianAuth()
  const { doctor, doctorAppointments, error, isLoading, refetch, today } = useClinicianSchedule()
  const displayName = doctor?.name || clinicianDisplayName(user)
  const [selectedDate, setSelectedDate] = useState(today)
  const todayAppointments = doctorAppointments
    .filter((appointment) => appointment.date === today && !isCancelledAppointment(appointment))
    .sort((a, b) => appointmentSortValue(a) - appointmentSortValue(b))
  const selectedAppointments = doctorAppointments
    .filter((appointment) => appointment.date === selectedDate && !isCancelledAppointment(appointment))
    .sort((a, b) => appointmentSortValue(a) - appointmentSortValue(b))
  const isToday = selectedDate === today
  const upcomingAppointments = doctorAppointments
    .filter((appointment) => appointment.date >= today && !isCancelledAppointment(appointment))
    .sort((a, b) => appointmentSortValue(a) - appointmentSortValue(b))
  const nextAvailableSlot = doctor ? findNextAvailableSlot(doctor, doctorAppointments, today, WEEK_LENGTH) : null
  const schedule = doctor ? getScheduleForDoctor(doctor) : null
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = addDays(today, weekOffset * WEEK_LENGTH)
  const weekDays = Array.from({ length: WEEK_LENGTH }, (_, index) => {
    const date = addDays(weekStart, index)
    return {
      date,
      visits: doctorAppointments.filter((appointment) => appointment.date === date && !isCancelledAppointment(appointment)).length,
    }
  })


  return (
    <DoctorPage
      title="Today's clinical run sheet"
      intro={`${formatDate(today)} · ${displayName} · ${doctor?.speciality || doctor?.department || 'Clinician schedule'}`}
    >
      <div className="-mt-3 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-bold text-[#53687b]">
          {isLoading && (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle size={16} className="animate-spin" />
              Loading live doctor and appointment data
            </span>
          )}
          {!isLoading && error && (
            <span className="inline-flex items-center gap-2 text-[#a22828]">
              <AlertTriangle size={16} />
              {error}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refetch}
            className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#0397AE] bg-white px-[15px] font-bold text-[#0397AE] max-[720px]:w-full"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4 max-[1200px]:grid-cols-2 max-[640px]:grid-cols-1">
        <StatCard
          label="Appointments Today"
          value={`${todayAppointments.length}`}
          badge={`${statusCount(todayAppointments, 'completed')} Completed`}
          badgeColor="success"
        />
        <StatCard label="Upcoming Visits" value={`${upcomingAppointments.length}`} subtitle="In the loaded scheduling window" />
        <StatCard
          label="Clinic Hours"
          value={schedule ? timeRangeForHour(schedule.startHour) : 'Pending'}
          subtitle={schedule ? `${schedule.breakLabel}: ${formatTime(hourTime(schedule.breakHour))}` : 'Waiting for doctor match'}
        />
        <StatCard
          label="Next Available Slot"
          value={nextAvailableSlot ? formatTime(hourTime(nextAvailableSlot.hour)) : 'None'}
          subtitle={nextAvailableSlot ? formatShortDate(nextAvailableSlot.date) : 'No open slot in next 7 days'}
          badge={doctor ? 'From appointment table conflicts' : undefined}
          badgeColor="success"
        />
      </div>

      <div className="mb-6 grid grid-cols-[1.5fr_1fr] gap-4 max-[1200px]:grid-cols-1">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Clock3 size={18} />
              {isToday ? "Today's Appointments" : `Appointments · ${formatDate(selectedDate)}`}
            </h3>
            <div className="flex items-center gap-2">
              {!isToday && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(today)
                    setWeekOffset(0)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#b7ceda] bg-white px-3 py-2 text-sm font-semibold text-[#0f5f8c] hover:bg-[#f5f9fb]"
                >
                  <RotateCcw size={14} />
                  Back to today
                </button>
              )}
              <Link to="/staff/availability" className="rounded-lg bg-[#143A57] px-3 py-2 text-sm font-semibold !text-white">
                View Availability
              </Link>
            </div>
          </div>

          {selectedAppointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
              {isToday
                ? 'No appointments are scheduled for this doctor today.'
                : `No appointments scheduled on ${formatDate(selectedDate)}.`}
            </div>
          ) : (
            <div className="space-y-3">
              {selectedAppointments.map((appointment) => (
                <Link
                  key={appointment.appointment_record_id || appointment.appointment_id}
                  to={`/staff/patient/${encodeURIComponent(appointment.patient_display || 'search')}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 !text-inherit hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7f3f8] text-md font-bold text-[#0397AE]">
                    {patientInitials(appointment.patient_display)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{appointment.patient_display || 'Patient unavailable'}</p>
                    <p className="truncate text-xs text-slate-500">{appointmentReason(appointment)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatTime(appointment.start_time)}</p>
                    <p className="text-xs text-emerald-700">{appointment.status_label || appointment.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <CalendarCheck size={18} />
                7-Day Schedule
              </h3>
              <WeekNav weekOffset={weekOffset} onChange={setWeekOffset} weekStart={weekStart} />
            </div>
            <div className="grid grid-cols-7 gap-2 max-[700px]:grid-cols-2">
              {weekDays.map((item) => {
                const isSelected = item.date === selectedDate
                const isCurrentDay = item.date === today
                return (
                  <button
                    type="button"
                    key={item.date}
                    onClick={() => setSelectedDate(item.date)}
                    title={`Show appointments for ${formatDate(item.date)}`}
                    className={`rounded-xl border p-2 text-center transition${
                      isSelected
                        ? 'border-[#143A57] bg-[#143A57] text-white shadow-sm'
                        : isCurrentDay
                          ? 'border-[#0397AE] bg-[#e7f3f8] shadow-[inset_0_0_0_1px_#0397AE]'
                          : 'border-slate-200'
                    }`}
                  >
                    <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                      {formatDate(item.date).split(',')[0]}
                    </div>
                    <div className="text-xl font-bold">{formatShortDate(item.date).split(' ')[1]}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                      {item.visits} visits
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <UserCheck size={18} />
                Doctor Profile
              </h3>
              <Link to="/staff/profile" className="rounded-lg bg-[#143A57] px-3 py-2 text-sm font-semibold !text-white">
                Open
              </Link>
            </div>
            <div className="space-y-3 text-sm">
              <ProfileLine label="Doctor" value={doctor?.name || 'No matched doctor'} />
              <ProfileLine label="Department" value={doctor?.department || 'Not provided'} />
              <ProfileLine label="Speciality" value={doctor?.speciality || 'General'} />
              <ProfileLine label="Email" value={doctor?.email || user?.attributes.email || 'Not provided'} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-4 max-[1200px]:grid-cols-1">
        <div className="space-y-3">
          <ClinicalAlert
            tone="warning"
            title="Schedule review"
            body={
              upcomingAppointments[0]
                ? `${upcomingAppointments[0].patient_display || 'A patient'} is next on ${formatAppointmentDateTime(upcomingAppointments[0].date, upcomingAppointments[0].start_time)}.`
                : 'No upcoming appointment needs review in the loaded window.'
            }
            to="/staff/patient/search"
          />
          <ClinicalAlert
            tone="danger"
            title="Schedule coverage"
            body="Open times and booked visits are aligned with the clinic calendar for this doctor."
            to="/staff/availability"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ClipboardList size={18} />
            Pending Tasks
          </h3>
          <div className="space-y-3">
            {upcomingAppointments.slice(0, 4).map((appointment) => (
              <Link
                key={appointment.appointment_record_id || appointment.appointment_id}
                to={`/staff/patient/${encodeURIComponent(appointment.patient_display || 'search')}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#d7e5ec] p-3 !text-inherit hover:bg-slate-50"
              >
                <span className="min-w-0 truncate">
                  Review {appointment.patient_display || 'patient'} visit
                </span>
                <ArrowUpRight size={18} className="shrink-0" />
              </Link>
            ))}
            {upcomingAppointments.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#d7e5ec] p-3 text-sm font-bold text-slate-500">
                No appointment-driven tasks.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <FileText size={18} />
            Summary Notes
          </h3>
          <p className="text-sm text-slate-600">
            Log clinical summary notes against a specific appointment so the patient, date and time
            stay linked.
          </p>
          <Link
            to="/staff/notes"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#143A57] px-4 py-2 text-sm font-semibold !text-white"
          >
            <FileText size={15} />
            Open My Notes
          </Link>
          <div className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{upcomingAppointments[0]?.patient_display || 'No patient selected'}</span>
            {' '}schedule context is loaded from ServiceNow appointments.
          </div>
        </div>
      </div>
    </DoctorPage>
  )
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-2">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="min-w-0 truncate font-semibold text-slate-900">{value}</span>
    </div>
  )
}

function ClinicalAlert({
  body,
  title,
  tone,
  to,
}: {
  body: string
  title: string
  tone: 'warning' | 'danger'
  to: string
}) {
  const classes =
    tone === 'warning'
      ? 'border-amber-300 bg-amber-50 text-amber-800'
      : 'border-red-300 bg-red-50 text-red-800'

  return (
    <div className={`rounded-xl border p-4 ${classes}`}>
      <div className="flex gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="mt-1 text-sm text-slate-600">{body}</p>
          <Link to={to} className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold !text-slate-800">
            Open
          </Link>
        </div>
      </div>
    </div>
  )
}
