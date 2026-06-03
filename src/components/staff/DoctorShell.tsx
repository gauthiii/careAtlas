import {
  CalendarCheck,
  Clock3,
  HeartPulse,
  Hospital,
  LayoutDashboard,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import type React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../../lib/cn'
import {
  isClinicianPortalPath,
  isGovernancePortalPath,
  isPatientPortalPath,
  portalSwitcherActive,
  portalSwitcherLink,
} from '../../lib/portalNav'
import { hospital } from '../../data/patientPortalData'

const clinicianNav = [
  { label: 'Sign in', to: '/staff/sign-in', icon: LockKeyhole, end: true },
  { label: 'Dashboard', to: '/staff/doctor', icon: LayoutDashboard, end: true },
  { label: 'Admin', to: '/staff/admin', icon: CalendarCheck },
  { label: 'Availability', to: '/staff/availability', icon: Clock3 },
  { label: 'Patient record', to: '/staff/patient/P-2193', icon: UserRound, matchPrefix: '/staff/patient' },
] as const

export function DoctorShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 shrink-0 grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-[#d7e5ec] rounded-[14px] bg-white px-[clamp(14px,3vw,28px)] py-3.5 shadow-[0_10px_26px_rgba(25,64,93,0.08)] backdrop-blur-[14px] max-[1100px]:grid-cols-1 max-[720px]:p-2.5">
        <NavLink className="flex items-center gap-3" to="/">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#143A57] text-white">
            <Hospital size={24} />
          </span>
          <span>
            <strong className="block text-[1.02rem] tracking-normal text-[#102033] max-[720px]:text-[0.94rem]">
              {hospital.name}
            </strong>
            <small className="mt-0.5 flex items-center gap-[5px] text-[0.78rem] font-[750] text-[#607487]">
              <Stethoscope size={13} /> Clinician portal
            </small>
          </span>
        </NavLink>

        <nav
          className="min-w-0 justify-self-center flex items-center gap-1 rounded-xl border border-[#d7e5ec] bg-[#f7fbfd] p-1 max-[1100px]:justify-self-stretch max-[1100px]:overflow-x-auto"
          aria-label="Clinician portal navigation"
        >
          {clinicianNav.map((item) => {
            const Icon = item.icon
            const prefix = 'matchPrefix' in item ? item.matchPrefix : undefined

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={({ isActive }) =>
                  cn(
                    'inline-flex min-h-[34px] items-center gap-1.5 rounded-[9px] px-2.5 text-[0.82rem] font-bold text-[#53687b] max-[720px]:whitespace-nowrap',
                    (isActive || (prefix && location.pathname.startsWith(prefix))) &&
                      'bg-[#143A57] !text-white',
                  )
                }
              >
                <Icon size={15} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <nav
          className="min-w-0 justify-self-end flex items-center gap-1 rounded-xl border border-[#d7e5ec] bg-white p-1 max-[1100px]:justify-self-stretch max-[1100px]:overflow-x-auto"
          aria-label="Switch portal view"
        >
          <NavLink
            to="/patient/home"
            className={cn(portalSwitcherLink, isPatientPortalPath(location.pathname) && portalSwitcherActive)}
          >
            <HeartPulse size={15} /> Patient Portal
          </NavLink>
          <NavLink
            to="/staff/doctor"
            className={cn(portalSwitcherLink, isClinicianPortalPath(location.pathname) && portalSwitcherActive)}
          >
            <Stethoscope size={15} /> Clinician Portal
          </NavLink>
          <NavLink
            to="/governance"
            className={cn(portalSwitcherLink, isGovernancePortalPath(location.pathname) && portalSwitcherActive)}
          >
            <ShieldCheck size={15} /> AI Governance
          </NavLink>
        </nav>
      </header>
      {children}
    </div>
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
