import { Fingerprint, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PatientPage } from '../../components/patient/PatientShell'

export function SignInPage() {
  return (
    <PatientPage
      eyebrow="Secure sign in"
      title="Access your patient dashboard"
      intro="Use your patient portal credentials. A one-time MFA code is sent after username and password validation."
    >
      <section className="patient-login-card">
        <label className="patient-field">
          <span>Username</span>
          <input placeholder="maya.patel" />
        </label>
        <label className="patient-field">
          <span>Password</span>
          <input type="password" placeholder="Enter password" />
        </label>
        <div className="mfa-banner">
          <Fingerprint size={18} />
          MFA prompt appears after successful username and password validation.
        </div>
        <Link className="patient-button primary" to="/patient/dashboard">
          Sign in <LockKeyhole size={17} />
        </Link>
        <div className="patient-inline-links">
          <a>Forgot password?</a>
          <Link to="/patient/register">New patient? Register here</Link>
        </div>
      </section>
    </PatientPage>
  )
}
