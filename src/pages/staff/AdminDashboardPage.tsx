import { Activity, CalendarCheck, MessageSquare, Search, UserCheck, DoorOpen, CalendarPlus, X,Check,  Mail, ArrowUpRight } from 'lucide-react'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { PortalPanel, PortalTable } from '../../components/portal/PortalShell'
import { adminCases, pendingApprovals, staffAppointments } from '../../data/staffGovernanceData'

export function AdminDashboardPage() {
  function AdminStat({
    label,
    value,
    helper,
    color = 'text-[#102033]',
  }: {
    label: string
    value: string
    helper: string
    color?: string
  }) {
    return (
      <div className="rounded-xl border border-[#d7e5ec] bg-white p-4">
        <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[#607487]">
          {label}
        </div>

        <div className={`mt-2 text-3xl font-black ${color}`}>
          {value}
        </div>

        <div className="mt-1 text-sm text-[#607487]">
          {helper}
        </div>
      </div>
    )
  }
  return (
    <DoctorPage
      title="Master schedule and intake queue"
      intro="A receptionist/admin view for all appointments, patient lookup, manual actions, registration approvals, and contact cases."
    >
      <div className="mb-4 grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
        <AdminStat
          label="Total Today"
          value="12"
          helper="3 departments"
        />

        <AdminStat
          label="Pending Approvals"
          value="3"
          helper="Needs action"
          color="text-amber-600"
        />

        <AdminStat
          label="Open Cases"
          value="3"
          helper="1 new"
          color="text-red-600"
        />

        <AdminStat
          label="Rooms Available"
          value="4"
          helper="of 9 total"
          color="text-emerald-600"
        />
      </div>
      <div className="mb-4 rounded-xl border border-[#d7e5ec] bg-white p-3">
        <div className="flex items-center gap-3">
          <Search size={18} />

          <input
            className="flex-1 bg-transparent outline-none"
            placeholder="Search by patient name, ID, doctor, or case reference..."
          />

          <div className="flex gap-2">
            <button className="rounded-full bg-[#e1f5ee] px-3 py-1 text-xs font-bold text-[#12805c]">
              All
            </button>

            <button className="rounded-full border px-3 py-1 text-xs">
              Confirmed
            </button>

            <button className="rounded-full border px-3 py-1 text-xs">
              Checked In
            </button>

            <button className="rounded-full border px-3 py-1 text-xs">
              Pending
            </button>
          </div>
        </div>
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
  <button className="flex min-h-11 w-full items-center justify-between rounded-[10px] border border-[#d7e5ec] bg-white px-3 py-2.5 font-bold">
    <span className="flex items-center gap-2.5">
      <CalendarPlus size={18} />
      Create manual appointment
    </span>
    <ArrowUpRight size={18} />
  </button>

  <button className="flex min-h-11 w-full items-center justify-between rounded-[10px] border border-[#d7e5ec] bg-white px-3 py-2.5 font-bold">
    <span className="flex items-center gap-2.5">
      <X size={18} />
      Cancel appointment
    </span>
    <ArrowUpRight size={18} />
  </button>

  <button className="flex min-h-11 w-full items-center justify-between rounded-[10px] border border-[#d7e5ec] bg-white px-3 py-2.5 font-bold">
    <span className="flex items-center gap-2.5">
      <Check size={18} />
      Mark patient as arrived
    </span>
    <ArrowUpRight size={18} />
  </button>

  <button className="flex min-h-11 w-full items-center justify-between rounded-[10px] border border-[#d7e5ec] bg-white px-3 py-2.5 font-bold">
    <span className="flex items-center gap-2.5">
      <Mail size={18} />
      Send reminders
    </span>
    <ArrowUpRight size={18} />
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
        <PortalPanel
  title="Recent Activity Log"
  icon={<Activity size={21} />}
>
  <div className="space-y-3">
    <div className="border-b border-[#d7e5ec] pb-2">
      <div className="font-bold">
       Jordan Brooks checked in
      </div>
      <div className="text-sm text-[#607487]">
        2:04 PM · Reception desk
      </div>
    </div>

    <div className="border-b border-[#d7e5ec] pb-2">
      <div className="font-bold">
        Registration flagged for Sam Taylor
      </div>
      <div className="text-sm text-[#607487]">
        1:47 PM · AI screening
      </div>
    </div>

    <div className="border-b border-[#d7e5ec] pb-2">
      <div className="font-bold">
        CASE-7802 opened
      </div>
      <div className="text-sm text-[#607487]">
        1:30 PM · Patient portal
      </div>
    </div>
  </div>
</PortalPanel>
<PortalPanel
  title="Room Status"
  icon={<DoorOpen size={21} />}
>
  <div className="grid grid-cols-3 gap-2">
    {[
      ['1A', 'Occupied'],
      ['1B', 'Available'],
      ['1C', 'Cleaning'],
      ['2A', 'Occupied'],
      ['2B', 'Available'],
      ['2C', 'Available'],
      ['3C', 'Occupied'],
      ['4A', 'Cleaning'],
      ['4B', 'Available'],
    ].map(([room, status]) => (
      <div
        key={room}
        className="rounded-lg border border-[#d7e5ec] p-3 text-center"
      >
        <div className="font-black">
          {room}
        </div>

        <div className="text-xs text-[#607487]">
          {status}
        </div>
      </div>
    ))}
  </div>
</PortalPanel>
      </div>
    </DoctorPage>
  )
}
