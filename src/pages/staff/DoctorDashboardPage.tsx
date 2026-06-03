import { AlertTriangle, CalendarCheck, Clock3, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { PortalPanel, PortalTable } from '../../components/portal/PortalShell'
import { staffAppointments } from '../../data/staffGovernanceData'

export function DoctorDashboardPage() {
  return (
    <DoctorPage
      title="Today's clinical run sheet"
      intro="A clinician view of today's appointments, upcoming calendar, governance notifications, and availability controls."
    >
      <div className="grid grid-cols-2 gap-4 rounded-[14px] border border-[#d7e5ec] border-l-[5px] border-l-[#12805c] bg-white p-[18px] shadow-[0_12px_30px_rgba(25,64,93,0.07)] max-[720px]:grid-cols-1">
        <div className="grid gap-[7px]">
          <span className="text-[0.74rem] font-black uppercase tracking-[0.06em] text-[#607487]">Appointments today</span>
          <strong className="text-[1.25rem] text-[#102033]">{staffAppointments.length}</strong>
        </div>
        <div className="grid gap-[7px]">
          <span className="text-[0.74rem] font-black uppercase tracking-[0.06em] text-[#607487]">Open governance alerts</span>
          <strong className="text-[1.25rem] text-[#102033]">2</strong>
        </div>
      </div>
      <div className="grid gap-4 grid-cols-2 max-[1100px]:grid-cols-1">
        <PortalPanel title="Today's appointments" icon={<Clock3 size={21} />} tone="success">
          <PortalTable
            columns={['Time', 'Patient', 'Status']}
            rows={staffAppointments.map((appointment) => [appointment.time, appointment.patient, appointment.status])}
          />
        </PortalPanel>
        <PortalPanel title="Next 7 days" icon={<CalendarCheck size={21} />}>
          <div className="grid grid-cols-7 gap-2 max-[720px]:grid-cols-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
              <span className="grid min-h-[92px] gap-1.5 rounded-[14px] border-2 border-[#c9d8da] bg-[#fffdfa] p-2.5" key={day}>
                <b>{day}</b>
                {index + 2} visits
              </span>
            ))}
          </div>
        </PortalPanel>
        <PortalPanel title="AI governance notifications" icon={<AlertTriangle size={21} />} tone="warning">
          <p className="mt-1.5 mb-0 leading-normal text-[#607487]">
            A flagged scheduling decision for Jordan Brooks is awaiting review.
          </p>
          <Link
            className="mt-4 inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-extrabold text-[#0f5f8c] max-[720px]:w-full"
            to="/staff/patient/P-2193"
          >
            Open patient record
          </Link>
        </PortalPanel>
        <PortalPanel title="My availability" icon={<UserCheck size={21} />} tone="secure">
          <p className="mt-1.5 mb-0 leading-normal text-[#607487]">
            Availability blocks feed the doctor availability table used by the scheduling agent.
          </p>
          <Link
            className="mt-4 inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#0f5f8c] px-[15px] font-extrabold text-white max-[720px]:w-full"
            to="/staff/availability"
          >
            Manage availability
          </Link>
        </PortalPanel>
      </div>
    </DoctorPage>
  )
}
