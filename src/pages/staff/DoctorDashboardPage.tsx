import { AlertTriangle, CalendarCheck, Clock3, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PortalPage, PortalPanel, PortalTable } from '../../components/portal/PortalShell'
import { staffAppointments } from '../../data/staffGovernanceData'

export function DoctorDashboardPage() {
  return (
    <PortalPage
      label="Clinical staff portal"
      eyebrow="Doctor dashboard"
      title="Today’s clinical run sheet"
      intro="A clinician view of today’s appointments, upcoming calendar, governance notifications, and availability controls."
    >
      <div className="patient-welcome-band">
        <div><span>Appointments today</span><strong>{staffAppointments.length}</strong></div>
        <div><span>Open governance alerts</span><strong>2</strong></div>
      </div>
      <div className="patient-dashboard-grid">
        <PortalPanel title="Today’s appointments" icon={<Clock3 size={21} />} tone="success">
          <PortalTable
            columns={['Time', 'Patient', 'Status']}
            rows={staffAppointments.map((appointment) => [appointment.time, appointment.patient, appointment.status])}
          />
        </PortalPanel>
        <PortalPanel title="Next 7 days" icon={<CalendarCheck size={21} />}>
          <div className="calendar-strip">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
              <span key={day}><b>{day}</b>{index + 2} visits</span>
            ))}
          </div>
        </PortalPanel>
        <PortalPanel title="AI governance notifications" icon={<AlertTriangle size={21} />} tone="warning">
          <p>A flagged scheduling decision for Jordan Brooks is awaiting review.</p>
          <Link className="patient-button secondary" to="/staff/patient/P-2193">Open patient record</Link>
        </PortalPanel>
        <PortalPanel title="My availability" icon={<UserCheck size={21} />} tone="secure">
          <p>Availability blocks feed the doctor availability table used by the scheduling agent.</p>
          <Link className="patient-button primary" to="/staff/availability">Manage availability</Link>
        </PortalPanel>
      </div>
    </PortalPage>
  )
}
