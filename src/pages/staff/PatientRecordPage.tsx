import { Bot, Flag, UserRound } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { PortalPanel, PortalTable } from '../../components/portal/PortalShell'
import { aiDecisions, staffAppointments, staffPatients } from '../../data/staffGovernanceData'

export function PatientRecordPage() {
  const { id } = useParams()
  const record = staffPatients.find((item) => item.id === id) ?? staffPatients[0]

  return (
    <DoctorPage
      title={`${record.name} record view`}
      intro="Read-only clinician record with appointment history and the AI decision audit trail for this patient."
    >
      <div className="grid gap-4 grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] max-[1100px]:grid-cols-1">
        <section className="grid gap-4">
          <PortalPanel title="Patient demographic details" icon={<UserRound size={21} />} tone="secure">
            <div className="grid grid-cols-2 gap-3.5 max-[720px]:grid-cols-1">
              {Object.entries(record).map(([label, value]) => (
                <div className="grid gap-[5px] rounded-[10px] border border-[#e5eef3] bg-white p-3" key={label}>
                  <span className="text-[0.74rem] font-black uppercase tracking-[0.06em] text-[#607487]">{label}</span>
                  <strong className="[overflow-wrap:anywhere] text-[#102033]">{value}</strong>
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
        <aside className="grid gap-4">
          <PortalPanel title="AI decision log" icon={<Bot size={21} />} tone="warning">
            <PortalTable
              columns={['Time', 'Confidence', 'Weighted factors']}
              rows={aiDecisions.map((decision) => [decision.time, decision.confidence, decision.factors])}
            />
            <button className="mt-4 inline-flex min-h-[42px] w-max cursor-pointer items-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-extrabold text-[#0f5f8c] max-[720px]:w-full">
              <Flag size={17} /> Flag for review
            </button>
          </PortalPanel>
        </aside>
      </div>
    </DoctorPage>
  )
}
