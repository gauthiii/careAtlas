import { Fingerprint, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PortalPage } from '../../components/portal/PortalShell'

export function StaffSignInPage() {
  return (
    <PortalPage
      label="Clinical staff portal"
      eyebrow="Staff sign in"
      title="Access clinical operations"
      intro="Staff use the same ServiceNow authentication pattern with MFA enforced for all roles."
    >
      <section className="patient-login-card">
        <label className="patient-field">
          <span>Username</span>
          <input placeholder="clinician.name" />
        </label>
        <label className="patient-field">
          <span>Password</span>
          <input type="password" placeholder="Enter password" />
        </label>
        <div className="mfa-banner"><Fingerprint size={18} /> MFA code is sent after credential validation.</div>
        <Link className="patient-button primary" to="/role-picker">Sign in <LockKeyhole size={17} /></Link>
      </section>
    </PortalPage>
  )
}
