import { ArrowRight, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PortalHeader } from '../../components/portal/PortalShell'

const views = [
  {
    label: 'Patient portal',
    description: 'Register, verify identity, book appointments, manage profile, and contact the clinic.',
    to: '/patient/home',
    icon: <HeartPulse size={24} />,
    tone: 'patient',
  },
  {
    label: 'Clinician portal',
    description: 'Doctor and admin views for schedules, patient records, approvals, and availability.',
    to: '/staff/sign-in',
    icon: <Stethoscope size={24} />,
    tone: 'staff',
  },
  {
    label: 'AI governance',
    description: 'Control Tower dashboard for agent inventory, shadow AI, fairness, injection, and audit logs.',
    to: '/governance',
    icon: <ShieldCheck size={24} />,
    tone: 'governance',
  },
]

export function ViewChooserPage() {
  return (
    <div className="patient-portal">
      <PortalHeader label="CareAtlas demo views" />
      <main className="patient-page">
        <section className="patient-page-heading chooser-heading">
          <span>Demo entry point</span>
          <h1>Choose a portal view</h1>
          <p>Select the patient, clinician, or AI governance experience. Each view is a static ServiceNow-style UI demo.</p>
        </section>
        <section className="view-chooser-grid">
          {views.map((view) => (
            <Link className={`view-card view-card-${view.tone}`} to={view.to} key={view.label}>
              <span>{view.icon}</span>
              <h2>{view.label}</h2>
              <p>{view.description}</p>
              <b>Open view <ArrowRight size={17} /></b>
            </Link>
          ))}
        </section>
      </main>
    </div>
  )
}
