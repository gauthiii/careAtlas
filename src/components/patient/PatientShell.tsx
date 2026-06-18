import { HeartPulse, ShieldCheck, Stethoscope, Home, UserPlus, LockKeyhole, LayoutDashboard, CalendarCheck, CalendarDays, User, MessageCircle } from 'lucide-react'
import type React from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import {
  isClinicianPortalPath,
  isGovernancePortalPath,
  isPatientPortalPath,
  portalSwitcherActive,
  portalSwitcherLink,
} from '../../lib/portalNav'
import { usePatientAuth } from '../../contexts/PatientAuthContext'
import { OverrideSignInNavLink } from '../auth/OverrideSignInNavLink'
import { PatientNotificationBell } from '../NotificationBell'
import { SidebarLayout, sidebarItemClass } from '../portal/SidebarLayout'


const loggedOutPatientNav = [
  { label: 'Home', to: '/patient/home', icon: Home },
  { label: 'Register', to: '/patient/register', icon: UserPlus },
  { label: 'Sign in', to: '/patient/sign-in', icon: LockKeyhole },
] as const

const loggedInPatientNav = [
  { label: 'Dashboard', to: '/patient/dashboard', icon: LayoutDashboard },
  { label: 'Book', to: '/patient/book', icon: CalendarCheck },
  { label: 'Appointments', to: '/patient/appointments', icon: CalendarDays },
  { label: 'Profile', to: '/patient/profile', icon: User },
  { label: 'Contact', to: '/patient/contact', icon: MessageCircle },
] as const

export function PatientShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, overrideLogin, logout } = usePatientAuth()
  const patientNav = isAuthenticated ? loggedInPatientNav : loggedOutPatientNav
  const patientPortalHome = isAuthenticated ? '/patient/dashboard' : '/patient/home'

  async function handleSignOut() {
    await logout()
    navigate('/patient/sign-in', { replace: true })
  }

  const nav = patientNav.map((item) => {
    if (!isAuthenticated && item.to === '/patient/sign-in') {
      return (
        <OverrideSignInNavLink
          key={item.to}
          to={item.to}
          end
          label={item.label}
          icon={item.icon}
          className={({ isActive }: { isActive: boolean }) => sidebarItemClass(isActive)}
          portalLabel="Patient Portal"
          redirectTo="/patient/dashboard"
          onOverrideLogin={overrideLogin}
        />
      )
    }
    return (
      <NavLink key={item.to} to={item.to} end className={({ isActive }) => sidebarItemClass(isActive)}>
        {item.icon && <item.icon size={17} />} {item.label}
      </NavLink>
    )
  })

  const headerRight = (
    <>
      {isAuthenticated && <PatientNotificationBell />}
      <nav className="min-w-0 flex items-center gap-1 rounded-xl border border-[#d7e5ec] bg-white p-1 max-[720px]:overflow-x-auto" aria-label="Switch portal view">
        <NavLink to={patientPortalHome} className={cn(portalSwitcherLink, isPatientPortalPath(location.pathname) && portalSwitcherActive)}>
          <HeartPulse size={15} /> Patient Portal
        </NavLink>
        <NavLink to="/staff/doctor" className={cn(portalSwitcherLink, isClinicianPortalPath(location.pathname) && portalSwitcherActive)}>
          <Stethoscope size={15} /> Clinician Portal
        </NavLink>
        <NavLink to="/governance" className={cn(portalSwitcherLink, isGovernancePortalPath(location.pathname) && portalSwitcherActive)}>
          <ShieldCheck size={15} /> AI Governance
        </NavLink>
      </nav>
    </>
  )

  return (
    <SidebarLayout
      portalLabel="Patient Portal"
      portalLabelIcon={<HeartPulse size={13} />}
      nav={nav}
      navAriaLabel="Patient portal navigation"
      headerRight={headerRight}
      signOut={isAuthenticated ? { onSignOut: handleSignOut, label: 'Sign out' } : null}
    >
      {children}
    </SidebarLayout>
  )
}

export function PatientPage({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <PatientShell>
      <main className="flex min-h-[calc(100vh-120px)] flex-col px-0 py-5 px-6">
        <section className="py-6">
          <h1 className="text-3xl font-bold">{title}</h1>
          {intro && <p className="mt-3 text-[1.02rem] font-semibold leading-[1.55] text-[#53687b]">{intro}</p>}
        </section>
        {children}
      </main>
    </PatientShell>
  )
}
