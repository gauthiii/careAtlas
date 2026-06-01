import { CalendarCheck, Clock3 } from 'lucide-react'
import { PortalPage, PortalPanel } from '../../components/portal/PortalShell'
import { weeklyAvailability } from '../../data/staffGovernanceData'

export function AvailabilityPage() {
  return (
    <PortalPage
      label="Clinical staff portal"
      eyebrow="Doctor availability"
      title="Manage scheduling availability"
      intro="A static weekly calendar for available, booked, and blocked time that the scheduling agent reads from."
    >
      <div className="availability-grid clinical-availability">
        {weeklyAvailability.map((block) => (
          <div className={`availability-block ${block.tone}`} key={block.day}>
            <b>{block.day}</b>
            <span>{block.label}</span>
            <small>{block.time}</small>
          </div>
        ))}
      </div>
      <div className="patient-two-column">
        <PortalPanel title="Add available slots" icon={<CalendarCheck size={21} />} tone="success">
          <label className="patient-field">Date<input type="date" /></label>
          <label className="patient-field">Time range<input placeholder="09:00-12:00" /></label>
          <label className="patient-field">Appointment type<select><option>In-person</option><option>Telehealth</option></select></label>
        </PortalPanel>
        <PortalPanel title="Block time" icon={<Clock3 size={21} />} tone="secure">
          <label className="patient-field">Reason<select><option>Holiday</option><option>Admin time</option><option>Training</option></select></label>
          <button className="patient-button primary">Save mock change</button>
        </PortalPanel>
      </div>
    </PortalPage>
  )
}
