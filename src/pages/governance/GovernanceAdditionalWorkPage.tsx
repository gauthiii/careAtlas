import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  FileStack,
  Handshake,
  Loader2,
  Plug,
  RectangleHorizontal,
  RectangleVertical,
  Scissors,
  Search,
  ServerCog,
  Sparkles,
  TowerControl,
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

interface DeckItem {
  label: string
  detail: string
}

interface DeckSection {
  id: string
  number: string
  title: string
  subtitle: string
  icon: typeof ServerCog
  items: DeckItem[]
  mock: ReactNode
}

// ---------------------------------------------------------------------------
// Data — the MCP server story, grounded in the ai_service_now_docs project
// ---------------------------------------------------------------------------

const SECTIONS: DeckSection[] = [
  {
    id: 'what',
    number: '01',
    title: 'What We Are Building',
    subtitle: 'An MCP server over ServiceNow’s AI documentation',
    icon: ServerCog,
    items: [
      {
        label: 'A Model Context Protocol (MCP) server',
        detail:
          'It exposes the official ServiceNow AI documentation as searchable, LLM-readable context — any MCP client (Claude Code, Claude Desktop, claude.ai) can call it as a set of tools.',
      },
      {
        label: 'Three documents: Enable AI, GRC, and AI Control Tower Implementation',
        detail:
          'Three main documentation sets on the latest releases (Zurich & Australia): ServiceNow Enable AI (Now Assist, AI Agents, AI Control Tower, Document Intelligence, Knowledge Graph…), ServiceNow GRC (AI Risk & Compliance, Risk / Audit / Policy, Privacy, Third-Party Risk…), and the AI Control Tower Implementation guide (Discover → Govern → Assess → Build → Deploy → Observe → Measure).',
      },
      {
        label: 'Structured as document → topic → subtopic',
        detail:
          '1,628 subtopics across 54 topics: Enable AI (19 topics / 277 subtopics), GRC (14 topics / 802 subtopics), and AI Control Tower Implementation (21 topics / 549 subtopics). Each subtopic is one markdown file the server can search and return in full.',
      },
    ],
    mock: <WhatMock />,
  },
  {
    id: 'why',
    number: '02',
    title: 'Why We Are Working On It',
    subtitle: 'The docs are too big and too fresh for any model to “just know”',
    icon: AlertTriangle,
    items: [
      {
        label: 'The docs were updated June 12, 2026',
        detail:
          'These are living docs on the newest ServiceNow releases. No LLM’s training data reliably contains the current AI Control Tower / GRC behaviour — its knowledge is stale by construction.',
      },
      {
        label: 'Thousands of pages across three source documents',
        detail:
          'Hundreds of megabytes of source PDFs spanning the three documentation sets, each running to thousands of pages — far more than fits in any single context window.',
      },
      {
        label: 'Context limits exceed → answers truncate',
        detail:
          'You cannot paste hundreds of MB of PDFs into a prompt. Stuff it in and the context window overflows or silently truncates, so the model answers from a partial, unreliable slice.',
      },
      {
        label: 'Search & web search can’t guarantee accuracy',
        detail:
          'Generic web search and recall hallucinate version-specific configuration steps. For governance and compliance, a confidently-wrong answer is worse than none.',
      },
    ],
    mock: <WhyMock />,
  },
  {
    id: 'how',
    number: '03',
    title: 'How We Are Doing It',
    subtitle: 'Split the context, then serve it as precise MCP tools',
    icon: Scissors,
    items: [
      {
        label: 'Step 1 — Chunk the PDFs (split_pikepdf.py)',
        detail:
          'Page-bounded PDF chunks with bookmarks preserved — one chunk set per document. The hundreds-of-MB problem becomes many small, addressable units.',
      },
      {
        label: 'Step 2 — Extract one markdown file per subtopic',
        detail:
          'Each subtopic becomes a single .md under main-document → topic → subtopic. The result is a few MB of clean text instead of hundreds of MB of binary PDF.',
      },
      {
        label: 'Step 3 — Index + serve (mcp_server.py)',
        detail:
          'The server indexes all 1,628 subtopics at startup and exposes 5 tools + a how_to_use prompt. The LLM pulls only the few subtopics it needs — the context is split across tool calls, never dumped at once.',
      },
      {
        label: 'That is the “context split as MCP tools”',
        detail:
          'Instead of one impossible mega-prompt, the model navigates (list) and retrieves (search → fetch) just-in-time. No truncation, every answer traceable to an exact subtopic.',
      },
    ],
    mock: <PipelineMock />,
  },
  {
    id: 'tools',
    number: '04',
    title: 'The Tools The LLM Calls',
    subtitle: '5 tools + a how_to_use prompt — search-then-fetch',
    icon: Search,
    items: [
      {
        label: 'list_documents() → list_topics() → list_subtopics()',
        detail:
          'Browsing path: see the three main documents and their topic/subtopic counts, then drill in. Used when the question is “what’s covered”.',
      },
      {
        label: 'search_documentation(query, document?, limit?)',
        detail:
          'Full-text search across all 1,628 subtopics, returns ranked matches with stable subtopic_ids. The default entry point for a specific question.',
      },
      {
        label: 'get_subtopic(subtopic_id)',
        detail:
          'Returns the full markdown content + metadata for one subtopic — the grounded source the model answers from.',
      },
      {
        label: 'how_to_use prompt + server instructions',
        detail:
          'On connect the model is auto-told what the server covers and the recommended order (search → fetch), so it uses the docs correctly without being asked.',
      },
    ],
    mock: <ToolsMock />,
  },
  {
    id: 'access',
    number: '05',
    title: 'How It’s Accessed',
    subtitle: 'Local stdio today, remote connector for the browser',
    icon: Cloud,
    items: [
      {
        label: 'Local over stdio',
        detail:
          'Registered into Claude Code (claude mcp add) or Claude Desktop with the venv Python + absolute paths. Tools appear as mcp__servicenow-ai-docs__<tool>.',
      },
      {
        label: 'Remote over Streamable HTTP',
        detail:
          'server_http.py reuses the same server unchanged and serves it at a public HTTPS /mcp endpoint, added to claude.ai as a custom connector.',
      },
      {
        label: 'Optional OAuth 2.0',
        detail:
          'auth.py validates bearer tokens against an external provider (WorkOS / Stytch / Descope / Auth0 with DCR). Leave it off for open read-only docs, turn it on to gate access — the hook for subscriptions.',
      },
    ],
    mock: <AccessMock />,
  },
  {
    id: 'help',
    number: '06',
    title: 'How This Helps Us',
    subtitle: 'Accurate, current, traceable answers on AI governance',
    icon: TowerControl,
    items: [
      {
        label: 'Impact & value — 5× the coverage, plus the full Control Tower guide',
        detail:
          'Coverage grew from 2 documents / 319 subtopics to 3 documents / 1,628 subtopics — roughly 5× more indexed content — adding the entire AI Control Tower Implementation guide (Discover → Govern → Assess → Build → Deploy → Observe → Measure). More of the governance questions we field now resolve to an exact, citable subtopic instead of a model guess.',
      },
      {
        label: 'Always current, never truncated',
        detail:
          'Re-run the pipeline when the docs change and the server is up to date — no model retraining, no context overflow.',
      },
      {
        label: 'Grounded, citable answers',
        detail:
          'Every answer maps to an exact subtopic_id, so AI Control Tower and GRC guidance can be verified — exactly what governance and compliance demand.',
      },
      {
        label: 'Directly powers our governance work',
        detail:
          'The same control-tower and GRC questions we field in this portal get answered from the source of truth instead of from a model’s guesswork.',
      },
    ],
    mock: <HelpMock />,
  },
  {
    id: 'commercial',
    number: '07',
    title: 'The Commercial Opportunity',
    subtitle: 'We don’t own ServiceNow — so we can sell the access layer',
    icon: Handshake,
    items: [
      {
        label: 'Sell it as a product',
        detail:
          'The pipeline + MCP server is reusable IP. Any team doing ServiceNow AI / GRC work has the same hundreds-of-MB context problem we solved — that is a sellable solution.',
      },
      {
        label: 'Partner with ServiceNow',
        detail:
          'We don’t own the docs or the platform, which makes a partnership natural: an official MCP knowledge layer over their AI Control Tower & GRC content benefits their customers.',
      },
      {
        label: 'Subscription for other clients',
        detail:
          'Host it remotely with OAuth gating (already built) and offer it per-seat / per-org. Clients get accurate, always-current ServiceNow AI knowledge without building the pipeline themselves.',
      },
      {
        label: 'Win–win',
        detail:
          'It helps us (accurate governance answers + a revenue line) and helps others (a problem they can’t easily solve alone), with ServiceNow’s ecosystem as the distribution channel.',
      },
    ],
    mock: <CommercialMock />,
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GovernanceAdditionalWorkPage() {
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

      pdf.save(`careatlas-additional-work-${orientation}.pdf`)
    } catch (err) {
      console.error('Additional Work PDF export failed', err)
    } finally {
      setExporting(false)
    }
  }

  const Banner = () => (
    <div className="flex items-center gap-4 rounded-2xl border border-[#0397AE] p-5 text-[#0397AE]">
      <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-white/15">
        <ServerCog size={28} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[0.72rem] font-bold uppercase tracking-widest">Additional work</div>
        <div className="text-xl font-bold">ServiceNow AI Docs - MCP Server</div>
        <div className="mt-0.5 text-sm">
          AI Control Tower &amp; GRC knowledge, served as Model Context Protocol tools
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        <div className="rounded-full px-3 py-1 text-xs font-bold mb-3 border border-[#0397AE] rounded-xl">
          1,628 subtopics
        </div>
        <div className="rounded-full px-3 py-1 text-xs font-bold border border-[#0397AE] rounded-xl">
          In progress
        </div>
      </div>
    </div>
  )

  return (
    <PortalPage
      label="AI Governance Officer"
      title="Additional Work — ServiceNow AI Docs MCP Server"
      intro="A presentation walkthrough of an MCP server we are building over ServiceNow’s AI Control Tower & GRC documentation — what it is, why it’s needed, how it works, and how we can take it to market."
    >
      <section className="min-w-0 px-6 pb-10">
        {/* Export toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cfe0ea] bg-white px-4 py-3 shadow-[0_4px_16px_rgba(25,64,93,0.07)]">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#102033]">Export deck</div>
            <div className="text-xs text-[#53687b]">
              Saves all {SECTIONS.length} sections as a {SECTIONS.length}-page PDF — the title and section nav share the first page.
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Orientation toggle */}
            <div className="flex items-center rounded-xl border border-[#cfe0ea] bg-[#f5f9fb] p-0.5">
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
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 !text-[14px] !font-bold transition',
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
              className="flex items-center gap-2 rounded-xl px-4 py-2 !text-[14px] !font-bold text-[#143A57] border border-[#143A57] disabled:cursor-not-allowed disabled:opacity-60"
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

        {/* Section nav — Tabs */}
        <div className="mb-8 flex flex-wrap gap-3">
          {SECTIONS.map((s) => {
            const isActive = activeTabId === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveTabId(s.id)}
                className={cn(
                  'flex flex-shrink-0 flex-col w-[142px] h-[75px] items-center gap-1 rounded-xl border px-2 py-2 text-center transition hover:-translate-y-0.5 hover:shadow-md',
                  isActive
                    ? 'bg-[#143A57] text-white'
                    : 'border-[#143A57] text-[#143A57]'
                )}
              >
                <span className="text-[12px] font-black tracking-widest">
                  {s.number}
                </span>
                <span className="text-[12px] font-bold leading-tight">
                  {s.title}
                </span>
              </button>
            )
          })}
        </div>

        {/* Active Tab Content */}
        <div className="min-h-[400px]">
          <DeckCard section={activeSection} />
        </div>

        {/* Hidden Container for PDF Export */}
        <div className="fixed left-[-9999px] top-0 w-[900px] pointer-events-none">
          <div ref={(el) => { pageRefs.current[0] = el }} className="bg-white p-10 space-y-8">
            <Banner />
            <DeckCard section={SECTIONS[0]} />
          </div>
          {SECTIONS.slice(1).map((section, i) => (
            <div key={section.id} ref={(el) => { pageRefs.current[i + 1] = el }} className="bg-white p-10">
              <DeckCard section={section} />
            </div>
          ))}
        </div>
      </section>
    </PortalPage>
  )
}

// ---------------------------------------------------------------------------
// Deck card
// ---------------------------------------------------------------------------

function DeckCard({
  section,
  cardRef,
}: {
  section: DeckSection
  cardRef?: (el: HTMLDivElement | null) => void
}) {
  const Icon = section.icon

  return (
    <div
      ref={cardRef}
      id={section.id}
      className="scroll-mt-24 overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(25,64,93,0.07)] border border-[#cfe0ea]"
    >
      {/* Card header */}
      <div
        className="flex items-center gap-4 border-b border-[#cfe0ea] px-6 py-4"
      >
        <span
          className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-[#0397AE]"
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[#0397AE]">
            <span
              className="text-base font-bold tracking-widest"
            >
              {section.number}
            </span>
            <h2 className="text-base font-bold">{section.title}</h2>
          </div>
          <p className="text-xs text-[#53687b]">{section.subtitle}</p>
        </div>
      </div>

      {/* Items */}
      <div className="">
        {section.items.map((item, i) => (
          <DeckItemRow key={i} item={item}  />
        ))}
      </div>

      {/* Mock UI strip */}
      <div className="border-t border-[#eef3f7] bg-[#f8fbfc] px-6 py-4">
        <div className="mb-2 text-[0.62rem] font-black uppercase tracking-widest text-[#8aa0b3]">
          Reference
        </div>
        {section.mock}
      </div>
    </div>
  )
}

function DeckItemRow({ item}: { item: DeckItem}) {
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
// Mock / reference strips — lightweight visuals per section
// ---------------------------------------------------------------------------

function Pill({ children, color = '#0f5f8c', bg = '#e7f3f8' }: { children: ReactNode; color?: string; bg?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-bold"
      style={{ color, backgroundColor: bg }}
    >
      {children}
    </span>
  )
}

// Full document → topic → subtopic-count map, pulled live from the connected
// servicenow-ai-docs MCP (list_documents / list_topics). Source topic names are
// lightly cleaned of typos for display; counts are verbatim. Totals: 3 docs ·
// 54 topics · 1,628 subtopics (277 + 802 + 549).
const COVERAGE: {
  doc: string
  color: string
  bg: string
  border: string
  topics: { name: string; n: number }[]
}[] = [
  {
    doc: 'ServiceNow Enable AI',
    color: '#0f5f8c',
    bg: '#e7f3f8',
    border: '#cfe0ea',
    topics: [
      { name: 'Now Assist AI agents', n: 66 },
      { name: 'AI Control Tower', n: 35 },
      { name: 'Now Assist', n: 33 },
      { name: 'Now Assist Center', n: 24 },
      { name: 'Now Assist Skill Kit', n: 23 },
      { name: 'Now Assist Data Kit', n: 13 },
      { name: 'Now Assist AI assets', n: 11 },
      { name: 'ServiceNow AI Implementation', n: 11 },
      { name: 'AI Agent Advisor', n: 10 },
      { name: 'AI Desktop Actions', n: 7 },
      { name: 'Predictive Intelligence', n: 7 },
      { name: 'Document Intelligence', n: 6 },
      { name: 'Knowledge Graph', n: 5 },
      { name: 'Large language model on the ServiceNow AI Platform', n: 5 },
      { name: 'Natural Language Understanding', n: 5 },
      { name: 'MCP Server Console', n: 4 },
      { name: 'Natural Language Query', n: 4 },
      { name: 'Now Assist Readiness Evaluation', n: 4 },
      { name: 'Now Assist in Document Intelligence', n: 4 },
    ],
  },
  {
    doc: 'ServiceNow GRC',
    color: '#7c2d12',
    bg: '#fdeadf',
    border: '#f1d0bb',
    topics: [
      { name: 'Common Governance, Risk & Compliance Features', n: 118 },
      { name: 'Third-Party Risk Management', n: 113 },
      { name: 'Risk Management', n: 103 },
      { name: 'Policy and Compliance Management', n: 77 },
      { name: 'Privacy Management', n: 74 },
      { name: 'Regulatory Change Management', n: 48 },
      { name: 'AI Risk and Compliance', n: 42 },
      { name: 'Operational Resilience', n: 42 },
      { name: 'Business Continuity Management', n: 41 },
      { name: 'Audit Management', n: 40 },
      { name: 'Compliance Case Management', n: 33 },
      { name: 'Continuous Authorization and Monitoring', n: 26 },
      { name: 'Model Risk Management', n: 24 },
      { name: 'Smart Assessment Engine', n: 21 },
    ],
  },
  {
    doc: 'AI Control Tower Implementation',
    color: '#6d28d9',
    bg: '#f0ebff',
    border: '#d9cdf5',
    topics: [
      { name: 'Govern – Risk and Controls', n: 97 },
      { name: 'Discover – Discovery', n: 72 },
      { name: 'Govern – Lifecycle', n: 49 },
      { name: 'Discover – Data Models', n: 42 },
      { name: 'Manual Intake Configuration – Record Producers & Workspace', n: 41 },
      { name: 'Govern – Now Assist Governance', n: 40 },
      { name: 'Measure – Value', n: 33 },
      { name: 'Cross-Product Integration – AI Case Management', n: 26 },
      { name: 'Govern – Risk and Control', n: 22 },
      { name: 'General – Technical and Functional Considerations', n: 21 },
      { name: 'Cross-Product Integration – CMDB', n: 20 },
      { name: 'General – Prelaunch', n: 20 },
      { name: 'General – Personas, Roles, and Responsibilities', n: 14 },
      { name: 'Cross-Product Integration – AI Gateway', n: 9 },
      { name: 'Deploy – Review AI System Record & Pre-Deployment', n: 9 },
      { name: 'Observe – Trace Collectors', n: 8 },
      { name: 'Summary of AI System Asset – State Transitions & Tasks', n: 8 },
      { name: 'General – Overview', n: 7 },
      { name: 'Cross-Product Integration – AI Strategy', n: 5 },
      { name: 'Assess – Evaluate AI Use Case Impacts', n: 3 },
      { name: 'Build and Test – Implement Controls', n: 3 },
    ],
  },
]

function WhatMock() {
  const docTotals = COVERAGE.map((d) => ({
    doc: d.doc,
    topics: d.topics.length,
    subtopics: d.topics.reduce((sum, t) => sum + t.n, 0),
  }))
  const grandSub = docTotals.reduce((s, d) => s + d.subtopics, 0)
  const grandTop = docTotals.reduce((s, d) => s + d.topics, 0)

  return (
    <div className="grid gap-3">
      {/* Summary pills */}
      <div className="flex flex-wrap items-center gap-2">
        <Pill color="#0f5f8c" bg="#e7f3f8"><Boxes size={12} /> 3 main documents</Pill>
        <Pill color="#6d28d9" bg="#f0ebff"><FileStack size={12} /> {grandTop} topics</Pill>
        <Pill color="#0f6b4f" bg="#e8f7ef"><Database size={12} /> {grandSub.toLocaleString()} subtopics</Pill>
      </div>

      {/* Three-column document → topic tree */}
      <div className="grid gap-3 lg:grid-cols-3">
        {COVERAGE.map((d, i) => (
          <div key={d.doc} className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: d.border }}>
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2" style={{ backgroundColor: d.bg, borderColor: d.border }}>
              <span className="text-[0.72rem] font-black" style={{ color: d.color }}>{d.doc}</span>
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[0.6rem] font-black" style={{ color: d.color }}>
                {docTotals[i].topics} topics · {docTotals[i].subtopics}
              </span>
            </div>
            <ul className="divide-y divide-[#f0f5f8]">
              {d.topics.map((t) => (
                <li key={t.name} className="flex items-center justify-between gap-2 px-3 py-1.5">
                  <span className="min-w-0 text-[0.66rem] font-semibold leading-snug text-[#3c4f60] [overflow-wrap:anywhere]">{t.name}</span>
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[0.6rem] font-black"
                    style={{ color: d.color, backgroundColor: d.bg }}
                  >
                    {t.n}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Grand total */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-[#cfe0ea] bg-[#f8fbfc] px-3 py-2 text-[0.7rem] font-bold text-[#53687b]">
        <span>3 documents</span><span className="text-[#b7ceda]">·</span>
        <span>{grandTop} topics</span><span className="text-[#b7ceda]">·</span>
        <span className="font-black text-[#0f6b4f]">{grandSub.toLocaleString()} subtopics indexed</span>
      </div>
    </div>
  )
}

function WhyMock() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {[
        { label: 'ServiceNow Enable AI', value: '277 subtopics' },
        { label: 'ServiceNow GRC', value: '802 subtopics' },
        { label: 'AI Control Tower Implementation', value: '549 subtopics' },
        { label: 'Total indexed', value: '1,628 subtopics' },
      ].map((s) => (
        <div key={s.label} className="flex items-center justify-between rounded-lg border border-[#f1d9b0] bg-white px-3 py-2">
          <span className="text-[0.7rem] font-bold text-[#53687b]">{s.label}</span>
          <span className="text-[0.72rem] font-black text-[#b45309]">{s.value}</span>
        </div>
      ))}
      <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-[#f1c4c4] bg-[#fff5f5] px-3 py-2">
        <AlertTriangle size={14} className="text-[#b42318]" />
        <span className="text-[0.7rem] font-bold text-[#8a2f2f]">
          Too large for any context window → overflow / truncation → unreliable answers
        </span>
      </div>
    </div>
  )
}

function PipelineMock() {
  const steps = [
    { icon: FileStack, label: 'PDF sources', color: '#b45309' },
    { icon: Scissors, label: 'Chunked per doc', color: '#6d28d9' },
    { icon: Database, label: '1,628 .md subtopics', color: '#0f6b4f' },
    { icon: ServerCog, label: 'MCP server', color: '#0f5f8c' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => {
        const Icon = s.icon
        return (
          <div key={s.label} className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe6ee] bg-white px-2.5 py-1.5 text-[0.7rem] font-bold" style={{ color: s.color }}>
              <Icon size={13} />
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="text-[#8aa0b3]">→</span>}
          </div>
        )
      })}
    </div>
  )
}

function ToolsMock() {
  const tools = [
    'list_documents()',
    'list_topics(document)',
    'list_subtopics(document, topic)',
    'search_documentation(query)',
    'get_subtopic(subtopic_id)',
  ]
  return (
    <div className="flex flex-wrap gap-1.5">
      {tools.map((t) => (
        <code key={t} className="rounded-md border border-[#bfe0cf] bg-white px-2 py-1 text-[0.68rem] font-bold text-[#0f6b4f]">
          {t}
        </code>
      ))}
      <code className="rounded-md border border-[#cfe0ea] bg-white px-2 py-1 text-[0.68rem] font-bold text-[#0f5f8c]">
        prompt: how_to_use
      </code>
    </div>
  )
}

function AccessMock() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill color="#1d5c87" bg="#e7f3f8"><Plug size={12} /> stdio · Claude Code / Desktop</Pill>
      <Pill color="#0f5f8c" bg="#e7f3f8"><Cloud size={12} /> Streamable HTTP · claude.ai</Pill>
      <Pill color="#7c2d12" bg="#fdeadf"><ServerCog size={12} /> OAuth 2.0 (optional gate)</Pill>
    </div>
  )
}

function HelpMock() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill color="#0f6b4f" bg="#e8f7ef"><CheckCircle2 size={12} /> Always current</Pill>
      <Pill color="#0f6b4f" bg="#e8f7ef"><CheckCircle2 size={12} /> No truncation</Pill>
      <Pill color="#0f6b4f" bg="#e8f7ef"><CheckCircle2 size={12} /> Traceable to subtopic_id</Pill>
      <Pill color="#0f5f8c" bg="#e7f3f8"><TowerControl size={12} /> Grounded governance answers</Pill>
    </div>
  )
}

function CommercialMock() {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {[
        { icon: Sparkles, label: 'Product', detail: 'Reusable pipeline + server IP' },
        { icon: Handshake, label: 'Partner', detail: 'Official layer with ServiceNow' },
        { icon: Cloud, label: 'Subscription', detail: 'Per-seat, OAuth-gated hosting' },
      ].map((s) => {
        const Icon = s.icon
        return (
          <div key={s.label} className="rounded-lg border border-[#f6c79f] bg-white px-3 py-2">
            <div className="flex items-center gap-1.5 text-[0.72rem] font-black text-[#7c2d12]">
              <Icon size={13} />
              {s.label}
            </div>
            <div className="mt-0.5 text-[0.68rem] font-semibold text-[#53687b]">{s.detail}</div>
          </div>
        )
      })}
    </div>
  )
}
