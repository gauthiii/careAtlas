import { CalendarDays, MapPin, UserRound } from 'lucide-react'
import type { Appointment } from '../../data/patientPortalData'
import { cn } from '../../lib/cn'
import { StatusBadge } from './PatientPanel'

export function AppointmentCard({ appointment, selectable = false }: { appointment: Appointment; selectable?: boolean }) {
  return (
    <article
      className={cn(
        'grid gap-2 rounded-xl border border-[#d7e5ec] border-l-4 border-l-[#0f5f8c] bg-white p-3.5',
        selectable && 'bg-[#f7fbfd]',
      )}
    >
      <div>
        <strong className="flex items-center justify-between gap-2 text-[#102033]"><CalendarDays size={17} /> {appointment.date}</strong>
        <span>{appointment.time}</span>
      </div>
      <p className="m-0 flex items-center gap-2 text-[#53687b]"><UserRound size={16} /> {appointment.doctor}</p>
      <p className="m-0 flex items-center gap-2 text-[#53687b]"><MapPin size={16} /> {appointment.department} · {appointment.location}</p>
      <StatusBadge tone={appointment.status === 'Confirmed' || appointment.status === 'Available' ? 'success' : 'info'}>
        {appointment.status}
      </StatusBadge>
    </article>
  )
}
