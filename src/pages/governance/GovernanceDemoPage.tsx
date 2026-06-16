import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Bot, CalendarDays, ExternalLink, Hospital, HeartPulse, TowerControl, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PortalPage } from '../../components/portal/PortalShell'
import { PatientLifecycleModal } from '../../components/governance/PatientLifecycleModal'

const SNOW_BASE = 'https://ven04690.service-now.com'

type DemoLink = {
  label: string
  description: string
  href: string
  icon: LucideIcon
}

const demoLinks: DemoLink[] = [
  {
    label: 'Instance',
    description: 'Open the ServiceNow instance home',
    href: SNOW_BASE,
    icon: Hospital,
  },
  {
    label: 'AI Agents',
    description: 'AI Agent Studio · Create and manage',
    href: `${SNOW_BASE}/now/agent-studio/create-manage/`,
    icon: Bot,
  },
  {
    label: 'AI Control Tower',
    description: 'Mission control for managed AI assets',
    href: `${SNOW_BASE}/now/ai-control-tower/home`,
    icon: TowerControl,
  },
  {
    label: 'System Users',
    description: 'sys_user list — service & human accounts',
    href: `${SNOW_BASE}/now/nav/ui/classic/params/target/sys_user_list.do`,
    icon: Users,
  },
    {
    label: 'Roles',
    description: 'sys_user_role list — roles and permissions',
    href: `${SNOW_BASE}/now/nav/ui/classic/params/target/sys_user_role_list.do`,
    icon: Users,
  },
    {
    label: 'Groups',
    description: 'sys_user_group list — user groups and memberships',
    href: `${SNOW_BASE}/now/nav/ui/classic/params/target/sys_user_group_list.do`,
    icon: Users,
  },
      {
    label: 'Access Control (ACL) Rules',
    description: 'sys_security_acl list — access control rules',
    href: `${SNOW_BASE}/now/nav/ui/classic/params/target/sys_security_acl_list.do`,
    icon: Users,
  },
]

export function GovernanceDemoPage() {
  const [pipelineOpen, setPipelineOpen] = useState(false)

  return (
    <PortalPage
      label="AI Governance Officer"
      title="Demo"
      intro="Launchpad for the live ServiceNow walkthrough. Each card opens its destination on the instance in a new tab."
    >
      <section className="px-6 pb-6">
        {/* Application pipeline launcher */}
        <button
          type="button"
          onClick={() => setPipelineOpen(true)}
          title="View the end-to-end secure patient lifecycle pipeline"
          className="group mb-6 flex w-full items-center gap-4 rounded-xl border border-[#cfe0ea] bg-gradient-to-r from-[#e7f3f8] to-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#143A57] hover:shadow-[0_14px_30px_rgba(25,64,93,0.12)]"
        >
          <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-[#143A57] text-white">
            <HeartPulse size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-[#102033]">Application Pipeline</div>
            <p className="mt-0.5 text-sm leading-snug text-[#53687b]">
              Animated end-to-end patient lifecycle — Registration → Booking → Encounter → Discharge —
              with the governing AI agent and table at every hand-off.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#143A57] px-4 py-2 text-sm font-bold text-white transition group-hover:bg-[#1d4d73]">
            View pipeline <ArrowRight size={16} />
          </span>
        </button>

        {/* Agenda card */}
        <Link
          to="/governance/agenda"
          className="group mb-5 flex w-full items-center gap-4 rounded-xl border border-[#cfe0ea] bg-gradient-to-r from-[#f0ebff] to-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#6d28d9] hover:shadow-[0_14px_30px_rgba(109,40,217,0.10)]"
        >
          <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-[#6d28d9] text-white">
            <CalendarDays size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-[#102033]">Agenda &mdash; Jun 19</div>
            <p className="mt-0.5 text-sm leading-snug text-[#53687b]">
              Full walkthrough of everything built: portals, auth, tables, agent pipeline, A2A, ACL, shadow discovery, and AI Control Tower lifecycle.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#6d28d9] px-4 py-2 text-sm font-bold text-white transition group-hover:bg-[#5b21b6]">
            View agenda <ArrowRight size={16} />
          </span>
        </Link>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {demoLinks.map((link) => (
            <DemoCard key={link.label} link={link} />
          ))}
        </div>
      </section>

      <PatientLifecycleModal open={pipelineOpen} onClose={() => setPipelineOpen(false)} />
    </PortalPage>
  )
}

function DemoCard({ link }: { link: DemoLink }) {
  const Icon = link.icon

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex aspect-square flex-col items-center justify-center gap-4 rounded-xl border border-[#d7e5ec] bg-white p-6 text-center transition hover:-translate-y-0.5 hover:border-[#143A57] hover:shadow-[0_14px_30px_rgba(25,64,93,0.12)]"
    >
      <ExternalLink
        size={16}
        className="absolute right-4 top-4 text-[#9fb2c0] transition group-hover:text-[#143A57]"
      />

      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#e7f3f8] text-[#0f5f8c]">
        <Icon size={30} />
      </span>

      <div>
        <div className="text-lg font-bold text-[#102033]">{link.label}</div>
        <p className="mt-1 text-sm leading-snug text-[#53687b]">{link.description}</p>
      </div>
    </a>
  )
}
