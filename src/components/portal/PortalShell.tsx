import type { ReactNode } from 'react'
import { HeartPulse, Hospital, ShieldCheck, Stethoscope } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { hospital } from '../../data/patientPortalData'

export type PortalTone = 'patient' | 'staff' | 'admin' | 'governance' | 'risk' | 'neutral'

export function PortalHeader({ label }: { label: string }) {
  return (
    <header className="hospital-header">
      <NavLink className="hospital-brand" to="/">
        <span className="hospital-logo"><Hospital size={24} /></span>
        <span>
          <strong>{hospital.name}</strong>
          <small>{label}</small>
        </span>
      </NavLink>
      <nav className="patient-nav" aria-label="Portal navigation">
        <NavLink to="/patient/home"><HeartPulse size={15} /> Patient</NavLink>
        <NavLink to="/staff/doctor"><Stethoscope size={15} /> Clinician</NavLink>
        <NavLink to="/governance"><ShieldCheck size={15} /> AI Governance</NavLink>
      </nav>
      <NavLink className="hospital-phone" to="/role-picker">Switch view</NavLink>
    </header>
  )
}

export function PortalPage({
  label,
  eyebrow,
  title,
  intro,
  children,
}: {
  label: string
  eyebrow: string
  title: string
  intro?: string
  children: ReactNode
}) {
  return (
    <div className="patient-portal">
      <PortalHeader label={label} />
      <main className="patient-page">
        <section className="patient-page-heading">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
        </section>
        {children}
      </main>
    </div>
  )
}

export function PortalPanel({
  title,
  icon,
  tone = 'default',
  children,
}: {
  title: string
  icon?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'secure'
  children: ReactNode
}) {
  return (
    <section className={`patient-panel patient-panel-${tone}`}>
      <div className="patient-panel-title">
        {icon && <span>{icon}</span>}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}

export function PortalTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="patient-table" role="table">
      <div className="patient-table-head" role="row">
        {columns.map((column) => <span key={column} role="columnheader">{column}</span>)}
      </div>
      {rows.map((row, index) => (
        <div className="patient-table-row" role="row" key={`${row.join('-')}-${index}`}>
          {row.map((cell, cellIndex) => <span role="cell" key={`${cell}-${cellIndex}`}>{cell}</span>)}
        </div>
      ))}
    </div>
  )
}
