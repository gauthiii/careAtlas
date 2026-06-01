import { CalendarDays, MapPin, UserRound } from 'lucide-react'
import type { Appointment } from '../../data/patientPortalData'
import { StatusBadge } from './PatientPanel'

export function AppointmentCard({ appointment, selectable = false }: { appointment: Appointment; selectable?: boolean }) {
  return (
    <article className={`patient-appointment-card ${selectable ? 'selectable' : ''}`}>
      <div>
        <strong><CalendarDays size={17} /> {appointment.date}</strong>
        <span>{appointment.time}</span>
      </div>
      <p><UserRound size={16} /> {appointment.doctor}</p>
      <p><MapPin size={16} /> {appointment.department} · {appointment.location}</p>
      <StatusBadge tone={appointment.status === 'Confirmed' || appointment.status === 'Available' ? 'success' : 'info'}>
        {appointment.status}
      </StatusBadge>
    </article>
  )
}
