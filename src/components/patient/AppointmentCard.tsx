import { CalendarDays, MapPin, UserRound, Clock } from 'lucide-react'
import type { Appointment } from '../../data/patientPortalData'
import { cn } from '../../lib/cn'
import { StatusBadge } from './PatientPanel'

export function AppointmentCard({
  appointment,
  selectable = false,
}: {
  appointment: Appointment
  selectable?: boolean
}) {
  return (
    <article
      className={cn(
        'grid min-h-[170px] grid-rows-[auto_auto_1fr_auto] gap-2 rounded-xl border border-[#d7e5ec] bg-white p-3.5',
        selectable && 'bg-[#f7fbfd]',
      )}
    >
      <div>
        <strong className="flex items-center justify-between gap-2 text-[#102033]">
          <span className="flex items-center gap-2">
            <CalendarDays size={17} />
            {appointment.date}
          </span>

          <span className="flex items-center gap-2">
            <Clock size={17} />
            {appointment.time}
          </span>
        </strong>
      </div>

      <p className="m-0 line-clamp-1 flex items-center gap-2 text-[#53687b]">
        <UserRound size={16} />
        {appointment.doctor}
      </p>

      <p className="m-0 line-clamp-2 flex items-start gap-2 text-[#53687b]">
        <MapPin size={16} className="mt-0.5 shrink-0" />
        <span>
          {appointment.department} · {appointment.location}
        </span>
      </p>

      <StatusBadge
        tone={
          appointment.status === 'Confirmed' ||
          appointment.status === 'Available' ||
          appointment.status === 'Selected'
            ? 'success'
            : 'info'
        }
      >
        {appointment.status}
      </StatusBadge>
    </article>
  )
}