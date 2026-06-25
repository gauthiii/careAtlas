import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Clock3,
  FileText,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
  UserRound,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import {
  isClinicianPortalPath,
  isGovernancePortalPath,
  isPatientPortalPath,
  portalSwitcherActive,
  portalSwitcherLink,
} from '../../lib/portalNav'
import { useClinicianAuth } from '../../contexts/ClinicianAuthContext'
import { usePatientAuth } from '../../contexts/PatientAuthContext'
import { OverrideSignInNavLink } from '../auth/OverrideSignInNavLink'
import { ClinicianNotificationBell } from '../NotificationBell'
import { SidebarLayout, SidebarIcon, sidebarItemClass } from '../portal/SidebarLayout'
import type { SidebarNavItem } from '../portal/SidebarLayout'

const signedOutClinicianNav = [
  { label: 'Sign in', to: '/staff/sign-in', icon: LockKeyhole, end: true },
] as const

const signedInClinicianNav = [
  { label: 'Dashboard', to: '/staff/doctor', icon: LayoutDashboard, end: true },
  { label: 'Appointments', to: '/staff/appointments', icon: CalendarDays, matchPrefix: '/staff/appointments' },
  { label: 'Queue', to: '/staff/queue', icon: ListChecks },
  { label: 'My Notes', to: '/staff/notes', icon: FileText },
  { label: 'Analytics', to: '/staff/analytics', icon: BarChart3 },
  { label: 'Admin', to: '/staff/admin', icon: CalendarCheck },
  { label: 'Availability', to: '/staff/availability', icon: Clock3 },
  { label: 'Profile', to: '/staff/profile', icon: Stethoscope },
  { label: 'Patient record', to: '/staff/patient/search', icon: UserRound, matchPrefix: '/staff/patient' },
] as const

export function DoctorShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const toggleCollapsed = () => setCollapsed((c) => !c)
  const { isAuthenticated: isClinicianAuthenticated, overrideLogin, logout } = useClinicianAuth()
  const { isAuthenticated: isPatientAuthenticated } = usePatientAuth()
  const clinicianNav = isClinicianAuthenticated ? signedInClinicianNav : signedOutClinicianNav
  const patientPortalHome = isPatientAuthenticated ? '/patient/dashboard' : '/patient/home'
  const clinicianPortalHome = isClinicianAuthenticated ? '/staff/doctor' : '/staff/sign-in'

  async function handleSignOut() {
    await logout()
    navigate('/staff/sign-in', { replace: true })
  }

  const nav: SidebarNavItem[] = clinicianNav.map((item) => {
    const Icon = item.icon
    const prefix = 'matchPrefix' in item ? item.matchPrefix : undefined
    const navClassName = ({ isActive }: { isActive: boolean }) =>
      sidebarItemClass(isActive || Boolean(prefix && location.pathname.startsWith(prefix)))

    if (!isClinicianAuthenticated && item.to === '/staff/sign-in') {
      return {
        label: item.label,
        node: (collapsed: boolean) => (
          <OverrideSignInNavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            label={item.label}
            icon={Icon}
            collapsed={collapsed}
            className={({ isActive }: { isActive: boolean }) => cn(navClassName({ isActive }), collapsed && 'justify-center gap-0 px-0 w-9 h-9 shrink-0')}
            portalLabel="Clinician Portal"
            redirectTo="/staff/doctor"
            onOverrideLogin={overrideLogin}
          />
        )
      }
    }

    return {
      label: item.label,
      node: (collapsed: boolean) => (
        <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : false} className={({ isActive }) => cn(navClassName({ isActive }), collapsed && 'justify-center gap-0 px-0 w-9 h-9 shrink-0')}>
          <SidebarIcon collapsed={collapsed} icon={<Icon size={22} />} />
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      )
    }
  })

  const headerRight = (
    <>
      {isClinicianAuthenticated && <ClinicianNotificationBell />}
      <nav className="min-w-0 flex items-center gap-1 rounded-xl border border-[#d7e5ec] bg-white p-1 max-[720px]:overflow-x-auto" aria-label="Switch portal view">
        <NavLink to={patientPortalHome} className={cn(portalSwitcherLink, isPatientPortalPath(location.pathname) && portalSwitcherActive)}>
          <HeartPulse size={15} /> Patient Portal
        </NavLink>
        <NavLink to={clinicianPortalHome} className={cn(portalSwitcherLink, isClinicianPortalPath(location.pathname) && portalSwitcherActive)}>
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
      portalLabel="Clinician portal"
      portalLabelIcon={<Stethoscope size={13} />}
      nav={nav}
      navAriaLabel="Clinician portal navigation"
      collapsed={collapsed}
      headerLeft={
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d7e5ec] bg-white transition-colors hover:bg-[#f4f8fb] min-[860px]:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      }
      headerRight={headerRight}
      signOut={isClinicianAuthenticated ? { onSignOut: handleSignOut, label: 'Sign out' } : null}
    >
      {children}
    </SidebarLayout>
  )
}

export function DoctorPage({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <DoctorShell>
      <main className="flex min-h-[calc(100vh-120px)] flex-col px-0 py-5 px-6">
        <section className="py-6">
          <h1 className="text-3xl font-bold">{title}</h1>
          {intro && (
            <p className="mt-3 text-[1.02rem] font-semibold leading-[1.55] text-[#53687b]">{intro}</p>
          )}
        </section>
        {children}
      </main>
    </DoctorShell>
  )
}
