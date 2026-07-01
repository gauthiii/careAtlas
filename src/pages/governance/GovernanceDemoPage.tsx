import { useState } from 'react'
import { ArrowRight, CalendarDays, HeartPulse, ScanSearch, ShieldAlert, Scale, Radar, Activity, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmbeddedPortalProvider, PortalPage } from '../../components/portal/PortalShell'
import { PatientLifecycleModal } from '../../components/governance/PatientLifecycleModal'
import { GovernancePrivacyPage } from './demo/PrivacyPage'
import { GovernanceRiskPage } from './demo/RiskPage'
import { GovernanceRegulationPage } from './demo/RegulationPage'
import { GovernanceSecurityPage } from './demo/SecurityPage'
import { GovernanceFairnessPage } from './demo/FairnessPage'
import { GovernanceConsentPage } from './demo/ConsentPage'
import { GovernanceHallucinationPage } from './demo/HallucinationPage'

const USE_CASE_TABS = [
  { id: 'privacy',      label: 'Privacy',             icon: ScanSearch,   Component: GovernancePrivacyPage },
  { id: 'risk',         label: 'Risk',                icon: ShieldAlert,  Component: GovernanceRiskPage },
  { id: 'regulation',   label: 'Regulation',          icon: Scale,        Component: GovernanceRegulationPage },
  { id: 'security',     label: 'Security',            icon: Radar,        Component: GovernanceSecurityPage },
  { id: 'fairness',     label: 'Fairness',            icon: Activity,     Component: GovernanceFairnessPage },
  { id: 'consent',      label: 'Consent & Purpose',   icon: ShieldCheck,  Component: GovernanceConsentPage },
  { id: 'hallucination',label: 'AI Output Integrity', icon: Activity,     Component: GovernanceHallucinationPage },
] as const

type UseCaseTabId = typeof USE_CASE_TABS[number]['id']

/* ServiceNow Instances section — hidden for now
const SNOW_BASE = 'https://ven04690.service-now.com'

type DemoLink = {
  label: string
  description: string
  href: string
  icon: LucideIcon
}

const demoLinks: DemoLink[] = [
  { label: 'Instance', description: 'Open the ServiceNow instance home', href: SNOW_BASE, icon: Hospital },
  { label: 'AI Agents', description: 'AI Agent Studio · Create and manage', href: `${SNOW_BASE}/now/agent-studio/create-manage/`, icon: Bot },
  { label: 'AI Control Tower', description: 'Mission control for managed AI assets', href: `${SNOW_BASE}/now/ai-control-tower/home`, icon: TowerControl },
  { label: 'System Users', description: 'sys_user list — service & human accounts', href: `${SNOW_BASE}/now/nav/ui/classic/params/target/sys_user_list.do`, icon: Users },
  { label: 'Roles', description: 'sys_user_role list — roles and permissions', href: `${SNOW_BASE}/now/nav/ui/classic/params/target/sys_user_role_list.do`, icon: Users },
  { label: 'Groups', description: 'sys_user_group list — user groups and memberships', href: `${SNOW_BASE}/now/nav/ui/classic/params/target/sys_user_group_list.do`, icon: Users },
  { label: 'Access Control (ACL) Rules', description: 'sys_security_acl list — access control rules', href: `${SNOW_BASE}/now/nav/ui/classic/params/target/sys_security_acl_list.do`, icon: Users },
]
*/

export function GovernanceDemoPage() {
  const [pipelineOpen, setPipelineOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<UseCaseTabId | null>(null)

  const activeUseCase = USE_CASE_TABS.find(t => t.id === activeTab) ?? null

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
        {/* ServiceNow Instances — hidden for now
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
        */}
        {/* Governance Use Cases — tab nav */}
        <div className="mt-10">
          <div className="mb-4">
            <h2 className="m-0 text-lg font-bold text-[#102033]">Governance Use Cases</h2>
            <p className="m-0 mt-0.5 text-sm leading-snug text-[#53687b]">
              Select a use case to explore its animated workflow and interactive guardrail demo inline.
            </p>
          </div>

          {/* Tab nav — same pill style as Audit Log page */}
          <div className="flex flex-wrap gap-1 rounded-2xl border border-[#cfe0ea] bg-[#f5f9fb] p-1">
            {USE_CASE_TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition ${
                    activeTab === tab.id
                      ? 'bg-[#143A57] text-white shadow-sm'
                      : 'text-[#53687b] hover:text-[#102033]'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Inline content */}
          {activeUseCase === null ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#cfe0ea] bg-[#f8fbfc] px-6 py-10 text-center text-sm text-[#53687b]">
              Select a use case above to view it here.
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-[#cfe0ea] overflow-hidden">
              <EmbeddedPortalProvider>
                <activeUseCase.Component />
              </EmbeddedPortalProvider>
            </div>
          )}
        </div>

        {/*
        === USE CASE CARDS (commented out — replaced by tab nav above) ===
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/governance/demo/privacy" ...>Privacy</Link>
          <Link to="/governance/demo/risk" ...>Risk</Link>
          <Link to="/governance/demo/regulation" ...>Regulation</Link>
          <Link to="/governance/demo/security" ...>Security</Link>
          <Link to="/governance/demo/fairness" ...>Fairness</Link>
          <Link to="/governance/demo/consent" ...>Consent & Purpose</Link>
          <Link to="/governance/demo/hallucination" ...>AI Output Integrity</Link>
        </div>
        */}

      </section>

      <PatientLifecycleModal open={pipelineOpen} onClose={() => setPipelineOpen(false)} />
    </PortalPage>
  )
}

/* DemoCard — hidden with ServiceNow Instances section
function DemoCard({ link }: { link: { label: string; description: string; href: string; icon: React.ElementType } }) {
  const Icon = link.icon
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer"
      className="group relative flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-xl border border-[#d7e5ec] bg-white p-6 text-center transition hover:-translate-y-0.5 hover:border-[#143A57]">
      <ExternalLink size={16} className="absolute right-4 top-4 text-[#9fb2c0] transition group-hover:text-[#143A57]" />
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#e7f3f8] text-[#0f5f8c]"><Icon size={20} /></span>
      <div>
        <div className="text-lg font-bold text-[#102033]">{link.label}</div>
        <p className="mt-1 text-sm leading-snug text-[#53687b]">{link.description}</p>
      </div>
    </a>
  )
}
*/
