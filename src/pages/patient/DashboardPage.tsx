import { Bell, CalendarCheck, ClipboardList, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppointmentCard } from '../../components/patient/AppointmentCard'
import { PatientPanel, PatientTable, StatusBadge } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { appointmentHistory, dashboardActions, notifications, patient, upcomingAppointment } from '../../data/patientPortalData'

const actionIcons = [<CalendarCheck size={18} />, <UserRound size={18} />, <Bell size={18} />]

export function DashboardPage() {
  return (
    <PatientPage
      title={`Welcome back, ${patient.firstName}`}
      intro="Your central place for appointments, profile status, and clinic messages."
    >
      <section className="grid grid-cols-2 gap-4 rounded-[14px] border border-[#d7e5ec] border-l-[5px] border-l-[#12805c] bg-white p-[18px] shadow-[0_12px_30px_rgba(25,64,93,0.07)] max-[720px]:grid-cols-1">
        <div className="grid gap-[7px]">
          <span className="text-[0.74rem] font-black uppercase tracking-[0.06em] text-[#607487]">Profile status</span>
          <strong className="text-[1.25rem] text-[#102033]">{patient.profileStatus}</strong>
          <StatusBadge tone="success">Complete profile supports better slot assignment</StatusBadge>
        </div>
        <div className="grid gap-[7px]">
          <span className="text-[0.74rem] font-black uppercase tracking-[0.06em] text-[#607487]">Next appointment</span>
          <strong className="text-[1.25rem] text-[#102033]">{upcomingAppointment.date}, {upcomingAppointment.time}</strong>
        </div>
      </section>
      <div className="grid gap-4 grid-cols-2 max-[1100px]:grid-cols-1">
        <PatientPanel title="Upcoming appointment" icon={<CalendarCheck size={21} />} tone="success">
          <AppointmentCard appointment={upcomingAppointment} />
        </PatientPanel>
        <PatientPanel title="Appointment history" icon={<ClipboardList size={21} />}>
          <PatientTable
            columns={['Date', 'Doctor', 'Status']}
            rows={appointmentHistory.slice(1).map((appointment) => [appointment.date, appointment.doctor, appointment.status])}
          />
        </PatientPanel>
        <PatientPanel title="Quick actions" icon={<UserRound size={21} />}>
          <div className="grid gap-2.5">
            {dashboardActions.map((action, index) => (
              <Link className="flex min-h-11 items-center gap-2.5 rounded-[10px] border border-[#d7e5ec] bg-white px-3 py-2.5 font-extrabold text-[#102033]" to={action.to} key={action.label}>
                {actionIcons[index]}
                {action.label}
              </Link>
            ))}
          </div>
        </PatientPanel>
        <PatientPanel title="Clinic notifications" icon={<Bell size={21} />} tone="secure">
          <div className="grid gap-2.5">
            {notifications.map((note) => (
              <p className="m-0 rounded-[9px] border-l-4 border-l-[#0f5f8c] bg-[#f7fbfd] p-3" key={note}>{note}</p>
            ))}
          </div>
        </PatientPanel>
      </div>
    </PatientPage>
  )
}
