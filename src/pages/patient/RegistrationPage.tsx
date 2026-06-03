import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PatientPage } from '../../components/patient/PatientShell'
import { PatientFormSection } from '../../components/patient/PatientFormSection'
import { registrationSections } from '../../data/patientPortalData'

export function RegistrationPage() {
  return (
    <PatientPage
      title="Create your patient portal account"
      intro="Complete the intake form so the clinic can verify your identity and prepare appointment access."
    >
      <div className="grid gap-[22px] rounded-[14px] border border-[#d7e5ec] bg-white p-6 shadow-[0_12px_30px_rgba(25,64,93,0.07)] max-[720px]:rounded-xl">
        {registrationSections.map((section) => <PatientFormSection section={section} key={section.title} />)}
        <section className="flex items-center justify-between gap-[18px] rounded-xl border border-[#d7e5ec] bg-[#f7fbfd] p-4 max-[720px]:grid max-[720px]:grid-cols-1">
          <div>
            <h2 className="m-0 text-[1.08rem] tracking-normal text-[#102033]">Password strength</h2>
            <p className="mt-1.5 mb-0 leading-normal text-[#607487]">Use at least 12 characters with a mix of letters, numbers, and symbols.</p>
          </div>
          <div className="grid grid-cols-4 gap-1.5" aria-label="Password strength indicator">
            <span className="h-2 rounded-full bg-[#12805c]" />
            <span className="h-2 rounded-full bg-[#12805c]" />
            <span className="h-2 rounded-full bg-[#12805c]" />
            <span className="h-2 rounded-full bg-[#d7e5ec]" />
          </div>
        </section>
        <label className="flex items-center gap-2.5 font-[750] text-[#40566b]">
          <input className="h-[18px] w-[18px]" type="checkbox" />
          <span>I agree to the terms of service and privacy policy.</span>
        </label>
      </div>
    
        <Link className="mt-6 inline-flex min-h-[42px] w-max cursor-pointer align-center flex items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white" to="/patient/verify-email">Submit registration</Link>
      
    </PatientPage>
  )
}
