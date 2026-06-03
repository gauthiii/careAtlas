import { HeartPulse, Hospital, ShieldCheck, Stethoscope } from 'lucide-react'
import type React from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
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
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-[18] grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-[#d7e5ec] rounded-[14px] bg-white/96 px-[clamp(14px,3vw,28px)] py-3.5 shadow-[0_10px_26px_rgba(25,64,93,0.08)] backdrop-blur-[14px] max-[1100px]:grid-cols-1 max-[720px]:static max-[720px]:p-2.5">
        <NavLink className="flex items-center gap-3" to="/">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#143A57] text-white"><Hospital size={24} /></span>
          <span>
            <strong className="block text-[1.02rem] tracking-normal text-[#102033] max-[720px]:text-[0.94rem]">{hospital.name}</strong>
            <small className="mt-0.5 flex items-center gap-[5px] text-[0.78rem] font-[750] text-[#607487]"><HeartPulse size={13} /> {hospital.portalName}</small>
          </span>
        </NavLink>
        <nav className="min-w-0 justify-self-center flex items-center gap-1 rounded-xl border border-[#d7e5ec] bg-[#f7fbfd] p-1 max-[1100px]:justify-self-stretch max-[1100px]:overflow-x-auto" aria-label="Patient portal navigation">
          {patientNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'inline-flex min-h-[34px] items-center gap-1.5 rounded-[9px] px-2.5 text-[0.82rem] font-bold text-[#53687b] max-[720px]:whitespace-nowrap',
                  isActive && 'bg-[#143A57] !text-white',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <nav className="min-w-0 justify-self-end flex items-center gap-1 rounded-xl border border-[#d7e5ec] bg-white p-1 max-[1100px]:justify-self-stretch max-[1100px]:overflow-x-auto" aria-label="Switch portal view">
          <NavLink
            to="/patient/home"
            className={({ isActive }) =>
              cn(
                'inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 text-[0.82rem] font-bold text-[#53687b]',
                isActive && 'bg-[#0397AE] !text-white',
              )
            }
          >
            <HeartPulse size={15} /> Patient
          </NavLink>
          <NavLink
            to="/staff/doctor"
            className={({ isActive }) =>
              cn(
                'inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 text-[0.82rem] font-bold text-[#53687b]',
                isActive && 'bg-[#e7f3f8] text-[#0f5f8c]',
              )
            }
          >
            <Stethoscope size={15} /> Clinician
          </NavLink>
          <NavLink
            to="/governance"
            className={({ isActive }) =>
              cn(
                'inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 text-[0.82rem] font-bold text-[#53687b]',
                isActive && 'bg-[#e7f3f8] text-[#0f5f8c]',
              )
            }
          >
            <ShieldCheck size={15} /> AI Governance
          </NavLink>
        </nav>
      </header>
      {children}
    </div>
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
