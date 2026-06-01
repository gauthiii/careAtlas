import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PatientPage } from '../../components/patient/PatientShell'
import { PatientFormSection } from '../../components/patient/PatientFormSection'
import { registrationSections } from '../../data/patientPortalData'

export function RegistrationPage() {
  return (
    <PatientPage
      eyebrow="New patient registration"
      title="Create your patient portal account"
      intro="Complete the intake form so the clinic can verify your identity and prepare appointment access."
    >
      <div className="patient-form-ledger">
        {registrationSections.map((section) => <PatientFormSection section={section} key={section.title} />)}
        <section className="password-strength-panel">
          <div>
            <h2>Password strength</h2>
            <p>Use at least 12 characters with a mix of letters, numbers, and symbols.</p>
          </div>
          <div className="strength-meter" aria-label="Password strength indicator">
            <span />
            <span />
            <span />
            <span className="empty" />
          </div>
        </section>
        <label className="terms-check">
          <input type="checkbox" />
          <span>I agree to the terms of service and privacy policy.</span>
        </label>
      </div>
      <div className="patient-confirmation-bar">
        <CheckCircle2 size={20} />
        <span>Submission creates a Patient record, sends verification, and queues identity verification.</span>
        <Link className="patient-button primary" to="/patient/verify-email">Submit registration</Link>
      </div>
      <div className="security-note">
        <ShieldCheck size={18} />
        Sensitive scheduling fields are protected after registration to reduce data manipulation risk.
      </div>
    </PatientPage>
  )
}
