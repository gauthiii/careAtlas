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
      eyebrow="Patient dashboard"
      title={`Welcome back, ${patient.firstName}`}
      intro="Your central place for appointments, profile status, and clinic messages."
    >
      <section className="patient-welcome-band">
        <div>
          <span>Profile status</span>
          <strong>{patient.profileStatus}</strong>
          <StatusBadge tone="success">Complete profile supports better slot assignment</StatusBadge>
        </div>
        <div>
          <span>Next appointment</span>
          <strong>{upcomingAppointment.date}, {upcomingAppointment.time}</strong>
        </div>
      </section>
      <div className="patient-dashboard-grid">
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
          <div className="patient-action-list">
            {dashboardActions.map((action, index) => (
              <Link to={action.to} key={action.label}>
                {actionIcons[index]}
                {action.label}
              </Link>
            ))}
          </div>
        </PatientPanel>
        <PatientPanel title="Clinic notifications" icon={<Bell size={21} />} tone="secure">
          <div className="notification-list">
            {notifications.map((note) => <p key={note}>{note}</p>)}
          </div>
        </PatientPanel>
      </div>
    </PatientPage>
  )
}
