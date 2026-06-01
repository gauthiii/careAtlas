import { Bot, Flag, UserRound } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { PortalPage, PortalPanel, PortalTable } from '../../components/portal/PortalShell'
import { aiDecisions, staffAppointments, staffPatients } from '../../data/staffGovernanceData'

export function PatientRecordPage() {
  const { id } = useParams()
  const record = staffPatients.find((item) => item.id === id) ?? staffPatients[0]

  return (
    <PortalPage
      label="Clinical staff portal"
      eyebrow="Patient record"
      title={`${record.name} record view`}
      intro="Read-only clinician record with appointment history and the AI decision audit trail for this patient."
    >
      <div className="profile-layout">
        <section className="profile-field-ledger">
          <PortalPanel title="Patient demographic details" icon={<UserRound size={21} />} tone="secure">
            <div className="profile-field-grid">
              {Object.entries(record).map(([label, value]) => (
                <div className="patient-read-field" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </PortalPanel>
          <PortalPanel title="Appointment history" icon={<UserRound size={21} />}>
            <PortalTable
              columns={['Date', 'Doctor', 'Status']}
              rows={staffAppointments.map((appointment) => [appointment.date, appointment.doctor, appointment.status])}
            />
          </PortalPanel>
        </section>
        <aside className="profile-side">
          <PortalPanel title="AI decision log" icon={<Bot size={21} />} tone="warning">
            <PortalTable
              columns={['Time', 'Confidence', 'Weighted factors']}
              rows={aiDecisions.map((decision) => [decision.time, decision.confidence, decision.factors])}
            />
            <button className="patient-button secondary"><Flag size={17} /> Flag for review</button>
          </PortalPanel>
        </aside>
      </div>
    </PortalPage>
  )
}
