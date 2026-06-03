import { Activity, CalendarCheck, MessageSquare, Search, UserCheck } from 'lucide-react'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { PortalPanel, PortalTable } from '../../components/portal/PortalShell'
import { adminCases, pendingApprovals, staffAppointments } from '../../data/staffGovernanceData'

export function AdminDashboardPage() {
  return (
    <DoctorPage
      title="Master schedule and intake queue"
      intro="A receptionist/admin view for all appointments, patient lookup, manual actions, registration approvals, and contact cases."
    >
      <div className="flex items-center gap-2.5 rounded-[14px] border-2 border-[#17324d] bg-white p-3.5 shadow-[0_12px_30px_rgba(25,64,93,0.07)]">
        <Search size={18} />
        <input className="flex-1 border-0 bg-transparent outline-none" placeholder="Search by patient name or ID" />
      </div>
      <div className="grid gap-4 grid-cols-2 max-[1100px]:grid-cols-1">
        <PortalPanel title="All appointments today" icon={<CalendarCheck size={21} />} tone="success">
          <PortalTable
            columns={['Time', 'Patient', 'Doctor']}
            rows={staffAppointments.map((appointment) => [appointment.time, appointment.patient, appointment.doctor])}
          />
        </PortalPanel>
        <PortalPanel title="Quick actions" icon={<Activity size={21} />}>
          <div className="grid gap-2.5">
            <button className="flex min-h-11 items-center gap-2.5 rounded-[10px] border border-[#d7e5ec] bg-white px-3 py-2.5 font-extrabold text-[#102033]">
              Create manual appointment
            </button>
            <button className="flex min-h-11 items-center gap-2.5 rounded-[10px] border border-[#d7e5ec] bg-white px-3 py-2.5 font-extrabold text-[#102033]">
              Cancel appointment
            </button>
            <button className="flex min-h-11 items-center gap-2.5 rounded-[10px] border border-[#d7e5ec] bg-white px-3 py-2.5 font-extrabold text-[#102033]">
              Mark patient as arrived
            </button>
          </div>
        </PortalPanel>
        <PortalPanel title="Pending registration approvals" icon={<UserCheck size={21} />} tone="warning">
          <PortalTable
            columns={['Patient', 'Confidence', 'Review reason']}
            rows={pendingApprovals.map((approval) => [approval.patient, approval.confidence, approval.reason])}
          />
        </PortalPanel>
        <PortalPanel title="Unresolved contact cases" icon={<MessageSquare size={21} />} tone="danger">
          <PortalTable
            columns={['Reference', 'Subject', 'Status']}
            rows={adminCases.map((item) => [item.ref, item.subject, item.status])}
          />
        </PortalPanel>
      </div>
    </DoctorPage>
  )
}
