import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { useClinicianSchedule } from '../../hooks/useClinicianSchedule'
import { cn } from '../../lib/cn'
import {
  CALENDAR_HOURS,
  WEEK_LENGTH,
  activeAppointmentsForDoctor,
  addDays,
  appointmentForCell,
  appointmentReason,
  formatDate,
  formatShortDate,
  formatTime,
  getScheduleForDoctor,
  hourTime,
  isBookableHour,
  isSpecialAppointment,
  timeRangeForHour,
} from '../../lib/scheduling'
import type { BookingAppointment, BookingDoctor } from '../../services/serviceNow'

export function AvailabilityPage() {
  const { appointments, doctor, error, isLoading, refetch, today } = useClinicianSchedule()
  const days = Array.from({ length: WEEK_LENGTH }, (_, index) => addDays(today, index))
  const schedule = doctor ? getScheduleForDoctor(doctor) : null
  const activeDoctorAppointments = doctor ? activeAppointmentsForDoctor(appointments, doctor) : []

  return (
    <DoctorPage
      title="Scheduling availability"
      intro="Review this clinician's weekly schedule, open time, and booked appointments."
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

      <div className="mb-5 grid grid-cols-4 gap-3 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">
        <AvailabilityMetric label="Doctor" value={doctor?.name || 'No matched doctor'} />
        <AvailabilityMetric label="Speciality" value={doctor?.speciality || doctor?.department || 'General'} />
        <AvailabilityMetric
          label="Calendar rule"
          value={schedule ? `${timeRangeForHour(schedule.startHour)} · ${schedule.breakLabel} ${formatTime(hourTime(schedule.breakHour))}` : 'Pending'}
        />
        <AvailabilityMetric label="Loaded bookings" value={`${activeDoctorAppointments.length}`} />
      </div>

      {isLoading && (
        <div className="mb-4 flex min-h-[120px] items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] font-bold text-[#53687b]">
          <LoaderCircle size={18} className="animate-spin" />
          Loading doctor appointments
        </div>
      )}

      {!isLoading && error && (
        <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-[#f6c6c4] bg-[#fff4f3] p-3 text-[0.86rem] font-bold text-[#a22828]">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 text-[0.74rem] font-black text-[#53687b]">
        <span className="rounded-full border border-[#a7dfbf] bg-[#e4f7eb] px-3 py-1 text-[#0f6b4f]">Available</span>
        <span className="rounded-full border border-[#f4d16f] bg-[#fff6cc] px-3 py-1 text-[#805b00]">Break</span>
        <span className="rounded-full border border-[#f3a19c] bg-[#feeceb] px-3 py-1 text-[#a22828]">Booked</span>
        <span className="rounded-full border border-[#f0b56a] bg-[#fff0db] px-3 py-1 text-[#9a4f00]">Special appointment</span>
        <span className="rounded-full border border-[#d7e0e7] bg-[#eef2f5] px-3 py-1 text-[#74889a]">Unavailable</span>
      </div>

      {doctor ? (
        <DoctorAvailabilityGrid appointments={activeDoctorAppointments} days={days} doctor={doctor} />
      ) : (
        <div className="rounded-[12px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-6 text-center font-bold text-[#53687b]">
          No active ServiceNow doctor record matched this clinician.
        </div>
      )}
    </DoctorPage>
  )
}

function AvailabilityMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[#d7e5ec] bg-white p-4 shadow-sm">
      <div className="text-[0.72rem] font-black uppercase tracking-wide text-[#607487]">{label}</div>
      <div className="mt-1 truncate text-[1rem] font-black text-[#102033]">{value}</div>
    </div>
  )
}

function DoctorAvailabilityGrid({
  appointments,
  days,
  doctor,
}: {
  appointments: BookingAppointment[]
  days: string[]
  doctor: BookingDoctor
}) {
  const schedule = getScheduleForDoctor(doctor)

  return (
    <div className="overflow-x-auto rounded-[12px] border border-[#d7e5ec] bg-white">
      <div className="grid min-w-[1180px] grid-cols-[92px_repeat(7,minmax(148px,1fr))]">
        <div className="border-b border-r border-[#d7e5ec] bg-[#f7fbfd] p-3 text-[0.72rem] font-black uppercase text-[#6b7f91]">
          Time
        </div>
        {days.map((date) => (
          <div key={date} className="border-b border-r border-[#d7e5ec] bg-[#f7fbfd] p-4 last:border-r-0">
            <div className="text-[0.94rem] font-black text-[#102033]">{formatDate(date)}</div>
            <div className="text-[0.72rem] font-bold text-[#6b7f91]">{doctor.name}</div>
          </div>
        ))}

        {CALENDAR_HOURS.map((hour) => (
          <AvailabilityRow
            key={hour}
            appointments={appointments}
            days={days}
            hour={hour}
            schedule={schedule}
          />
        ))}
      </div>
    </div>
  )
}

function AvailabilityRow({
  appointments,
  days,
  hour,
  schedule,
}: {
  appointments: BookingAppointment[]
  days: string[]
  hour: number
  schedule: ReturnType<typeof getScheduleForDoctor>
}) {
  return (
    <>
      <div className="flex min-h-[88px] items-start justify-end border-r border-t border-[#d7e5ec] bg-white p-3 text-[0.74rem] font-black text-[#7c8fa1]">
        {timeRangeForHour(hour)}
      </div>
      {days.map((date) => {
        const appointment = appointmentForCell(appointments, date, hour)
        const isInDoctorSchedule = isBookableHour(hour, schedule)
        const isBreak = isInDoctorSchedule && hour === schedule.breakHour
        const specialAppointment = appointment !== undefined && isSpecialAppointment(appointment, schedule)
        const isBooked = appointment !== undefined && !specialAppointment
        const isUnavailable = !appointment && !isInDoctorSchedule
        const isAvailable = !appointment && isInDoctorSchedule && !isBreak

        return (
          <div
            key={`${date}-${hour}`}
            title={appointment ? `${appointment.patient_display || 'Patient unavailable'} · ${appointmentReason(appointment)}` : undefined}
            className={cn(
              'relative min-h-[88px] border-r border-t p-3 text-left last:border-r-0',
              isAvailable && 'border-[#a7dfbf] bg-[#e4f7eb] text-[#0f6b4f]',
              isBreak && !appointment && 'border-[#f4d16f] bg-[#fff6cc] text-[#805b00]',
              isUnavailable && 'border-[#d7e0e7] bg-[#eef2f5] text-[#74889a]',
              isBooked && 'border-[#f3a19c] bg-[#feeceb] text-[#a22828]',
              specialAppointment && 'border-[#f0b56a] bg-[#fff0db] text-[#9a4f00]',
            )}
          >
            <span className="block text-[0.82rem] font-black">
              {appointment ? formatTime(appointment.start_time) : formatTime(hourTime(hour))}
            </span>
            <span className="mt-1 block text-[0.76rem] font-bold leading-5">
              {isAvailable && 'Available'}
              {isBreak && !appointment && schedule.breakLabel}
              {isUnavailable && 'Unavailable'}
              {isBooked && 'Booked'}
              {specialAppointment && 'Special appointment'}
            </span>
            {appointment && (
              <>
                <span className="mt-2 block truncate text-[0.72rem] font-bold">
                  {appointment.patient_display || 'Patient unavailable'}
                </span>
                <span className="mt-1 block text-[0.68rem] font-bold text-current/80">
                  {formatShortDate(date)}
                </span>
              </>
            )}
          </div>
        )
      })}
    </>
  )
}
