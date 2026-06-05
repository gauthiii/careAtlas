import type { LucideIcon } from 'lucide-react'
import { Bot, ExternalLink, Hospital, TowerControl, Users } from 'lucide-react'

import { PortalPage } from '../../components/portal/PortalShell'

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
    href: `${SNOW_BASE}/sys_user_list.do`,
    icon: Users,
  },
]

export function GovernanceDemoPage() {
  return (
    <PortalPage
      label="AI Governance Officer"
      title="Demo"
      intro="Launchpad for the live ServiceNow walkthrough. Each card opens its destination on the instance in a new tab."
    >
      <section className="px-6 pb-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {demoLinks.map((link) => (
            <DemoCard key={link.label} link={link} />
          ))}
        </div>
      </section>
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
