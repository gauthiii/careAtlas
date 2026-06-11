import type { ReactNode } from 'react'
import { Bot, HeartPulse, Home, Hospital, LockKeyhole, Presentation, ShieldCheck, Stethoscope, UserCog } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../../lib/cn'
import {
  isClinicianPortalPath,
  isGovernancePortalPath,
  isPatientPortalPath,
  portalSwitcherActive,
  portalSwitcherLink,
} from '../../lib/portalNav'
import type { PanelTone } from '../patient/PatientPanel'
import { hospital } from '../../data/patientPortalData'
import { useClinicianAuth } from '../../contexts/ClinicianAuthContext'
import { useGovernanceAuth } from '../../contexts/GovernanceAuthContext'
import { usePatientAuth } from '../../contexts/PatientAuthContext'
import { OverrideSignInNavLink } from '../auth/OverrideSignInNavLink'

export type PortalTone = 'patient' | 'staff' | 'admin' | 'governance' | 'risk' | 'neutral'

const panelTopBorder: Record<PanelTone, string> = {
  default: 'border-t-[#0f5f8c]',
  success: 'border-t-[#12805c]',
  warning: 'border-t-[#d97706]',
  danger: 'border-t-[#dc2626]',
  secure: 'border-t-[#40566b]',
}

const governanceNav = [
  { label: 'Home', to: '/governance', icon: Home, end: true },
  { label: 'AI Agents', to: '/governance/ai-agents', icon: Bot, end: true },
  { label: 'ACL', to: '/governance/acl', icon: UserCog, end: true },
  { label: 'Demo', to: '/governance/demo', icon: Presentation, end: true },
] as const

const signedOutGovernanceNav = [
  { label: 'Sign in', to: '/governance/sign-in', icon: LockKeyhole, end: true },
] as const

export function PortalHeader({ label }: { label: string }) {
  const location = useLocation()
  const { isAuthenticated: isClinicianAuthenticated } = useClinicianAuth()
  const { isAuthenticated: isGovernanceAuthenticated, overrideLogin } = useGovernanceAuth()
  const { isAuthenticated: isPatientAuthenticated } = usePatientAuth()
  const showGovernanceNav = isGovernancePortalPath(location.pathname)
  const visibleGovernanceNav = isGovernanceAuthenticated ? governanceNav : signedOutGovernanceNav
  const patientPortalHome = isPatientAuthenticated ? '/patient/dashboard' : '/patient/home'
  const clinicianPortalHome = isClinicianAuthenticated ? '/staff/doctor' : '/staff/sign-in'
  const governancePortalHome = isGovernanceAuthenticated ? '/governance' : '/governance/sign-in'

  return (
    <header className="sticky top-0 z-[18] grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-[#d7e5ec] rounded-[14px] bg-white/96 px-[clamp(14px,3vw,28px)] py-3.5 shadow-[0_10px_26px_rgba(25,64,93,0.08)] backdrop-blur-[14px] max-[1100px]:grid-cols-1 max-[720px]:static max-[720px]:p-2.5">
      <NavLink className="flex items-center gap-3" to="/">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#143A57] text-white"><Hospital size={24} /></span>
        <span>
          <strong className="block text-[1.02rem] tracking-normal text-[#102033] max-[720px]:text-[0.94rem]">{hospital.name}</strong>
          <small className="mt-0.5 flex items-center gap-[5px] text-[0.78rem] font-[750] text-[#607487]">{label}</small>
        </span>
      </NavLink>

      {showGovernanceNav && (
        <nav
          className="min-w-0 justify-self-center flex items-center gap-1 rounded-xl border border-[#d7e5ec] bg-[#f7fbfd] p-1 max-[1100px]:justify-self-stretch max-[1100px]:overflow-x-auto"
          aria-label="AI governance navigation"
        >
          {visibleGovernanceNav.map((item) => {
            const Icon = item.icon
            const navClassName = ({ isActive }: { isActive: boolean }) =>
              cn(
                'inline-flex min-h-[34px] items-center gap-1.5 rounded-[9px] px-2.5 text-[0.82rem] font-bold text-[#53687b] max-[720px]:whitespace-nowrap',
                isActive && 'bg-[#143A57] !text-white',
              )

            if (!isGovernanceAuthenticated && item.to === '/governance/sign-in') {
              return (
                <OverrideSignInNavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  label={item.label}
                  icon={Icon}
                  className={navClassName}
                  portalLabel="AI Governance"
                  redirectTo="/governance"
                  onOverrideLogin={overrideLogin}
                />
              )
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navClassName}
              >
                <Icon size={15} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      )}

      <nav className="min-w-0 justify-self-end flex items-center gap-1 rounded-xl border border-[#d7e5ec] bg-white p-1 max-[1100px]:justify-self-stretch max-[1100px]:overflow-x-auto" aria-label="Switch portal view">
        <NavLink
          to={patientPortalHome}
          className={cn(portalSwitcherLink, isPatientPortalPath(location.pathname) && portalSwitcherActive)}
        >
          <HeartPulse size={15} /> Patient Portal
        </NavLink>
        <NavLink
          to={clinicianPortalHome}
          className={cn(portalSwitcherLink, isClinicianPortalPath(location.pathname) && portalSwitcherActive)}
        >
          <Stethoscope size={15} /> Clinician Portal
        </NavLink>
        <NavLink
          to={governancePortalHome}
          className={cn(portalSwitcherLink, isGovernancePortalPath(location.pathname) && portalSwitcherActive)}
        >
          <ShieldCheck size={15} /> AI Governance
        </NavLink>
      </nav>
    </header>
  )
}

export function PortalPage({
  label,
  title,
  intro,
  children,
}: {
  label: string
  title: string
  intro?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-[calc(100vh-30px)]">
      <PortalHeader label={label} />
      <main className="grid gap-5 px-0 py-5 max-[720px]:pt-3">
        <section className="px-6 pt-6">
        <h1 className="text-3xl font-bold">{title}</h1>
          {intro && <p className="mt-3 max-w-[760px] text-[1.02rem] font-semibold leading-[1.55] text-[#53687b]">{intro}</p>}
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
  className,
  children,
}: {
  title: string
  icon?: ReactNode
  tone?: PanelTone
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-xl border border-[#d7e5ec] bg-white p-6',
        className,
      )}
    >
      <div className="mb-3.5 flex items-center gap-2.5">
        {icon && <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[#e7f3f8] text-[#0f5f8c]">{icon}</span>}
        <h2 className="m-0 text-lg font-bold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export function PortalTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="grid gap-2" role="table">
      <div className="grid grid-cols-3 gap-3 border-b border-[#d7e5ec] px-3 py-2.5 max-[720px]:grid-cols-1" role="row">
        {columns.map((column) => (
          <span className="text-[0.74rem] font-bold uppercase tracking-[0.06em] text-[#607487]" key={column} role="columnheader">{column}</span>
        ))}
      </div>
      {rows.map((row, index) => (
        <div className="grid grid-cols-3 gap-3 border-b border-[#d7e5ec] px-3 py-2.5 max-[720px]:grid-cols-1" role="row" key={`${row.join('-')}-${index}`}>
          {row.map((cell, cellIndex) => (
            <span className="min-w-0 [overflow-wrap:anywhere]" role="cell" key={`${cell}-${cellIndex}`}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  )
}
