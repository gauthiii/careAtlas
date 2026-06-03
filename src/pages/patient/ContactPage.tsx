import { PatientPanel } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { hospital } from '../../data/patientPortalData'
import { Phone, Clock3, MapPin, Mail, MailPlus } from 'lucide-react'


export function ContactPage() {
  return (
    <PatientPage
      title="Contact Your Care Team"
      intro="Need help? Send a secure message regarding appointments, billing, portal access, prescriptions, or general inquiries."
    >
      <div className="grid gap-4 grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] max-[1100px]:grid-cols-1">
        <PatientPanel title="Send a Message" icon={<MailPlus size={21} />}>
          <label className="grid gap-[7px] text-[0.84rem] font-bold">
            <span className="flex flex-wrap items-baseline gap-1.5">Choose a request type</span>
            <select className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" defaultValue="">
              <option value="" disabled>Select subject</option>
              <option>Appointment Scheduling</option>
              <option>Appointment Changes</option>
              <option>Prescription Refill Request</option>
              <option>Billing Question</option>
              <option>Insurance Question</option>
              <option>Medical Records Request</option>
              <option>Portal Access Issue</option>
              <option>Technical Support</option>
              <option>General Inquiry</option>
              <option>Billing</option>
              <option>Technical issue</option>
              <option>Other</option>
            </select>
          </label>
          <label className="grid gap-[7px] text-[0.84rem] font-bold py-3">
            <span className="flex flex-wrap items-baseline gap-1.5">Message</span>
            <textarea className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" placeholder="Please describe your request. Include any relevant dates, appointment details, or reference numbers" rows={5} />
          </label>
          <button className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold text-white max-[720px]:w-full text-md">Submit case</button>
        </PatientPanel>
        <PatientPanel title="Need Immediate Assistance?" icon={<Phone size={21} />} tone="secure">
          <div className="rounded-[10px] border border-[#d7e5ec] bg-[#f7fbfd] p-4">
            <div className="space-y-5">
              {/* Main Clinic Line */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Phone className="h-4 w-4" />
                  <span>Main Clinic Line</span>
                </div>
                <div className="font-semibold text-slate-900">
                  {hospital.phone}
                </div>
              </div>

              {/* Hours */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Clock3 className="h-4 w-4" />
                  <span>Hours</span>
                </div>
                <div className="text-slate-900">
                  {hospital.hours} {hospital.timing}
                </div>
              </div>

              {/* Address */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                  <MapPin className="h-4 w-4" />
                  <span>Address</span>
                </div>
                <div className="text-slate-900">
                  {hospital.addressLine1} {hospital.addressLine2}
                </div>
              </div>

              {/* Email */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </div>
                <div className="text-slate-900">
                  {hospital.email}
                </div>
              </div>
            </div>
          </div>
        </PatientPanel>
      </div>
    </PatientPage>
  )
}
