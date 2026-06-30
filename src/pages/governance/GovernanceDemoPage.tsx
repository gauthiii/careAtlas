import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Bot, CalendarDays, ExternalLink, Hospital, HeartPulse, TowerControl, Users, ScanSearch, ShieldAlert, Scale, Radar, Activity, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PortalPage } from '../../components/portal/PortalShell'
import { PatientLifecycleModal } from '../../components/governance/PatientLifecycleModal'
import { HallucinationDetectorDemo } from '../../components/governance/HallucinationDetectionDemo'

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
      title="Demo Hub"
      intro="Launchpad for the live ServiceNow walkthrough. Explore the application pipeline, ServiceNow instances, and individual Use-Case pages below."
    >
      <section className="px-6 pb-6">
        {/* Application pipeline launcher */}
        <button
          type="button"
          onClick={() => setPipelineOpen(true)}
          title="View the end-to-end secure patient lifecycle pipeline"
          className="group mb-6 flex w-full items-center gap-4 rounded-xl border border-[#cfe0ea] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#143A57]"
        >
          <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-[#0397AE] text-white">
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
          className="group mb-5 flex w-full items-center gap-4 rounded-xl border border-[#cfe0ea] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#143A57]"
        >
          <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-[#0397AE] text-white">
            <CalendarDays size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-[#102033]">Agenda &mdash; Jun 19</div>
            <p className="mt-0.5 text-sm leading-snug text-[#53687b]">
              Full walkthrough of everything built: portals, auth, tables, agent pipeline, A2A, ACL, shadow discovery, and AI Control Tower lifecycle.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#143A57] px-4 py-2 text-sm font-bold text-white transition group-hover:bg-[#1d4d73]">
            View agenda <ArrowRight size={16} />
          </span>
        </Link>
        <div className="mt-10 mb-4">
            <h2 className="m-0 text-lg font-bold text-[#102033]">ServiceNow Instances</h2>
            <p className="m-0 mt-0.5 text-sm leading-snug text-[#53687b]">
              Quick links to tables and dashboards on the live instance.
            </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {demoLinks.map((link) => (
            <DemoCard key={link.label} link={link} />
          ))}
        </div>
        {/* Focus Five — Individual Use-Case Pages */}
        <div className="mt-10">
          <div className="mb-4">
            <h2 className="m-0 text-lg font-bold text-[#102033]">Governance Use Cases</h2>
            <p className="m-0 mt-0.5 text-sm leading-snug text-[#53687b]">
              Explore the core governance use cases. Each page contains its animated workflow and interactive guardrail demo. Consent &amp; Purpose opens its workflow inline.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Link to="/governance/demo/privacy" className="group flex flex-col rounded-xl border border-[#cfe0ea] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#143A57]">
              <div className="flex items-center gap-3 mb-3">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]">
                  <ScanSearch size={20} />
                </span>
                <span className="text-base font-bold text-[#102033]">Privacy</span>
              </div>
              <p className="text-sm text-[#53687b] flex-1">Sensitive Information Disclosure (OWASP LLM02)</p>
            </Link>

            <Link to="/governance/demo/risk" className="group flex flex-col rounded-xl border border-[#cfe0ea] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#143A57]">
              <div className="flex items-center gap-3 mb-3">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]">
                  <ShieldAlert size={20} />
                </span>
                <span className="text-base font-bold text-[#102033]">Risk</span>
              </div>
              <p className="text-sm text-[#53687b] flex-1">Excessive Agency via ACL Least-Privilege (OWASP LLM06)</p>
            </Link>

            <Link to="/governance/demo/regulation" className="group flex flex-col rounded-xl border border-[#cfe0ea] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#143A57]">
              <div className="flex items-center gap-3 mb-3">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]">
                  <Scale size={20} />
                </span>
                <span className="text-base font-bold text-[#102033]">Regulation</span>
              </div>
              <p className="text-sm text-[#53687b] flex-1">NIST AI RMF Conformance + AI Impact Assessment</p>
            </Link>

            <Link to="/governance/demo/security" className="group flex flex-col rounded-xl border border-[#cfe0ea] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#143A57]">
              <div className="flex items-center gap-3 mb-3">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]">
                  <Radar size={20} />
                </span>
                <span className="text-base font-bold text-[#102033]">Security</span>
              </div>
              <p className="text-sm text-[#53687b] flex-1">Prompt-Injection Defense + Output Patterns (OWASP LLM01)</p>
            </Link>

            <Link to="/governance/demo/fairness" className="group flex flex-col rounded-xl border border-[#cfe0ea] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#143A57]">
              <div className="flex items-center gap-3 mb-3">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]">
                  <Activity size={20} />
                </span>
                <span className="text-base font-bold text-[#102033]">Fairness</span>
              </div>
              <p className="text-sm text-[#53687b] flex-1">Non-Discriminatory Scheduling (NIST AI RMF · Harmful Bias)</p>
            </Link>

            {/* Consent & Purpose — dedicated page (workflow modal + incidents table live there) */}
            <Link to="/governance/demo/consent" className="group flex flex-col rounded-xl border border-[#cfe0ea] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#143A57]">
              <div className="flex items-center gap-3 mb-3">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]">
                  <ShieldCheck size={20} />
                </span>
                <span className="text-base font-bold text-[#102033]">Consent &amp; Purpose</span>
              </div>
              <p className="text-sm text-[#53687b] flex-1">Consent &amp; Purpose-of-Use Enforcement — the AI only sees what you said it could</p>
            </Link>
          </div>

          <div className="mt-6">
            <HallucinationDetectorDemo />
          </div>
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
      className="group relative flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-xl border border-[#d7e5ec] bg-white p-6 text-center transition hover:-translate-y-0.5 hover:border-[#143A57] hover:shadow-[0_14px_30px_rgba(25,64,93,0.12)]"
    >
      <ExternalLink
        size={16}
        className="absolute right-4 top-4 text-[#9fb2c0] transition group-hover:text-[#143A57]"
      />

      <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]">
        <Icon size={20} />
      </span>

      <div>
        <div className="text-lg font-bold text-[#102033]">{link.label}</div>
        <p className="mt-1 text-sm leading-snug text-[#53687b]">{link.description}</p>
      </div>
    </a>
  )
}
