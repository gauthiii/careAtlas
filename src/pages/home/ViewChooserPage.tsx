import { ArrowRight, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PortalHeader } from '../../components/portal/PortalShell'
import { cn } from '../../lib/cn'

const views = [
  {
    label: 'Patient portal',
    description: 'Self-service access to appointments, identity verification, profile management, and care team communication.',
    checklist: [
      'Register & verify identity',
      'Schedule appointments',
      'Message your care team',
    ],
    to: '/patient/home',
    icon: <HeartPulse size={24} />,
    buttonText: 'Open Patient Portal',
    tone: 'patient' as const,
  },
  {
    label: 'Clinician portal',
    description: 'Clinical and administrative workflows for schedule management, patient record access, approvals, and availability tracking.',
    checklist: [
      'Manage schedules',
      'Access patient records',
      'Handle approvals',
    ],
    to: '/staff/sign-in',
    icon: <Stethoscope size={24} />,
    buttonText: 'Open Clinician Portal',
    tone: 'staff' as const,
  },
  {
    label: 'AI governance',
    description: 'Control Tower for monitoring AI agents — agent inventory, shadow AI detection, fairness analysis, prompt injection alerts, and audit logs.',
    checklist: [
      'Agent inventory & status',
      'Shadow AI detection',
      'Fairness & audit logs',
    ],
    to: '/governance',
    icon: <ShieldCheck size={24} />,
    buttonText: 'Open Governance Dashboard',
    tone: 'governance' as const,
  },
]

const viewCardBorder = {
  patient: 'border-l-[#143A57]',
  staff: 'border-l-[#143A57]',
  governance: 'border-l-[#143A57]',
}

export function ViewChooserPage() {
  return (
    <div className="min-h-[calc(100vh-30px)]">
      <PortalHeader label="CareAtlas" />
      <main className="grid gap-5 px-0 py-5 pb-[42px] max-[720px]:pt-3">
        <section className="px-6 py-8">
          <h1 className="text-3xl font-bold">Select your portal</h1>
          <p className="mt-3 text-lg font-semibold leading-[1.55] text-[#53687b]">
          Access the patient, clinician, or AI governance portal. Each portal is tailored to your role and provides secure, role-based access to relevant workflows.
          </p>
        </section>
        <section className="grid grid-cols-3 gap-[18px] max-[1100px]:grid-cols-1">
          {views.map((view) => (
            <Link
            className={cn(
              'grid min-h-[260px] gap-3.5 rounded-[14px] border border-[#d7e5ec] border-l-[5px] bg-white p-[22px] shadow-[0_12px_30px_rgba(25,64,93,0.07)]',
              viewCardBorder[view.tone],
            )}
              to={view.to}
              key={view.label}
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#e7f3f8] text-[#0397AE]">{view.icon}</span>
              <h2 className="m-0 text-lg font-semibold">{view.label}</h2>
              <p className="-mt-2 leading-normal">{view.description}</p>
              <ul className="m-0 list-none p-0">
  {view.checklist.map((item) => (
    <li key={item} className="mb-2 flex items-center gap-2 text-sm">
      <span className="text-[#0397AE]">✓</span>
      <span>{item}</span>
    </li>
  ))}
</ul>
              <b className="flex items-end gap-2 self-end font-semibold text-[#0397AE]">{view.buttonText} <ArrowRight size={17} /></b>
            </Link>
          ))}
        </section>
      </main>
    </div>
  )
}
