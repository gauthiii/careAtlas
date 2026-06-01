import { AlertTriangle, CheckCircle2, MailCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PatientPanel } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { verificationStates } from '../../data/patientPortalData'

export function EmailVerificationPage() {
  return (
    <PatientPage
      eyebrow="Email verification"
      title="Verify your portal access"
      intro="The portal displays the successful verification state and an expired-link state for demo review."
    >
      <div className="patient-two-column">
        <PatientPanel title={verificationStates.success.title} icon={<MailCheck size={21} />} tone="success">
          <p>{verificationStates.success.detail}</p>
          <Link className="patient-button primary" to="/patient/sign-in">
            Continue to sign in <CheckCircle2 size={17} />
          </Link>
        </PatientPanel>
        <PatientPanel title={verificationStates.expired.title} icon={<AlertTriangle size={21} />} tone="warning">
          <p>{verificationStates.expired.detail}</p>
          <button className="patient-button secondary">Resend verification email</button>
        </PatientPanel>
      </div>
    </PatientPage>
  )
}
