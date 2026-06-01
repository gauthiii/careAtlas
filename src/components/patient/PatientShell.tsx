import { HeartPulse, Hospital, Phone } from 'lucide-react'
import type React from 'react'
import { NavLink } from 'react-router-dom'
import { hospital } from '../../data/patientPortalData'

const patientNav = [
  { label: 'Home', to: '/patient/home' },
  { label: 'Register', to: '/patient/register' },
  { label: 'Sign in', to: '/patient/sign-in' },
  { label: 'Dashboard', to: '/patient/dashboard' },
  { label: 'Book', to: '/patient/book' },
  { label: 'Profile', to: '/patient/profile' },
  { label: 'Contact', to: '/patient/contact' },
]

export function PatientShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="patient-portal">
      <header className="hospital-header">
        <NavLink className="hospital-brand" to="/">
          <span className="hospital-logo"><Hospital size={24} /></span>
          <span>
            <strong>{hospital.name}</strong>
            <small><HeartPulse size={13} /> {hospital.portalName}</small>
          </span>
        </NavLink>
        <nav className="patient-nav" aria-label="Patient portal navigation">
          {patientNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <a className="hospital-phone" href={`tel:${hospital.phone.replace(/\D/g, '')}`}>
          <Phone size={16} />
          {hospital.phone}
        </a>
      </header>
      {children}
    </div>
  )
}

export function PatientPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <PatientShell>
      <main className="patient-page">
        <section className="patient-page-heading">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
        </section>
        {children}
      </main>
    </PatientShell>
  )
}
