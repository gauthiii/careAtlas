import { Activity, CalendarCheck, MessageSquare, Search, UserCheck } from 'lucide-react'
import { PortalPage, PortalPanel, PortalTable } from '../../components/portal/PortalShell'
import { adminCases, pendingApprovals, staffAppointments } from '../../data/staffGovernanceData'

export function AdminDashboardPage() {
  return (
    <PortalPage
      label="Clinical staff portal"
      eyebrow="Admin dashboard"
      title="Master schedule and intake queue"
      intro="A receptionist/admin view for all appointments, patient lookup, manual actions, registration approvals, and contact cases."
    >
      <div className="admin-toolbar clinical-search"><Search size={18} /><input placeholder="Search by patient name or ID" /></div>
      <div className="patient-dashboard-grid">
        <PortalPanel title="All appointments today" icon={<CalendarCheck size={21} />} tone="success">
          <PortalTable
            columns={['Time', 'Patient', 'Doctor']}
            rows={staffAppointments.map((appointment) => [appointment.time, appointment.patient, appointment.doctor])}
          />
        </PortalPanel>
        <PortalPanel title="Quick actions" icon={<Activity size={21} />}>
          <div className="patient-action-list">
            <button>Create manual appointment</button>
            <button>Cancel appointment</button>
            <button>Mark patient as arrived</button>
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
    </PortalPage>
  )
}
