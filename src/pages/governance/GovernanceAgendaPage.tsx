import {
  Bell,
  BellRing,
  Bot,
  Brain,
  CheckCircle2,
  Database,
  Eye,
  Fingerprint,
  Globe,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Network,
  PanelLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TowerControl,
  Users,
  Workflow,
} from 'lucide-react'
import {
  Download,
  Loader2,
  RectangleHorizontal,
  RectangleVertical,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef, useState } from 'react'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'

import { PortalPage } from '../../components/portal/PortalShell'
import { cn } from '../../lib/cn'

type Orientation = 'portrait' | 'landscape'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgendaSection {
  id: string
  number: string
  title: string
  subtitle: string
  icon: typeof Bot
  items: AgendaItem[]
  // 'planned' shows an amber "Planned" badge instead of the green "Done" badge.
  status?: 'done' | 'planned'
  // Optional lead paragraph rendered above the item rows.
  lead?: string
}

interface AgendaItem {
  label: string
  detail: string
  done?: boolean
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SECTIONS: AgendaSection[] = [
  {
    id: 'portals',
    number: '01',
    title: 'Three-Portal Frontend',
    subtitle: 'Patient · Clinician · AI Governance Officer',
    icon: LayoutDashboard,
    items: [
      { label: 'Patient Portal', detail: 'Landing, Registration, Email Verification, Sign-In, Dashboard, Appointment Booking, Profile', done: true },
      { label: 'Clinician Portal', detail: 'Staff Sign-In, Doctor Dashboard, Admin Dashboard, Patient Records, Availability Calendar, Doctor Profile', done: true },
      { label: 'Governance Portal', detail: 'Dashboard, AI Agents, ACL, Demo, Agenda — protected behind a dedicated governance auth layer', done: true },
    ],
  },
  {
    id: 'auth',
    number: '02',
    title: 'Authentication & MFA',
    subtitle: 'TOTP-based multi-factor auth via authenticator apps',
    icon: KeyRound,
    items: [
      { label: 'Patient login', detail: 'ServiceNow sys_user validated via REST, session stored in React context', done: true },
      { label: 'Clinician login', detail: 'Separate credential store, role-gated routes for doctor vs admin views', done: true },
      { label: 'Governance login', detail: 'Passcode-protected governance portal with override login for demo', done: true },
      { label: 'MFA / TOTP', detail: 'TOTP authenticator app configured — time-based one-time password on sign-in flow', done: true },
    ],
  },
  {
    id: 'tables',
    number: '03',
    title: 'ServiceNow Tables',
    subtitle: 'Custom tables wired to all app data',
    icon: Database,
    items: [
      { label: 'u_careatlas_patient', detail: 'Patient registration records — demographics, health condition, insurance, consent', done: true },
      { label: 'u_careatlas_doctor', detail: 'Clinician roster — speciality, department, availability slots', done: true },
      { label: 'u_careatlas_appointment', detail: 'Booking records — patient ↔ doctor mapping, date/time, visit type, status', done: true },
      { label: 'u_summary_notes', detail: 'Clinician summary notes per appointment — patient ↔ doctor ↔ appointment, note text, logged-by', done: true },
      { label: 'u_notification_reminders', detail: 'Activity notifications for patients & clinicians, created via the metadata API (see section 10)', done: true },
      { label: 'u_ai_decision_log', detail: 'Audit trail of every AI scheduling decision — confidence score, model version, slots considered', done: true },
      { label: 'sn_aia_agent (built-in)', detail: 'AI Agent Studio registry — all agents inventory via AI Control Tower', done: true },
      { label: 'alm_ai_system_digital_asset', detail: 'Managed vs unmanaged AI asset lifecycle tracking', done: true },
    ],
  },
  {
    id: 'agents',
    number: '04',
    title: 'AI Agent Pipeline',
    subtitle: 'ServiceNow AI Agent Studio — multi-agent orchestration',
    icon: Brain,
    items: [
      { label: 'Schedule Appointment Agent', detail: 'Books patient appointments via conversational AI — reads availability, writes booking record', done: true },
      { label: 'Rogue Agent', detail: 'Unrestricted agent with no ACL — used in ACL demo to show PII leakage risk', done: true },
      { label: 'Patient Data Agent', detail: 'Reads and summarises patient health records', done: true },
      { label: 'Fairness Monitor Agent', detail: 'Audits scheduling decisions for demographic bias', done: true },
      { label: 'Create Patients Agent', detail: 'Handles bulk patient onboarding workflow', done: true },
      { label: 'Multi-agent strategy', detail: 'Agents chained via ServiceNow native orchestration — each agent hands off context_id / task_id', done: true },
    ],
  },
  {
    id: 'a2a',
    number: '05',
    title: 'A2A Protocol',
    subtitle: 'Agent-to-Agent communication via ServiceNow OAuth 2.0',
    icon: Network,
    items: [
      { label: 'A2A enabled on agents', detail: 'Third-party access + discoverability toggled on in AI Agent Studio for each agent', done: true },
      { label: 'OAuth 2.0 client credentials', detail: 'SNOW_A2A_CLIENT_ID + SNOW_A2A_CLIENT_SECRET configured — token cached with skew buffer', done: true },
      { label: 'Blocking message/send', detail: 'Synchronous A2A call — `configuration: {blocking: true}` — no public callback URL needed', done: true },
      { label: 'Context continuity', detail: 'context_id + task_id threaded across turns for multi-turn conversations', done: true },
      { label: 'Endpoint', detail: '/api/sn_aia/a2a/v2/agent/id/{sys_id} — JSON-RPC 2.0 over HTTPS', done: true },
    ],
  },
  {
    id: 'acl',
    number: '06',
    title: 'ACL & Non-Human Identities',
    subtitle: 'Row-level access control on every sensitive table',
    icon: Lock,
    items: [
      { label: 'Non-human service account', detail: 'Dedicated sys_user service account for all API reads — never a human login credential', done: true },
      { label: 'ACL rules on patient table', detail: 'Read/write ACL on u_careatlas_patient — only authorised roles can access PII fields', done: true },
      { label: 'ACL rules on appointment table', detail: 'Booking records scoped to treating clinician and patient — no cross-tenant leakage', done: true },
      { label: 'Agent-level ACL', detail: 'Good Scheduling Agent runs under a restricted identity — cannot return raw PII', done: true },
      { label: 'Rogue agent (no ACL)', detail: 'Rogue Agent has no ACL restrictions — demonstrates unrestricted data access in the demo', done: true },
    ],
  },
  {
    id: 'acl-test',
    number: '07',
    title: 'ACL Testing — Good vs Rogue Agent',
    subtitle: 'Live side-by-side comparison in the Governance ACL page',
    icon: ShieldAlert,
    items: [
      { label: 'Service account ACL test', detail: 'POST /api/acl/test runs allowed/denied checks against all sensitive tables and returns pass/fail per field', done: true },
      { label: 'Good Scheduling Agent panel', detail: 'Runs a real A2A call then always returns the refusal message — enforced by ACL at the agent level', done: true },
      { label: 'Rogue Agent panel', detail: 'Runs unconstrained — returns raw patient PII including phone, DOB, address when asked', done: true },
      { label: 'Compare modal', detail: 'Side-by-side chat window on the ACL page — same question, two agents, starkly different outputs', done: true },
    ],
  },
  {
    id: 'shadow',
    number: '08',
    title: 'Shadow AI Discovery',
    subtitle: 'Unmanned AI detection via AI Control Tower',
    icon: Eye,
    items: [
      { label: 'Managed AI Assets table', detail: 'alm_ai_system_digital_asset — assets with an assigned owner (managed_by set)', done: true },
      { label: 'Unmanaged AI Assets table', detail: 'Same table filtered to assets with no owner — shadow AI candidates', done: true },
      { label: 'Filterable inventory', detail: 'Column chooser, sort, and multi-field filter on both managed and unmanaged tables in the AI Agents page', done: true },
      { label: 'Lifecycle status badges', detail: 'Deployed / Under Review / Ready / Assessment / Retired — colour-coded per asset', done: true },
    ],
  },
  {
    id: 'lifecycle',
    number: '09',
    title: 'AI Control Tower Lifecycle',
    subtitle: 'Full unmanaged → managed promotion workflow',
    icon: TowerControl,
    items: [
      { label: 'Lifecycle stages', detail: 'Assessment → Review → Ready → Deployed → Retired — tracked in alm_ai_system_digital_asset.life_cycle_stage', done: true },
      { label: 'Promotion from unmanaged', detail: 'Shadow AI asset assigned an owner + lifecycle stage to move from unmanaged to managed inventory', done: true },
      { label: 'End-to-end workflow modal', detail: 'Animated pipeline in the Demo page shows the full patient journey with AI agent and table at every handoff', done: true },
      { label: 'AI Agent Inventory', detail: 'sn_aia_agent table surfaced in Governance portal — each agent expandable with role, strategy, proficiency, instructions', done: true },
      { label: 'Live chat from inventory', detail: 'Every agent in the inventory has a Chat button that opens a real A2A conversation drawer', done: true },
    ],
  },
  {
    id: 'notifications',
    number: '10',
    title: 'Notification Reminders',
    subtitle: 'Activity feed for patients & clinicians — new ServiceNow table',
    icon: BellRing,
    items: [
      { label: 'u_notification_reminders table', detail: 'New table created live via the metadata API (sys_db_object + sys_dictionary) — audience, type, message, patient/doctor/appointment/summary-note references, per-audience read flags and event time', done: true },
      { label: 'Backend event logging', detail: 'Every operation logs a notification — registration complete/approved/rejected, appointment created/confirmed/cancelled/completed, summary note added/updated — best-effort so it never breaks the primary write', done: true },
      { label: 'Scoped feeds + API', detail: 'GET /api/notifications and PATCH /…/read; patient sees their own, clinician sees their appointments/notes plus unassigned staff events, with an "All / Only mine" tab', done: true },
      { label: 'Bell widget + pages', detail: 'Header bell with unread badge and dropdown on patient & clinician portals, plus a dedicated notifications page with expandable rows and mark-as-read', done: true },
      { label: 'History backfill', detail: '257 notifications backfilled from existing appointments, summary notes and registrations so the feeds are populated on first login', done: true },
    ],
  },
  {
    id: 'ux-sidebar',
    number: '11',
    title: 'Sidebar Navigation & UX',
    subtitle: 'Full-height left sidebar across all three portals',
    icon: PanelLeft,
    items: [
      { label: 'Two-pane app layout', detail: 'Center top-nav replaced with a fixed full-height left sidebar (brand on top, nav in the middle, sign-out at the bottom) via a shared SidebarLayout used by all three portals', done: true },
      { label: 'Sign-out relocated', detail: 'Sign-out moved into the sidebar footer and removed from every dashboard header — one consistent place to log out', done: true },
      { label: 'Persistent top bar', detail: 'Slim content-pane top bar keeps the portal switcher and the notification bell reachable from every page', done: true },
      { label: 'Responsive', detail: 'Below 860px the sidebar collapses into a horizontal scroll strip so navigation is preserved on tablet and mobile', done: true },
    ],
  },
  {
    id: 'demo-plan',
    number: '12',
    title: 'What Needs To Be Done',
    subtitle: 'Three distinct OWASP LLM Top-10 (2025) risks — detected, prevented, governed',
    icon: ShieldAlert,
    status: 'planned',
    lead:
      'Demonstrate three distinct OWASP LLM Top-10 (2025) risks against the CareAtlas healthcare workflow and show each one being detected, prevented, and governed using AI Control Tower (AICT) and AI Risk and Compliance (AIRC), with the before/after evidence surfaced live in the existing AI Governance portal. The three risks are locked — each maps to a different ServiceNow mechanism, so the demo shows three genuinely different controls, not one control three times.',
    items: [
      { label: 'Three genuinely different controls', detail: 'Each risk maps to a separate ServiceNow mechanism — Gen AI Guardian guardrails, least-privilege non-human identity + ACLs, and field-level PII denial — never one control reused three times.' },
      { label: 'Detect → prevent → govern', detail: 'Each risk is caught and blocked at runtime, then wrapped in an AIRC governance artefact (risk statement, AI Case, or AI impact assessment).' },
      { label: 'Live before/after evidence', detail: 'Proof is surfaced in the existing AI Governance portal — e.g. the LLM02 audit log already wired to u_ai_action_audit_log.' },
    ],
  },
]

// The three locked OWASP risks for section 12 — rendered as a 4-column table.
interface DemoRisk {
  ref: string
  risk: string
  accent: string
  bg: string
  surface: string
  mechanism: string
  airc: string
}

const DEMO_RISKS: DemoRisk[] = [
  {
    ref: 'A',
    risk: 'LLM01 — Prompt Injection',
    accent: '#0f5f8c',
    bg: '#e7f3f8',
    surface: 'Patient-supplied free text (u_reason_text, booking “concern”, contact message) consumed by the triage / summary agents',
    mechanism: 'Now Assist / Gen AI Guardian controls (sys_gen_ai_control, sys_gen_ai_guardian_provider, sn_ai_governance_automation_rule)',
    airc: 'AIRC risk statement “Adversarial Attacks”; AI Case on trigger',
  },
  {
    ref: 'B',
    risk: 'LLM06 — Excessive Agency',
    accent: '#6d28d9',
    bg: '#f0ebff',
    surface: 'A2A agents acting on u_patient / u_appointment beyond their job (e.g. scheduling agent reading PII or writing clinical notes)',
    mechanism: 'Non-human identity least-privilege: scoped service accounts + ACLs + human-approval gate on /agents/execute',
    airc: 'AIRC risk “Unauthorized Access to AI Models”; control attestation',
  },
  {
    ref: 'C',
    risk: 'LLM02 — Sensitive Information Disclosure',
    accent: '#b42318',
    bg: '#fdeceb',
    surface: 'Agents / decision-log leaking patient PII (name, DOB, email, phone, insurance)',
    mechanism: 'Field-level ACL denial of PII + data-privacy guardrail + anonymized audit (u_ai_decision_log.u_patient_id_anon)',
    airc: 'AIRC risk “Privacy Violations / Inadequate Data Protection”; FRIA / AI impact assessment',
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GovernanceAgendaPage() {
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [exporting, setExporting] = useState(false)
  const [activeTabId, setActiveTabId] = useState(SECTIONS[0].id)

  const activeSection = SECTIONS.find((s) => s.id === activeTabId) || SECTIONS[0]

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    try {
      const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4', compress: true })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 28

      const pages = pageRefs.current.filter(Boolean) as HTMLDivElement[]
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
        })
        const img = canvas.toDataURL('image/jpeg', 0.85)
        const availW = pageW - margin * 2
        const availH = pageH - margin * 2
        const ratio = Math.min(availW / canvas.width, availH / canvas.height)
        const w = canvas.width * ratio
        const h = canvas.height * ratio
        if (i > 0) pdf.addPage()
        pdf.addImage(img, 'JPEG', (pageW - w) / 2, margin, w, h)
      }

      pdf.save(`careatlas-agenda-${orientation}.pdf`)
    } catch (err) {
      console.error('Agenda PDF export failed', err)
    } finally {
      setExporting(false)
    }
  }

  const Banner = () => (
    <div className="flex items-center gap-4 rounded-2xl border border-[#0397AE] p-5 text-[#0397AE]">
      <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl">
        <Sparkles size={28} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[0.72rem] font-bold uppercase tracking-widest">Demo day</div>
        <div className="text-2xl font-bold tracking-tight">June 20, 2026</div>
        <div className="mt-0.5 text-sm">
          CareAtlas &mdash; AI-Native Healthcare Platform on ServiceNow
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold mb-3 border border-[#0397AE] rounded-xl">
          {SECTIONS.length} sections
        </div>
        <div className="rounded-full px-3 py-1 text-xs font-bold border border-[#0397AE] rounded-xl">
          All complete
        </div>
      </div>
    </div>
  )

  return (
    <PortalPage
      label="AI Governance Officer"
      title="Agenda — June 20"
      intro="A scrollable walkthrough of everything built and configured for the June 20 demo. Each section maps to a live area of the application."
    >
      <section className="min-w-0 px-6 pb-10">
        {/* Export toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cfe0ea] bg-white px-4 py-3 shadow-[0_4px_16px_rgba(25,64,93,0.07)]">
          <div className="min-w-0">
            <div className="text-sm font-black text-[#102033]">Export Agenda</div>
            <div className="text-xs text-[#53687b]">
              Saves all {SECTIONS.length} sections as a {SECTIONS.length}-page PDF — the title and agenda nav share the first page.
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Orientation toggle */}
            <div className="flex items-center rounded-xl border border-[#cfe0ea] !text-[14px] !font-bold bg-[#f5f9fb] p-0.5">
              {(
                [
                  { value: 'portrait', label: 'Portrait', icon: RectangleVertical },
                  { value: 'landscape', label: 'Landscape', icon: RectangleHorizontal },
                ] as const
              ).map((opt) => {
                const OptIcon = opt.icon
                const active = orientation === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOrientation(opt.value)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition',
                      active
                        ? 'bg-[#143A57] text-white shadow-sm'
                        : 'text-[#53687b] hover:text-[#102033]',
                    )}
                  >
                    <OptIcon size={14} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
            {/* Export button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl border border-[#143A57] px-4 py-2 !text-[14px] !font-bold text-[#143A57]"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Display Banner */}
        <div className="mb-8">
          <Banner />
        </div>

        {/* Agenda nav — Tabs */}
        <div className="mb-8 flex flex-wrap gap-1.5">
          {SECTIONS.map((s) => {
            const isActive = activeTabId === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveTabId(s.id)}
                className="flex flex-shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 text-center transition hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  backgroundColor: isActive ? "#143A57" : " ",
                }}
              >
                <span className="text-[11px] font-bold tracking-widest opacity-90" style={{ color: isActive ? 'white' : "#143a57" }}>
                  {s.number}
                </span>
                <span className="text-[11px] font-bold leading-tight" style={{ color: isActive ? 'white' : "#143A57", maxWidth: 72 }}>
                  {s.title}
                </span>
              </button>
            )
          })}
        </div>

        {/* Active Tab Content */}
        <div className="min-h-[400px]">
          <AgendaCard section={activeSection} />
        </div>

        {/* Hidden Container for PDF Export */}
        <div className="fixed left-[-9999px] top-0 w-[900px] pointer-events-none">
          <div ref={(el) => { pageRefs.current[0] = el }} className="bg-white p-10 space-y-8">
            <Banner />
            <AgendaCard section={SECTIONS[0]} />
          </div>
          {SECTIONS.slice(1).map((section, i) => (
            <div key={section.id} ref={(el) => { pageRefs.current[i + 1] = el }} className="bg-white p-10">
              <AgendaCard section={section} />
            </div>
          ))}
        </div>
      </section>
    </PortalPage>
  )
}

// ---------------------------------------------------------------------------
// Agenda card
// ---------------------------------------------------------------------------

function AgendaCard({
  section,
  cardRef,
}: {
  section: AgendaSection
  cardRef?: (el: HTMLDivElement | null) => void
}) {
  const Icon = section.icon

  return (
    <div
      ref={cardRef}
      id={section.id}
      className="scroll-mt-24 overflow-hidden rounded-2xl border bg-white shadow-[0_4px_16px_rgba(25,64,93,0.07)]"
      style={{ borderColor: "#cfe0ea"}}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-4 border-b px-6 py-4"
        style={{ borderColor: "#cfe0ea"}}
      >
        <span
          className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-[#0397AE]"
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-[16px] font-bold tracking-widest text-[#0397AE]"
            >
              {section.number}
            </span>
            <h2 className="text-base font-bold text-[#0397AE]">{section.title}</h2>
            {section.status === 'planned' ? <PlannedBadge /> : <CheckBadge />}
          </div>
          <p className="text-xs text-[#53687b]">{section.subtitle}</p>
        </div>
      </div>

      {/* Optional lead paragraph (e.g. the demo objective) */}
      {section.lead && (
        <div className="border-b border-[#f0f5f8] px-6 py-4">
          <div className="mb-1 text-[0.62rem] font-black uppercase tracking-widest">
            Objective
          </div>
          <p className="text-sm leading-relaxed text-[#3c4f60]">{section.lead}</p>
        </div>
      )}

      {/* Items */}
      <div className="divide-y divide-[#f0f5f8]">
        {section.items.map((item, i) => (
          <AgendaItemRow key={i} item={item} />
        ))}
      </div>

      {/* Mock UI strip */}
      <MockUiStrip section={section} />
    </div>
  )
}

function CheckBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.62rem] font-bold text-emerald-700">
      <CheckCircle2 size={10} />
      Done
    </span>
  )
}

function PlannedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[0.62rem] font-bold text-amber-700">
      <Workflow size={10} />
      Planned
    </span>
  )
}

function AgendaItemRow({ item}: { item: AgendaItem; }) {
  return (
    <div className="flex items-start gap-3 px-6 py-3.5">
      <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-bold text-[#102033]">{item.label}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-[#53687b]">{item.detail}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mock UI strips — lightweight visual reference per section
// ---------------------------------------------------------------------------

function MockUiStrip({ section }: { section: AgendaSection }) {
  switch (section.id) {
    case 'portals': return <PortalsMock />
    case 'auth': return <AuthMock />
    case 'tables': return <TablesMock />
    case 'agents': return <AgentsMock />
    case 'a2a': return <A2aMock />
    case 'acl': return <AclMock />
    case 'acl-test': return <AclTestMock />
    case 'shadow': return <ShadowMock />
    case 'lifecycle': return <LifecycleMock />
    case 'notifications': return <NotificationsMock />
    case 'ux-sidebar': return <SidebarMock />
    case 'demo-plan': return <RiskPlanMock />
    default: return null
  }
}

function RiskPlanMock() {
  return (
    <MockShell label="Three-risk demo plan — OWASP LLM Top-10 (2025)">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[0.7rem]">
          <thead>
            <tr className="border-b border-[#e3edf3] text-[0.6rem] font-black uppercase tracking-[0.05em] text-[#607487]">
              <th className="px-2 py-2 align-bottom">#</th>
              <th className="px-2 py-2 align-bottom">OWASP risk</th>
              <th className="px-2 py-2 align-bottom">CareAtlas attack surface</th>
              <th className="px-2 py-2 align-bottom">Primary ServiceNow mechanism</th>
              <th className="px-2 py-2 align-bottom">AIRC governance wrapper</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_RISKS.map((r) => (
              <tr key={r.ref} className="border-b border-[#f0f5f8] align-top last:border-b-0">
                <td className="px-2 py-3">
                  <span
                    className="grid h-6 w-6 place-items-center rounded-md text-[0.7rem] font-black text-white"
                    style={{ backgroundColor: r.accent }}
                  >
                    {r.ref}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <span
                    className="inline-block rounded-md px-2 py-1 text-[0.68rem] font-black [overflow-wrap:anywhere]"
                    style={{ color: r.accent, backgroundColor: r.bg }}
                  >
                    {r.risk}
                  </span>
                </td>
                <td className="px-2 py-3 font-semibold leading-relaxed text-[#3c4f60] [overflow-wrap:anywhere]">{r.surface}</td>
                <td className="px-2 py-3 leading-relaxed text-[#53687b] [overflow-wrap:anywhere]">{r.mechanism}</td>
                <td className="px-2 py-3 leading-relaxed text-[#53687b] [overflow-wrap:anywhere]">{r.airc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MockShell>
  )
}

function MockShell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="border-t border-[#eef3f7] bg-[#f8fbfc] px-6 py-4">
      <div className="mb-2 text-[0.62rem] font-black uppercase tracking-widest text-[#8aa0b3]">
        UI Reference
      </div>
      <div className="overflow-hidden rounded-xl border border-[#dbe6ee] bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#eef3f7] bg-[#f0f5f8] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[0.65rem] font-bold text-[#8aa0b3]">{label}</span>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

function Pill({ label, color = '#0f5f8c', bg = '#e7f3f8' }: { label: string; color?: string; bg?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold"
      style={{ color, backgroundColor: bg }}
    >
      {label}
    </span>
  )
}

// 01 — Portals
function PortalsMock() {
  const portals = [
    { label: 'Patient Portal', screens: ['Landing', 'Register', 'Sign-In', 'Dashboard', 'Book Appt', 'Profile'], color: '#0397AE', bg: '#e0f7fa' },
    { label: 'Clinician Portal', screens: ['Staff Sign-In', 'Doctor Dashboard', 'Admin Dashboard', 'Patient Records', 'Availability', 'Profile'], color: '#0f6b4f', bg: '#e8f7ef' },
    { label: 'Governance Portal', screens: ['Dashboard', 'AI Agents', 'ACL', 'Demo', 'Agenda'], color: '#143A57', bg: '#e7f3f8' },
  ]
  return (
    <MockShell label="CareAtlas — Three Portals">
      <div className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
        {portals.map((p) => (
          <div key={p.label} className="rounded-lg border p-3" style={{ borderColor: p.bg }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md text-white" style={{ backgroundColor: p.color }}>
                <Globe size={12} />
              </span>
              <span className="text-[0.72rem] font-black" style={{ color: p.color }}>{p.label}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {p.screens.map((s) => (
                <span key={s} className="rounded px-1.5 py-0.5 text-[0.6rem] font-bold" style={{ backgroundColor: p.bg, color: p.color }}>{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MockShell>
  )
}

// 02 — Auth
function AuthMock() {
  return (
    <MockShell label="Sign-In + MFA Flow">
      <div className="flex items-stretch gap-4 max-[640px]:flex-col">
        {/* Login form mock */}
        <div className="flex-1 rounded-lg border border-[#dbe6ee] p-3">
          <div className="mb-3 text-[0.72rem] font-black text-[#102033]">Sign In</div>
          <div className="mb-2 h-7 rounded border border-[#dbe6ee] bg-[#f8fbfc] px-2 py-1 text-[0.62rem] text-[#8aa0b3]">Username</div>
          <div className="mb-2 h-7 rounded border border-[#dbe6ee] bg-[#f8fbfc] px-2 py-1 text-[0.62rem] text-[#8aa0b3]">Password</div>
          <div className="h-7 rounded bg-[#143A57] px-2 py-1 text-center text-[0.62rem] font-bold text-white">Continue</div>
        </div>
        {/* TOTP mock */}
        <div className="flex-1 rounded-lg border border-[#a7dfbf] bg-[#f0fbf5] p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <Smartphone size={12} className="text-[#0f6b4f]" />
            <span className="text-[0.72rem] font-black text-[#0f6b4f]">MFA — TOTP</span>
          </div>
          <div className="mb-2 text-[0.62rem] text-[#53687b]">Enter 6-digit code from your authenticator app</div>
          <div className="mb-2 flex gap-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-7 flex-1 rounded border border-[#a7dfbf] bg-white text-center text-sm font-black text-[#0f6b4f]">
                {['4', '7', '2', '1', '9', '3'][i]}
              </div>
            ))}
          </div>
          <div className="h-6 rounded bg-[#0f6b4f] text-center text-[0.62rem] font-bold leading-6 text-white">Verify</div>
        </div>
        {/* Role badge */}
        <div className="flex flex-col gap-2 justify-center">
          {[
            { label: 'Patient', color: '#0397AE', bg: '#e0f7fa' },
            { label: 'Clinician', color: '#0f6b4f', bg: '#e8f7ef' },
            { label: 'Governance', color: '#143A57', bg: '#e7f3f8' },
          ].map((r) => (
            <span key={r.label} className="rounded-full px-3 py-1 text-[0.65rem] font-black" style={{ backgroundColor: r.bg, color: r.color }}>
              {r.label} role
            </span>
          ))}
        </div>
      </div>
    </MockShell>
  )
}

// 03 — Tables
function TablesMock() {
  const tables = [
    { name: 'u_careatlas_patient', fields: ['first_name', 'last_name', 'dob', 'phone', 'email', 'insurance_id', 'health_condition', 'consent'] },
    { name: 'u_careatlas_appointment', fields: ['patient_id', 'doctor_id', 'date', 'start_time', 'visit_type', 'status', 'reason'] },
    { name: 'u_ai_decision_log', fields: ['log_id', 'confidence_score', 'model_version', 'slots_considered', 'appointment'] },
  ]
  return (
    <MockShell label="ServiceNow Table Schema">
      <div className="space-y-2">
        {tables.map((t) => (
          <div key={t.name} className="rounded-lg border border-[#eef3f7] p-3">
            <div className="mb-2 flex items-center gap-2">
              <Database size={12} className="text-[#6d28d9]" />
              <span className="font-mono text-[0.65rem] font-black text-[#6d28d9]">{t.name}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {t.fields.map((f) => (
                <span key={f} className="rounded bg-[#f0ebff] px-1.5 py-0.5 font-mono text-[0.58rem] text-[#6d28d9]">{f}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MockShell>
  )
}

// 04 — Agents
function AgentsMock() {
  const agents = [
    { name: 'Schedule Appointment Agent', type: 'Internal', strategy: 'ReAct', status: 'Deployed' },
    { name: 'Rogue Agent', type: 'Internal', strategy: 'ReAct', status: 'Deployed' },
    { name: 'Patient Data Agent', type: 'Internal', strategy: 'ReAct', status: 'Deployed' },
    { name: 'Fairness Monitor Agent', type: 'Internal', strategy: 'ReAct', status: 'Deployed' },
  ]
  return (
    <MockShell label="AI Agent Studio — Agent Inventory">
      <div className="space-y-2">
        {agents.map((a) => (
          <div key={a.name} className="flex items-center gap-3 rounded-lg border border-[#eef3f7] px-3 py-2.5">
            <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-[#143A57] text-white">
              <Bot size={13} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.72rem] font-bold text-[#102033]">{a.name}</div>
              <div className="flex gap-1.5 mt-0.5">
                <Pill label={a.type} color="#0f5f8c" bg="#e7f3f8" />
                <Pill label={a.strategy} color="#6d28d9" bg="#f0ebff" />
              </div>
            </div>
            <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.6rem] font-bold text-emerald-700">{a.status}</span>
          </div>
        ))}
      </div>
    </MockShell>
  )
}

// 05 — A2A
function A2aMock() {
  return (
    <MockShell label="A2A Protocol — message/send flow">
      <div className="flex items-stretch gap-3 max-[640px]:flex-col">
        {/* Request */}
        <div className="flex-1 rounded-lg border border-[#cfe0ea] bg-[#f5f9fb] p-3 font-mono text-[0.6rem] text-[#40566b]">
          <div className="mb-1 font-black text-[#0f5f8c]">POST /api/sn_aia/a2a/v2/agent/id/{'{sys_id}'}</div>
          <div className="text-[#6d28d9]">Authorization: Bearer {'{oauth_token}'}</div>
          <div className="mt-2 text-[#8aa0b3]">{'{'}</div>
          <div className="pl-3">"jsonrpc": "2.0",</div>
          <div className="pl-3">"method": "message/send",</div>
          <div className="pl-3">"params": {'{'}</div>
          <div className="pl-6">"configuration": {'{'} "blocking": true {'}'},</div>
          <div className="pl-6">"message": {'{'} "role": "user", ... {'}'}</div>
          <div className="pl-3">{'}'}</div>
          <div className="text-[#8aa0b3]">{'}'}</div>
        </div>
        {/* Arrow */}
        <div className="flex items-center justify-center text-[#8aa0b3]">
          <Network size={20} />
        </div>
        {/* Response */}
        <div className="flex-1 rounded-lg border border-[#a7dfbf] bg-[#f0fbf5] p-3 font-mono text-[0.6rem] text-[#40566b]">
          <div className="mb-1 font-black text-[#0f6b4f]">200 OK</div>
          <div className="text-[#8aa0b3]">{'{'}</div>
          <div className="pl-3">"context_id": "abc123...",</div>
          <div className="pl-3">"task_id": "def456...",</div>
          <div className="pl-3">"state": "completed",</div>
          <div className="pl-3">"output": "Agent response..."</div>
          <div className="text-[#8aa0b3]">{'}'}</div>
        </div>
      </div>
    </MockShell>
  )
}

// 06 — ACL
function AclMock() {
  const rules = [
    { table: 'u_careatlas_patient', op: 'read', role: 'care_patient_viewer', result: 'allow' },
    { table: 'u_careatlas_patient', op: 'write', role: 'care_admin', result: 'allow' },
    { table: 'u_careatlas_patient', op: 'read', role: 'public', result: 'deny' },
    { table: 'u_careatlas_appointment', op: 'read', role: 'care_doctor', result: 'allow' },
  ]
  return (
    <MockShell label="sys_security_acl — Access Control Rules">
      <div className="overflow-x-auto rounded-lg border border-[#eef3f7]">
        <table className="w-full text-[0.62rem]">
          <thead>
            <tr className="border-b border-[#eef3f7] bg-[#f8fbfc]">
              {['Table', 'Operation', 'Role', 'Result'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-black uppercase tracking-wide text-[#8aa0b3]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f5f8]">
            {rules.map((r, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-mono text-[#6d28d9]">{r.table}</td>
                <td className="px-3 py-2 font-bold text-[#40566b]">{r.op}</td>
                <td className="px-3 py-2 font-mono text-[#0f5f8c]">{r.role}</td>
                <td className="px-3 py-2">
                  <span className={cn(
                    'rounded-full px-2 py-0.5 font-bold',
                    r.result === 'allow' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
                  )}>
                    {r.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#cfe0ea] bg-[#f5f9fb] px-3 py-2">
        <Fingerprint size={14} className="text-[#0f5f8c]" />
        <span className="text-[0.65rem] font-bold text-[#40566b]">Non-human identity: <span className="font-mono text-[#6d28d9]">svc_careatlas_api</span> — read-only, no PII write access</span>
      </div>
    </MockShell>
  )
}

// 07 — ACL Test (good vs bad)
function AclTestMock() {
  return (
    <MockShell label="Governance ACL Page — Compare Agents">
      <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
        {/* Good agent */}
        <div className="rounded-xl border border-[#a7dfbf] bg-[#f0fbf5] p-3">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#0f6b4f]" />
            <span className="text-[0.7rem] font-black text-[#0f6b4f]">Good Scheduling Agent</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[0.55rem] font-bold text-emerald-700">Secure</span>
          </div>
          <div className="space-y-1.5">
            <ChatBubbleMock role="user" text="Give me Olivia Kumar's phone number?" color="#0f6b4f" />
            <ChatBubbleMock role="agent" text="Sorry, my roles and permissions do not permit me to perform this action." color="#0f6b4f" bg="#e8f7ef" />
          </div>
        </div>
        {/* Rogue agent */}
        <div className="rounded-xl border border-[#f3a19c] bg-[#fff1f0] p-3">
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert size={14} className="text-[#a22828]" />
            <span className="text-[0.7rem] font-black text-[#a22828]">Rogue Agent</span>
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[0.55rem] font-bold text-red-700">Unrestricted</span>
          </div>
          <div className="space-y-1.5">
            <ChatBubbleMock role="user" text="Give me Olivia Kumar's phone number?" color="#a22828" />
            <ChatBubbleMock role="agent" text="Olivia Kumar's phone: (555) 012-3456. DOB: 1990-04-22. Address: 123 Main St..." color="#a22828" bg="#fee2e2" />
          </div>
        </div>
      </div>
    </MockShell>
  )
}

function ChatBubbleMock({ role, text, color, bg }: { role: 'user' | 'agent'; text: string; color: string; bg?: string }) {
  const isUser = role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className="max-w-[90%] rounded-lg px-2.5 py-1.5 text-[0.6rem] leading-relaxed font-semibold"
        style={isUser
          ? { backgroundColor: color, color: 'white' }
          : { backgroundColor: bg ?? '#f8fbfc', color: color, border: `1px solid ${color}30` }
        }
      >
        {text}
      </div>
    </div>
  )
}

// 08 — Shadow AI
function ShadowMock() {
  const assets = [
    { name: 'GPT-4 Triage Bot', vendor: 'OpenAI', status: 'Unmanaged', phase: 'Assessment' },
    { name: 'Copilot Scribe', vendor: 'Microsoft', status: 'Managed', phase: 'Deployed' },
    { name: 'Ambient Listener v2', vendor: 'Nuance', status: 'Unmanaged', phase: 'Assessment' },
    { name: 'CareAtlas Scheduler', vendor: 'ServiceNow', status: 'Managed', phase: 'Deployed' },
  ]
  return (
    <MockShell label="AI Agents Page — Managed & Unmanaged Assets">
      <div className="grid grid-cols-2 gap-2 max-[560px]:grid-cols-1">
        {['Managed', 'Unmanaged'].map((kind) => (
          <div key={kind} className={cn(
            'rounded-lg border p-2',
            kind === 'Managed' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50',
          )}>
            <div className={cn(
              'mb-2 text-[0.65rem] font-black uppercase tracking-wide',
              kind === 'Managed' ? 'text-emerald-700' : 'text-amber-700',
            )}>
              {kind} AI Assets
            </div>
            {assets.filter((a) => a.status === kind).map((a) => (
              <div key={a.name} className="mb-1.5 flex items-center gap-2 rounded bg-white/70 px-2 py-1.5">
                <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded bg-[#143A57] text-white">
                  <Brain size={10} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.62rem] font-bold text-[#102033]">{a.name}</div>
                  <div className="text-[0.58rem] text-[#8aa0b3]">{a.vendor}</div>
                </div>
                <span className={cn(
                  'flex-shrink-0 rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold',
                  a.phase === 'Deployed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                )}>{a.phase}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </MockShell>
  )
}

// 09 — Lifecycle
function LifecycleMock() {
  const stages = [
    { label: 'Assessment', color: '#b45309', bg: '#fef3c7' },
    { label: 'Review', color: '#6d28d9', bg: '#f0ebff' },
    { label: 'Ready', color: '#0f5f8c', bg: '#e7f3f8' },
    { label: 'Deployed', color: '#0f6b4f', bg: '#e8f7ef' },
    { label: 'Retired', color: '#a22828', bg: '#fff1f0' },
  ]
  return (
    <MockShell label="AI Control Tower — Lifecycle Pipeline">
      <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-1">
        {stages.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1">
            <div
              className={cn(
                'flex flex-shrink-0 flex-col items-center rounded-xl border px-3 py-2',
                i === 3 && 'ring-2 ring-emerald-400 ring-offset-1',
              )}
              style={{ borderColor: s.bg, backgroundColor: s.bg }}
            >
              <TowerControl size={14} style={{ color: s.color }} />
              <span className="mt-1 whitespace-nowrap text-[0.6rem] font-black" style={{ color: s.color }}>{s.label}</span>
            </div>
            {i < stages.length - 1 && (
              <Workflow size={12} className="flex-shrink-0 text-[#c0cdd8]" />
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-[#cfe0ea] bg-[#f5f9fb] px-3 py-2">
          <Shield size={12} className="text-[#0f5f8c]" />
          <span className="text-[0.65rem] font-bold text-[#40566b]">Unmanaged <span className="text-[#8aa0b3]">&#8594;</span> Managed: assign owner + lifecycle stage</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-[#a7dfbf] bg-[#f0fbf5] px-3 py-2">
          <Users size={12} className="text-[#0f6b4f]" />
          <span className="text-[0.65rem] font-bold text-[#40566b]">Steward assigned · Review cadence set · Policy attached</span>
        </div>
      </div>
    </MockShell>
  )
}

// 10 — Notifications
function NotificationsMock() {
  const feed = [
    { type: 'Appointment booked', detail: 'with Dr. Lucas Walker on 06-23 at 08:30', unread: true, color: '#1f5f9c', bg: '#e7f0fb' },
    { type: 'Appointment confirmed', detail: 'visit on 06-20 confirmed', unread: true, color: '#1d7a45', bg: '#e6f6ec' },
    { type: 'Summary note added', detail: 'note logged for your 05-25 appointment', unread: false, color: '#6b3fb0', bg: '#f0eafc' },
    { type: 'Registration approved', detail: 'your registration was approved', unread: false, color: '#1d7a45', bg: '#e6f6ec' },
  ]
  return (
    <MockShell label="Notifications — bell widget & feed">
      <div className="flex items-stretch gap-4 max-[640px]:flex-col">
        {/* Bell + badge */}
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[#dbe6ee] bg-[#f8fbfc] px-4 py-3">
          <span className="relative grid h-10 w-10 place-items-center rounded-[10px] border border-[#d7e5ec] bg-white text-[#143A57]">
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#d92d20] px-1 text-[0.6rem] font-black text-white">2</span>
          </span>
          <span className="text-[0.58rem] font-bold text-[#8aa0b3]">2 unread</span>
        </div>
        {/* Feed */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {feed.map((n) => (
            <div
              key={n.type}
              className={cn(
                'flex items-start gap-2 rounded-lg border px-2.5 py-1.5',
                n.unread ? 'border-[#bcd9f0] bg-[#f6fbff]' : 'border-[#eef3f7] bg-white',
              )}
            >
              <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded" style={{ backgroundColor: n.bg, color: n.color }}>
                <BellRing size={11} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {n.unread && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#1f7af0]" />}
                  <span className="truncate text-[0.64rem] font-bold text-[#102033]">{n.type}</span>
                </div>
                <div className="truncate text-[0.58rem] text-[#53687b]">{n.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Pill label="u_notification_reminders" color="#0f6b4f" bg="#e8f7ef" />
        <Pill label="audience: patient · staff · both" color="#1f5f9c" bg="#e7f0fb" />
        <Pill label="per-audience read flags" color="#6b3fb0" bg="#f0eafc" />
        <Pill label="257 backfilled" color="#b45309" bg="#fef3c7" />
      </div>
    </MockShell>
  )
}

// 11 — Sidebar UX
function SidebarMock() {
  const nav = ['Dashboard', 'Book', 'Appointments', 'Notifications', 'Profile']
  return (
    <MockShell label="Two-pane layout — full-height sidebar">
      <div className="flex h-[150px] overflow-hidden rounded-lg border border-[#dbe6ee]">
        {/* Sidebar */}
        <div className="flex w-[120px] flex-shrink-0 flex-col border-r border-[#eef3f7] bg-[#f8fbfc]">
          <div className="flex items-center gap-1.5 border-b border-[#eef3f7] px-2.5 py-2">
            <span className="grid h-5 w-5 place-items-center rounded bg-[#143A57] text-white"><Globe size={11} /></span>
            <span className="text-[0.56rem] font-black text-[#102033]">CareAtlas</span>
          </div>
          <div className="flex-1 space-y-1 p-2">
            {nav.map((n, i) => (
              <div
                key={n}
                className={cn(
                  'rounded px-2 py-1 text-[0.56rem] font-bold',
                  i === 0 ? 'bg-[#143A57] text-white' : 'text-[#53687b]',
                )}
              >
                {n}
              </div>
            ))}
          </div>
          <div className="border-t border-[#eef3f7] p-2">
            <div className="flex items-center gap-1 rounded border border-[#e0ebf1] px-2 py-1 text-[0.56rem] font-bold text-[#a22828]">
              <LogOut size={10} /> Sign out
            </div>
          </div>
        </div>
        {/* Content pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-end gap-1.5 border-b border-[#eef3f7] bg-white px-2.5 py-1.5">
            <span className="grid h-5 w-5 place-items-center rounded border border-[#d7e5ec] text-[#143A57]"><Bell size={11} /></span>
            <span className="rounded border border-[#d7e5ec] px-1.5 py-0.5 text-[0.52rem] font-bold text-[#53687b]">Switch portal</span>
          </div>
          <div className="flex-1 space-y-1.5 bg-[#f4f8fb] p-2.5">
            <div className="h-3 w-1/2 rounded bg-[#dbe6ee]" />
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-9 rounded border border-[#e6eef4] bg-white" />
              ))}
            </div>
            <div className="h-10 rounded border border-[#e6eef4] bg-white" />
          </div>
        </div>
      </div>
    </MockShell>
  )
}
