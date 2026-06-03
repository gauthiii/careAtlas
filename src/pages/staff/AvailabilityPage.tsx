import { CalendarCheck, Clock3 } from 'lucide-react'
import { PortalPage, PortalPanel } from '../../components/portal/PortalShell'
import { weeklyAvailability } from '../../data/staffGovernanceData'
import { cn } from '../../lib/cn'

const availabilityBg = {
  green: 'bg-[#e8fff2]',
  blue: 'bg-[#e6f2ff]',
  gray: 'bg-[#eef2f3]',
}

export function AvailabilityPage() {
  return (
    <PortalPage
      label="Clinical staff portal"
      eyebrow="Doctor availability"
      title="Manage scheduling availability"
      intro="A static weekly calendar for available, booked, and blocked time that the scheduling agent reads from."
    >
      <div className="mb-4 grid grid-cols-5 gap-2 max-[720px]:grid-cols-1">
        {weeklyAvailability.map((block) => (
          <div
            className={cn(
              'grid min-h-[92px] gap-1.5 rounded-[14px] border-2 border-[#17324d] p-2.5 shadow-[4px_4px_0_rgba(23,50,77,0.14)]',
              availabilityBg[block.tone],
            )}
            key={block.day}
          >
            <b>{block.day}</b>
            <span>{block.label}</span>
            <small>{block.time}</small>
          </div>
        ))}
      </div>
      <div className="grid gap-4 grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] max-[1100px]:grid-cols-1">
        <PortalPanel title="Add available slots" icon={<CalendarCheck size={21} />} tone="success">
          <label className="grid gap-[7px] text-[0.84rem] font-extrabold text-[#40566b]">Date<input className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" type="date" /></label>
          <label className="grid gap-[7px] text-[0.84rem] font-extrabold text-[#40566b]">Time range<input className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" placeholder="09:00-12:00" /></label>
          <label className="grid gap-[7px] text-[0.84rem] font-extrabold text-[#40566b]">Appointment type<select className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"><option>In-person</option><option>Telehealth</option></select></label>
        </PortalPanel>
        <PortalPanel title="Block time" icon={<Clock3 size={21} />} tone="secure">
          <label className="grid gap-[7px] text-[0.84rem] font-extrabold text-[#40566b]">Reason<select className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"><option>Holiday</option><option>Admin time</option><option>Training</option></select></label>
          <button className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#0f5f8c] px-[15px] font-extrabold text-white max-[720px]:w-full">Save mock change</button>
        </PortalPanel>
      </div>
    </PortalPage>
  )
}
