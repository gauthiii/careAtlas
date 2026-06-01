import { ArrowRight, LockKeyhole, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PatientShell } from '../../components/patient/PatientShell'
import { hospital } from '../../data/patientPortalData'

export function LandingPage() {
  return (
    <PatientShell>
      <main className="patient-landing">
        <section className="hospital-hero">
          <div className="hospital-hero-copy">
            <span className="service-label">{hospital.portalName}</span>
            <h1>Book an appointment or manage your care</h1>
            <p>
              Register securely, book clinic appointments, and review your care information
              through {hospital.name}'s online patient portal.
            </p>
            <div className="patient-actions">
              <Link className="patient-button primary" to="/patient/register">
                Register as a new patient <ArrowRight size={18} />
              </Link>
              <Link className="patient-button secondary" to="/patient/sign-in">
                Sign in <LockKeyhole size={18} />
              </Link>
            </div>
          </div>
          <aside className="hospital-hero-info" aria-label="Hospital information">
            <h2>Patient services</h2>
            <ul>
              <li>Appointment booking and visit reminders</li>
              <li>Secure profile and contact management</li>
              <li>Clinic messaging for appointment and billing questions</li>
            </ul>
          </aside>
        </section>
        <footer className="patient-footer">
          <span>Accessibility statement</span>
          <span>Privacy policy</span>
          <span><Phone size={15} /> {hospital.phone}</span>
        </footer>
      </main>
    </PatientShell>
  )
}
