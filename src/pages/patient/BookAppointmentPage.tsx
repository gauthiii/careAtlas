import { CalendarPlus, CheckCircle2, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppointmentCard } from '../../components/patient/AppointmentCard'
import { PatientPanel } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { bookingSlots, upcomingAppointment } from '../../data/patientPortalData'

export function BookAppointmentPage() {
  return (
    <PatientPage
      title="Find an available clinic slot"
      intro="Choose a reason for visit, review available slots, and confirm the appointment summary"
    >
      <div className="grid gap-4 grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)] max-[1100px]:grid-cols-1">
        <PatientPanel title="1. Reason for visit" icon={<FileText size={21} />}>
          <label className="grid gap-[7px] text-[0.84rem] font-extrabold text-[#40566b]">
            <span className="flex flex-wrap items-baseline gap-1.5">Reason category</span>
            <select className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" defaultValue="">
              <option value="" disabled>Select reason</option>
              <option>General check-up</option>
              <option>Follow-up</option>
              <option>Urgent concern</option>
              <option>Specialist referral</option>
              <option>Mental health</option>
              <option>Chronic condition management</option>
            </select>
          </label>
          <label className="grid gap-[7px] text-[0.84rem] font-extrabold text-[#40566b]">
            <span className="flex flex-wrap items-baseline gap-1.5">Briefly describe your concern <em className="text-[0.72rem] font-[750] not-italic text-[#7c8fa1]">Optional, max 200 characters</em></span>
            <textarea className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" maxLength={200} placeholder="Add a short note for the clinic" />
          </label>
          <button className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-extrabold text-[#0f5f8c] max-[720px]:w-full">Next</button>
        </PatientPanel>
        <PatientPanel title="2. Available slots" icon={<CalendarPlus size={21} />} tone="secure">
          <div className="grid grid-cols-3 gap-3.5 max-[1100px]:grid-cols-1">
            {bookingSlots.map((slot) => <AppointmentCard appointment={slot} selectable key={slot.id} />)}
          </div>
          <button className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-extrabold text-[#0f5f8c] max-[720px]:w-full">Confirm booking</button>
        </PatientPanel>
        <PatientPanel title="3. Confirmation" icon={<CheckCircle2 size={21} />} tone="success" className="max-[1100px]:col-auto col-span-full">
          <div className="grid gap-[7px] rounded-[10px] border border-[#d7e5ec] bg-[#f7fbfd] p-3.5">
            <strong>{upcomingAppointment.date} at {upcomingAppointment.time}</strong>
            <span>{upcomingAppointment.doctor}</span>
            <span>{upcomingAppointment.location}</span>
          </div>
          <button className="mt-4 inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-extrabold text-[#0f5f8c] max-[720px]:w-full">Add to calendar</button>
          <Link className="mt-4 inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#0f5f8c] px-[15px] font-extrabold text-white max-[720px]:w-full" to="/patient/dashboard">Return to dashboard</Link>
        </PatientPanel>
      </div>
    </PatientPage>
  )
}
