import { AlertTriangle, CheckCircle2, MailCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PatientPanel } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { verificationStates } from '../../data/patientPortalData'

export function EmailVerificationPage() {
  return (
    <PatientPage
      title="Verify your portal access"
      intro="The portal displays the successful verification state and an expired-link state for demo review."
    >
      <div className="grid gap-4 grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] max-[1100px]:grid-cols-1">
        <PatientPanel title={verificationStates.success.title} icon={<MailCheck size={21} />} tone="success">
          <p className="mt-1.5 mb-0 leading-normal text-[#607487]">{verificationStates.success.detail}</p>
          <Link className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#0f5f8c] px-[15px] font-extrabold text-white max-[720px]:w-full" to="/patient/sign-in">
            Continue to sign in <CheckCircle2 size={17} />
          </Link>
        </PatientPanel>
        <PatientPanel title={verificationStates.expired.title} icon={<AlertTriangle size={21} />} tone="warning">
          <p className="mt-1.5 mb-0 leading-normal text-[#607487]">{verificationStates.expired.detail}</p>
          <button className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-extrabold text-[#0f5f8c] max-[720px]:w-full">Resend verification email</button>
        </PatientPanel>
      </div>
    </PatientPage>
  )
}
