import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowUpCircle,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  Eye,
  FileSearch,
  FileText,
  FlaskConical,
  Gauge,
  HeartPulse,
  Keyboard,
  Layers,
  ListChecks,
  Lock,
  Maximize2,
  Minimize2,
  Pause,
  PenLine,
  Play,
  Rocket,
  RotateCcw,
  Scale,
  ScanSearch,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  User,
  UserCheck,
  UserCog,
  Users,
  UserSearch,
  Workflow,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn'

const ICONS = {
  scan: ScanSearch,
  boxes: Boxes,
  gauge: Gauge,
  userSearch: UserSearch,
  search: Search,
  arrowUp: ArrowUpCircle,
  fileText: FileText,
  workflow: Workflow,
  listChecks: ListChecks,
  clipboard: ClipboardList,
  fileSearch: FileSearch,
  shieldAlert: ShieldAlert,
  shieldCheck: ShieldCheck,
  clipboardCheck: ClipboardCheck,
  scale: Scale,
  layers: Layers,
  flask: FlaskConical,
  cpu: Cpu,
  lock: Lock,
  activity: Activity,
  heartPulse: HeartPulse,
  checkCircle: CheckCircle2,
  rocket: Rocket,
  penLine: PenLine,
  badge: BadgeCheck,
  siren: Siren,
  eye: Eye,
  userCheck: UserCheck,
  userCog: UserCog,
  shield: ShieldCheck,
  users: Users,
  user: User,
}

type IconKey = keyof typeof ICONS
type Stage = 'unmanaged' | 'managed' | 'deployed'
type FlowState = 'waiting' | 'active' | 'completed'

type FlowNode = {
  /** 1-based grid column — also the running step order. */
  col: number
  title: string
  stage: Stage
  /** Small lifecycle pill text shown on the card. */
  badge: string
  actor: string
  actorIcon: IconKey
  record?: string
  recordIcon?: IconKey
  icon: IconKey
  desc: string
}

type Band = {
  stage: Stage
  label: string
  startCol: number
  span: number
}

type FlowDef = {
  cols: number
  bands: Band[]
  nodes: FlowNode[]
}

const STAGE_STYLE: Record<Stage, { wrap: string; pill: string }> = {
  unmanaged: {
    wrap: 'border-amber-200 bg-amber-50/60',
    pill: 'border-amber-300 bg-amber-100 text-amber-800',
  },
  managed: {
    wrap: 'border-sky-200 bg-sky-50/60',
    pill: 'border-sky-300 bg-sky-100 text-[#0f5f8c]',
  },
  deployed: {
    wrap: 'border-emerald-200 bg-emerald-50/60',
    pill: 'border-emerald-300 bg-emerald-100 text-[#12805c]',
  },
}

const mkBand = (stage: Stage, label: string, startCol: number, span: number): Band => ({
  stage,
  label,
  startCol,
  span,
})

const flow = (bands: Band[], nodes: FlowNode[]): FlowDef => ({
  cols: nodes.length,
  bands,
  nodes,
})

// ---------------------------------------------------------------------------
// Phase 0 · Shadow AI Discovery (the "before" / Unmanaged state)
// ---------------------------------------------------------------------------
const FLOW_P0 = flow([mkBand('unmanaged', 'Unmanaged', 1, 4)], [
  {
    col: 1,
    title: 'Discovery & Cloud Sync',
    stage: 'unmanaged',
    badge: 'Unmanaged',
    actor: 'System · Discovery',
    actorIcon: 'cpu',
    record: 'AI Asset Inventory',
    recordIcon: 'boxes',
    icon: 'scan',
    desc: 'Cloud discovery & sync continuously surface running AI agents into the inventory as Unmanaged.',
  },
  {
    col: 2,
    title: 'Shadow AI Surfaced',
    stage: 'unmanaged',
    badge: 'Unmanaged',
    actor: 'System',
    actorIcon: 'cpu',
    record: '293 Unmanaged',
    recordIcon: 'boxes',
    icon: 'boxes',
    desc: '293 ungoverned AI systems appear — deployed and running, but with no governance record.',
  },
  {
    col: 3,
    title: 'Zero-Governance State',
    stage: 'unmanaged',
    badge: 'Unmanaged',
    actor: 'System',
    actorIcon: 'cpu',
    record: 'Risk Rating 0',
    recordIcon: 'shieldAlert',
    icon: 'gauge',
    desc: "Inherent Risk Rating 0, Risk classification 'To be determined', status 'AI steward review'.",
  },
  {
    col: 4,
    title: 'Steward Triage',
    stage: 'unmanaged',
    badge: 'Unmanaged',
    actor: 'AI Steward',
    actorIcon: 'userCheck',
    record: 'Unmanaged · AI systems',
    recordIcon: 'clipboard',
    icon: 'userSearch',
    desc: 'Steward reviews the Unmanaged list and picks an asset (e.g. Patient Data Agent) to govern.',
  },
])

// ---------------------------------------------------------------------------
// Phase 1 · Move to Managed (Unmanaged → Managed)
// ---------------------------------------------------------------------------
const FLOW_P1 = flow(
  [mkBand('unmanaged', 'Unmanaged', 1, 2), mkBand('managed', 'Managed', 3, 3)],
  [
    {
      col: 1,
      title: 'Locate Asset',
      stage: 'unmanaged',
      badge: 'Unmanaged',
      actor: 'AI Steward',
      actorIcon: 'userCheck',
      record: 'Unmanaged · AI systems',
      recordIcon: 'clipboard',
      icon: 'search',
      desc: "Find 'Patient Data Agent' in AI asset inventory → Unmanaged → AI systems.",
    },
    {
      col: 2,
      title: 'Move to Managed',
      stage: 'unmanaged',
      badge: 'Unmanaged → Managed',
      actor: 'AI Steward',
      actorIcon: 'userCheck',
      record: 'Move to Managed',
      recordIcon: 'arrowUp',
      icon: 'arrowUp',
      desc: 'Check the asset, click Move to Managed and confirm the dialog.',
    },
    {
      col: 3,
      title: 'Onboarding Request',
      stage: 'managed',
      badge: 'Managed · Intake',
      actor: 'System',
      actorIcon: 'cpu',
      record: 'AR00000XX',
      recordIcon: 'fileText',
      icon: 'fileText',
      desc: 'An Onboarding Request is auto-created the instant the asset becomes Managed.',
    },
    {
      col: 4,
      title: 'Onboarding Playbook Fires',
      stage: 'managed',
      badge: 'Managed',
      actor: 'System · Playbook',
      actorIcon: 'workflow',
      record: 'AI Asset Onboarding',
      recordIcon: 'workflow',
      icon: 'workflow',
      desc: 'The playbook fires, creating the Assess, Build & Test and Deploy lifecycle phases.',
    },
    {
      col: 5,
      title: 'Assess Tasks Created',
      stage: 'managed',
      badge: 'Managed · New',
      actor: 'System',
      actorIcon: 'cpu',
      record: 'Lifecycle phase = New',
      recordIcon: 'listChecks',
      icon: 'listChecks',
      desc: "Tasks auto-created in Assess. Asset is now Managed · status 'AI steward review'.",
    },
  ],
)

// ---------------------------------------------------------------------------
// Phase 2 · Assess
// ---------------------------------------------------------------------------
const FLOW_P2 = flow([mkBand('managed', 'Managed · Assess', 1, 6)], [
  {
    col: 1,
    title: 'Open Lifecycle Tab',
    stage: 'managed',
    badge: 'Managed · Assess',
    actor: 'AI Steward',
    actorIcon: 'userCheck',
    record: 'Lifecycle · Assess',
    recordIcon: 'workflow',
    icon: 'workflow',
    desc: 'Open the asset → Lifecycle tab. Assess is active; Build & Test and Deploy are locked.',
  },
  {
    col: 2,
    title: 'Value Template Task',
    stage: 'managed',
    badge: 'Managed · Assess',
    actor: 'AI Steward',
    actorIcon: 'userCheck',
    record: 'Value template',
    recordIcon: 'gauge',
    icon: 'gauge',
    desc: 'Verify the Default Agent Template (Persona, Category, 50% acceptance), then mark Complete.',
  },
  {
    col: 3,
    title: 'Impact Assessment Task',
    stage: 'managed',
    badge: 'Managed · Assess',
    actor: 'AI Steward',
    actorIcon: 'userCheck',
    record: 'Take assessment',
    recordIcon: 'clipboard',
    icon: 'clipboard',
    desc: 'Open the Impact Assessment task and click Take assessment to launch the questionnaire.',
  },
  {
    col: 4,
    title: 'Complete Questionnaire',
    stage: 'managed',
    badge: 'Managed · Assess',
    actor: 'AI Steward',
    actorIcon: 'userCheck',
    record: 'AI Impact Assessment',
    recordIcon: 'fileSearch',
    icon: 'fileSearch',
    desc: 'Answer data handling, decision-making, bias & fairness, transparency and human oversight.',
  },
  {
    col: 5,
    title: 'Auto Risk Score',
    stage: 'managed',
    badge: 'Managed · Assess',
    actor: 'System · Scoring',
    actorIcon: 'cpu',
    record: 'Inherent Risk Score',
    recordIcon: 'shieldAlert',
    icon: 'shieldAlert',
    desc: 'On submit, weighted answers compute a score → Risk classification flips to High.',
  },
  {
    col: 6,
    title: 'Mark Assess Complete',
    stage: 'managed',
    badge: 'Managed · Assess',
    actor: 'AI Steward',
    actorIcon: 'userCheck',
    record: 'Build & Test unlocks',
    recordIcon: 'checkCircle',
    icon: 'checkCircle',
    desc: 'With all Assess tasks done, complete the phase; the Build & Test phase unlocks.',
  },
])

// ---------------------------------------------------------------------------
// Phase 3 · Risk & Compliance deep dive
// ---------------------------------------------------------------------------
const FLOW_P3 = flow([mkBand('managed', 'Managed · Risk & Compliance', 1, 7)], [
  {
    col: 1,
    title: 'Open Risk & Compliance Tab',
    stage: 'managed',
    badge: 'Managed · R&C',
    actor: 'AI Steward',
    actorIcon: 'userCheck',
    record: 'Risk & compliance',
    recordIcon: 'shieldCheck',
    icon: 'shieldCheck',
    desc: 'With the content pack installed and the assessment done, open the Risk & compliance tab.',
  },
  {
    col: 2,
    title: 'AI Assessments',
    stage: 'managed',
    badge: 'Managed · R&C',
    actor: 'Risk & Compliance Mgr',
    actorIcon: 'shield',
    record: 'AIA records',
    recordIcon: 'fileSearch',
    icon: 'fileSearch',
    desc: 'Formal records; New → template (EU AI Act, NIST). Weighted Qs → Inherent Risk Score.',
  },
  {
    col: 3,
    title: 'Risks',
    stage: 'managed',
    badge: 'Managed · R&C',
    actor: 'Risk & Compliance Mgr',
    actorIcon: 'shield',
    record: 'Risk register',
    recordIcon: 'shieldAlert',
    icon: 'shieldAlert',
    desc: 'Risks auto-created from templates; manual add scores likelihood × impact = residual risk.',
  },
  {
    col: 4,
    title: 'Controls',
    stage: 'managed',
    badge: 'Managed · R&C',
    actor: 'Risk & Compliance Mgr',
    actorIcon: 'shield',
    record: 'Control library',
    recordIcon: 'shieldCheck',
    icon: 'shieldCheck',
    desc: 'Link content-pack controls to risks. Residual = inherent × (1 − control effectiveness).',
  },
  {
    col: 5,
    title: 'Attestations',
    stage: 'managed',
    badge: 'Managed · R&C',
    actor: 'Control Owner',
    actorIcon: 'userCog',
    record: 'Classic attestation',
    recordIcon: 'clipboardCheck',
    icon: 'clipboardCheck',
    desc: 'Owners attest controls are operating → feeds Compliance by authority documents.',
  },
  {
    col: 6,
    title: 'Regulatory Assessments',
    stage: 'managed',
    badge: 'Managed · R&C',
    actor: 'Risk & Compliance Mgr',
    actorIcon: 'shield',
    record: 'EU AI Act · GDPR · NIST',
    recordIcon: 'scale',
    icon: 'scale',
    desc: 'Run framework assessments mapped to articles (e.g. EU AI Act Art. 9 Risk Management).',
  },
  {
    col: 7,
    title: 'Risk Roll-up',
    stage: 'managed',
    badge: 'Managed · R&C',
    actor: 'Risk & Compliance Mgr',
    actorIcon: 'shield',
    record: 'Inherent Risk Rating',
    recordIcon: 'layers',
    icon: 'layers',
    desc: 'Risk Assessment aggregates every risk into one rating; Bulk runs it across many assets.',
  },
])

// ---------------------------------------------------------------------------
// Phase 4 · Build & Test
// ---------------------------------------------------------------------------
const FLOW_P4 = flow([mkBand('managed', 'Managed · Build & Test', 1, 6)], [
  {
    col: 1,
    title: 'Open Build & Test Phase',
    stage: 'managed',
    badge: 'Managed · Build',
    actor: 'AI Steward',
    actorIcon: 'userCheck',
    record: 'Lifecycle · Build & test',
    recordIcon: 'flask',
    icon: 'flask',
    desc: 'Open the asset → Lifecycle tab → Build & Test phase (now unlocked).',
  },
  {
    col: 2,
    title: 'Architecture Review',
    stage: 'managed',
    badge: 'Managed · Build',
    actor: 'Asset Owner · Dev',
    actorIcon: 'userCog',
    record: 'Auto task',
    recordIcon: 'cpu',
    icon: 'cpu',
    desc: 'Validate the agent architecture and integration design.',
  },
  {
    col: 3,
    title: 'Security Testing',
    stage: 'managed',
    badge: 'Managed · Build',
    actor: 'Asset Owner · Dev',
    actorIcon: 'userCog',
    record: 'Auto task',
    recordIcon: 'lock',
    icon: 'lock',
    desc: 'Run security testing validation — guardrails, prompt-injection and access checks.',
  },
  {
    col: 4,
    title: 'Performance Benchmark',
    stage: 'managed',
    badge: 'Managed · Build',
    actor: 'Asset Owner · Dev',
    actorIcon: 'userCog',
    record: 'Auto task',
    recordIcon: 'activity',
    icon: 'activity',
    desc: 'Benchmark accuracy and performance against expected thresholds.',
  },
  {
    col: 5,
    title: 'HIPAA Validation',
    stage: 'managed',
    badge: 'Managed · Build',
    actor: 'AI Steward',
    actorIcon: 'userCheck',
    record: 'Custom task',
    recordIcon: 'heartPulse',
    icon: 'heartPulse',
    desc: 'Steward adds a custom task — HIPAA compliance validation for the Patient Data Agent.',
  },
  {
    col: 6,
    title: 'Mark Phase Complete',
    stage: 'managed',
    badge: 'Managed · Build',
    actor: 'AI Steward',
    actorIcon: 'userCheck',
    record: 'Deploy unlocks',
    recordIcon: 'checkCircle',
    icon: 'checkCircle',
    desc: 'With all tasks done, complete Build & Test; the Deploy phase unlocks.',
  },
])

// ---------------------------------------------------------------------------
// Phase 5 · Deploy
// ---------------------------------------------------------------------------
const FLOW_P5 = flow(
  [mkBand('managed', 'Managed · Deploy review', 1, 4), mkBand('deployed', 'Deployed', 5, 2)],
  [
    {
      col: 1,
      title: 'Open Deploy Phase',
      stage: 'managed',
      badge: 'Managed · Deploy',
      actor: 'AI Steward',
      actorIcon: 'userCheck',
      record: 'Lifecycle · Deploy',
      recordIcon: 'rocket',
      icon: 'rocket',
      desc: 'Open the asset → Lifecycle tab → Deploy phase.',
    },
    {
      col: 2,
      title: 'Review Tasks',
      stage: 'managed',
      badge: 'Managed · Deploy',
      actor: 'AI Steward',
      actorIcon: 'userCheck',
      record: 'Assess + Build/Test',
      recordIcon: 'clipboard',
      icon: 'clipboard',
      desc: 'Review all completed Assess and Build & Test tasks before deciding.',
    },
    {
      col: 3,
      title: 'Confirm Risk Score',
      stage: 'managed',
      badge: 'Managed · Deploy',
      actor: 'AI Steward',
      actorIcon: 'userCheck',
      record: 'Risk score dropdown',
      recordIcon: 'shieldAlert',
      icon: 'shieldAlert',
      desc: 'The assessment pre-populates a recommended score; the steward confirms or overrides it.',
    },
    {
      col: 4,
      title: 'Close Notes',
      stage: 'managed',
      badge: 'Managed · Deploy',
      actor: 'AI Steward',
      actorIcon: 'userCheck',
      record: 'Governance decision',
      recordIcon: 'penLine',
      icon: 'penLine',
      desc: 'Write close notes summarising the decision and conditions (e.g. quarterly attestation).',
    },
    {
      col: 5,
      title: 'Approve / Reject',
      stage: 'deployed',
      badge: 'Deployed',
      actor: 'AI Steward',
      actorIcon: 'userCheck',
      record: 'Approve asset',
      recordIcon: 'badge',
      icon: 'badge',
      desc: 'Final governance gate: Approve asset (or Reject).',
    },
    {
      col: 6,
      title: 'Deployed',
      stage: 'deployed',
      badge: 'Deployed',
      actor: 'AI Steward · Owner',
      actorIcon: 'userCheck',
      record: 'Risk classification',
      recordIcon: 'shieldCheck',
      icon: 'checkCircle',
      desc: 'Status → Deployed; the asset shows a real Risk classification (Low / Medium / High).',
    },
  ],
)

// ---------------------------------------------------------------------------
// Final · AI Discovery Workflow — milestone view (one beat per phase)
// ---------------------------------------------------------------------------
const FLOW_FINAL_MILESTONE = flow(
  [
    mkBand('unmanaged', 'Unmanaged', 1, 2),
    mkBand('managed', 'Managed', 3, 4),
    mkBand('deployed', 'Deployed', 7, 4),
  ],
  [
    {
      col: 1,
      title: 'Shadow AI Detected',
      stage: 'unmanaged',
      badge: 'Phase 0 · Unmanaged',
      actor: 'System · Discovery',
      actorIcon: 'cpu',
      record: '293 Unmanaged',
      recordIcon: 'boxes',
      icon: 'scan',
      desc: 'Discovery surfaces ungoverned AI agents into the inventory with zero governance.',
    },
    {
      col: 2,
      title: 'Move to Managed',
      stage: 'unmanaged',
      badge: 'Phase 1 · Promote',
      actor: 'AI Steward',
      actorIcon: 'userCheck',
      record: 'Move to Managed',
      recordIcon: 'arrowUp',
      icon: 'arrowUp',
      desc: 'Steward promotes the asset; the AI Asset Onboarding playbook is triggered.',
    },
    {
      col: 3,
      title: 'Onboarding Playbook',
      stage: 'managed',
      badge: 'Phase 1 · Playbook',
      actor: 'System · Playbook',
      actorIcon: 'workflow',
      record: 'AI Asset Onboarding',
      recordIcon: 'workflow',
      icon: 'workflow',
      desc: 'Playbook creates the Assess, Build & Test and Deploy lifecycle phases + tasks.',
    },
    {
      col: 4,
      title: 'Assess & Score',
      stage: 'managed',
      badge: 'Phase 2 · Assess',
      actor: 'AI Steward',
      actorIcon: 'userCheck',
      record: 'Impact → risk score',
      recordIcon: 'shieldAlert',
      icon: 'clipboard',
      desc: 'Value Template + Impact Assessment questionnaire auto-compute the risk score.',
    },
    {
      col: 5,
      title: 'Risk & Compliance',
      stage: 'managed',
      badge: 'Phase 3 · R&C',
      actor: 'Risk & Compliance Mgr',
      actorIcon: 'shield',
      record: 'Risks · Controls',
      recordIcon: 'shieldCheck',
      icon: 'shieldCheck',
      desc: 'Risks, controls, attestations & regulatory assessments populate the record.',
    },
    {
      col: 6,
      title: 'Build & Test',
      stage: 'managed',
      badge: 'Phase 4 · Build',
      actor: 'Asset Owner · Dev',
      actorIcon: 'userCog',
      record: 'Arch · Security · HIPAA',
      recordIcon: 'flask',
      icon: 'flask',
      desc: 'Architecture, security, performance & HIPAA validation tasks are completed.',
    },
    {
      col: 7,
      title: 'Deploy Approval',
      stage: 'deployed',
      badge: 'Phase 5 · Deploy',
      actor: 'AI Steward',
      actorIcon: 'userCheck',
      record: 'Approve + notes',
      recordIcon: 'badge',
      icon: 'badge',
      desc: 'Risk score confirmed, close notes written, and the asset is approved.',
    },
    {
      col: 8,
      title: 'Deployed',
      stage: 'deployed',
      badge: 'Deployed',
      actor: 'AI Steward · Owner',
      actorIcon: 'userCheck',
      record: 'Risk classification',
      recordIcon: 'shieldCheck',
      icon: 'checkCircle',
      desc: 'Status → Deployed with a real Low / Medium / High risk classification.',
    },
    {
      col: 9,
      title: 'Security Score',
      stage: 'deployed',
      badge: 'Monitor',
      actor: 'System',
      actorIcon: 'cpu',
      record: 'AI Asset Security Score',
      recordIcon: 'gauge',
      icon: 'gauge',
      desc: 'The asset surfaces in the security score & improvement findings for remediation.',
    },
    {
      col: 10,
      title: 'Monitor & AI Cases',
      stage: 'deployed',
      badge: 'Monitor',
      actor: 'AI Steward · R&C Mgr',
      actorIcon: 'userCheck',
      record: 'Guardrails · AI cases',
      recordIcon: 'siren',
      icon: 'eye',
      desc: 'Guardrail logs are tracked and AI cases opened for ongoing monitoring of the asset.',
    },
  ],
)

// ---------------------------------------------------------------------------
// Final · AI Discovery Workflow — detailed view (every sub-step chained)
// ---------------------------------------------------------------------------
const DETAILED_NODES: FlowNode[] = [
  ...FLOW_P0.nodes,
  ...FLOW_P1.nodes,
  ...FLOW_P2.nodes,
  ...FLOW_P3.nodes,
  ...FLOW_P4.nodes,
  ...FLOW_P5.nodes,
].map((node, i) => ({ ...node, col: i + 1 }))

// Stages run contiguously through the chained phases, so a min/max sweep per
// stage yields clean, non-overlapping swimlane bands.
function bandsFromNodes(nodes: FlowNode[]): Band[] {
  const order: Stage[] = ['unmanaged', 'managed', 'deployed']
  const labels: Record<Stage, string> = {
    unmanaged: 'Unmanaged',
    managed: 'Managed',
    deployed: 'Deployed',
  }
  return order
    .filter((stage) => nodes.some((n) => n.stage === stage))
    .map((stage) => {
      const cols = nodes.filter((n) => n.stage === stage).map((n) => n.col)
      const startCol = Math.min(...cols)
      return mkBand(stage, labels[stage], startCol, Math.max(...cols) - startCol + 1)
    })
}

const FLOW_FINAL_DETAILED: FlowDef = {
  cols: DETAILED_NODES.length,
  bands: bandsFromNodes(DETAILED_NODES),
  nodes: DETAILED_NODES,
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
type Tab = {
  key: string
  num: string
  short: string
  heading: string
  sub: string
  flow?: FlowDef
}

const TABS: Tab[] = [
  {
    key: 'p0',
    num: '0',
    short: 'Shadow AI',
    heading: 'Phase 0 · Shadow AI Discovery',
    sub: 'Unmanaged AI surfaced by discovery — 293 ungoverned assets in limbo.',
    flow: FLOW_P0,
  },
  {
    key: 'p1',
    num: '1',
    short: 'Move to Managed',
    heading: 'Phase 1 · Move to Managed',
    sub: 'AI Steward promotes the asset — Unmanaged → Managed triggers the onboarding playbook.',
    flow: FLOW_P1,
  },
  {
    key: 'p2',
    num: '2',
    short: 'Assess',
    heading: 'Phase 2 · Assess',
    sub: 'Value Template + Impact Assessment questionnaire → auto-calculated risk score.',
    flow: FLOW_P2,
  },
  {
    key: 'p3',
    num: '3',
    short: 'Risk & Compliance',
    heading: 'Phase 3 · Risk & Compliance Deep Dive',
    sub: 'Populate Risks, Controls, Attestations & Regulatory assessments.',
    flow: FLOW_P3,
  },
  {
    key: 'p4',
    num: '4',
    short: 'Build & Test',
    heading: 'Phase 4 · Build & Test',
    sub: 'Architecture, security, performance & HIPAA validation tasks.',
    flow: FLOW_P4,
  },
  {
    key: 'p5',
    num: '5',
    short: 'Deploy',
    heading: 'Phase 5 · Deploy',
    sub: 'Final approval, risk score & close notes → Deployed with a real classification.',
    flow: FLOW_P5,
  },
  {
    key: 'final',
    num: '★',
    short: 'Final AI Discovery Workflow',
    heading: 'Final · AI Discovery Workflow',
    sub: 'End-to-end: Unmanaged shadow AI → governed, deployed & monitored asset.',
    // flow resolved dynamically (milestone vs detailed)
  },
]

const STATE_CARD: Record<FlowState, string> = {
  waiting: 'border-slate-200 bg-white text-slate-400 opacity-70',
  active:
    'border-[#0f5f8c] bg-white text-[#0f5f8c] shadow-[0_0_0_4px_rgba(15,95,140,0.16)] -translate-y-1',
  completed: 'border-[#12805c] bg-white text-[#12805c]',
}

const EDGE_COLOR: Record<FlowState, string> = {
  waiting: '#cbd5e1',
  active: '#0f5f8c',
  completed: '#12805c',
}

const SPEED_MS = 1500

type DrawnEdge = { d: string; status: FlowState }

type Props = {
  open: boolean
  onClose: () => void
}

export function ShadowAiWorkflowModal({ open, onClose }: Props) {
  const [activeKey, setActiveKey] = useState('p0')
  const [detailed, setDetailed] = useState(false)

  // Reset to the first tab / milestone view whenever the modal is (re)opened.
  useEffect(() => {
    if (!open) return
    setActiveKey('p0')
    setDetailed(false)
  }, [open])

  // Esc closes the modal.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const activeTab = TABS.find((t) => t.key === activeKey) ?? TABS[0]
  const isFinal = activeTab.key === 'final'
  const activeFlow = isFinal
    ? detailed
      ? FLOW_FINAL_DETAILED
      : FLOW_FINAL_MILESTONE
    : activeTab.flow!

  if (!open) return null

  const detailToggle = isFinal ? (
    <button
      type="button"
      onClick={() => setDetailed((v) => !v)}
      title={detailed ? 'Collapse back to the milestone flow' : 'Expand every sub-step from all phases'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold transition-colors',
        detailed
          ? 'border-[#143A57] bg-[#143A57] text-white hover:bg-[#1d4d73]'
          : 'border-[#0f5f8c] bg-[#e7f3f8] text-[#0f5f8c] hover:bg-[#d8edf5]',
      )}
    >
      {detailed ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      {detailed ? 'Milestone view' : 'Detailed view'}
    </button>
  ) : null

  return (
    <div className="fixed inset-0 z-[100] bg-[#102033]/45 backdrop-blur-[1px]">
      <button type="button" aria-label="Close workflow" onClick={onClose} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 p-4 md:p-6">
        <div className="pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-[#143A57] text-white">
                <Workflow className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#102033]">
                  Shadow AI Discovery — End-to-End Governance Workflow
                </h2>
                <p className="text-[11px] font-medium text-slate-500">
                  Six lifecycle phases from unmanaged discovery to a governed, deployed AI asset.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-md bg-[#143A57] text-white hover:bg-[#1d4d73]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
            {TABS.map((tab) => {
              const active = tab.key === activeKey
              const final = tab.key === 'final'
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveKey(tab.key)}
                  className={cn(
                    'group inline-flex flex-shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors',
                    active
                      ? 'border-[#143A57] bg-[#143A57] text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-[#cfe0ea] hover:bg-slate-50',
                    final && !active && 'border-[#cfe0ea] bg-[#f3f9fc] text-[#0f5f8c]',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-5 w-5 flex-shrink-0 place-items-center rounded-full text-[10px] font-bold',
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                      final && !active && 'bg-[#e7f3f8] text-[#0f5f8c]',
                    )}
                  >
                    {final ? <Workflow className="h-3 w-3" /> : tab.num}
                  </span>
                  <span className={cn(final ? 'whitespace-nowrap' : 'max-[760px]:hidden')}>
                    {final ? tab.short : `Phase ${tab.num}`}
                  </span>
                  {!final && (
                    <span className="hidden text-[11px] font-semibold opacity-80 min-[1024px]:inline">
                      · {tab.short}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Active flow (remounts on tab / view change to restart the run) */}
          <FlowCanvas
            key={`${activeKey}:${detailed}`}
            flow={activeFlow}
            heading={activeTab.heading}
            sub={activeTab.sub}
            extraControls={detailToggle}
          />

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 border-t border-slate-200 bg-slate-50 px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <div className="flex items-center gap-4">
              <LegendDot color="#12805c" label="Completed" />
              <LegendDot color="#0f5f8c" label="In progress" />
              <LegendDot color="#cbd5e1" label="Pending" />
            </div>
            <span className="text-slate-400">Lifecycle: Unmanaged → Managed → Deployed</span>
          </div>
        </div>
      </div>
    </div>
  )
}

type FlowCanvasProps = {
  flow: FlowDef
  heading: string
  sub: string
  extraControls?: ReactNode
}

function FlowCanvas({ flow, heading, sub, extraControls }: FlowCanvasProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [isAuto, setIsAuto] = useState(true)
  const [edges, setEdges] = useState<DrawnEdge[]>([])
  const gridRef = useRef<HTMLDivElement | null>(null)
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const lastIndex = flow.nodes.length - 1
  const wide = flow.cols > 9

  // Auto-advance through the nodes.
  useEffect(() => {
    if (!isAuto || stepIndex >= lastIndex) return
    const timer = window.setInterval(() => {
      setStepIndex((prev) => (prev >= lastIndex ? prev : prev + 1))
    }, SPEED_MS)
    return () => window.clearInterval(timer)
  }, [isAuto, stepIndex, lastIndex])

  // Space / Enter step forward (unless a control has focus).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      const tag = (document.activeElement?.tagName ?? '').toUpperCase()
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      setStepIndex((prev) => Math.min(prev + 1, lastIndex))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lastIndex])

  const stateOf = (col: number): FlowState => {
    const idx = col - 1
    if (idx < stepIndex) return 'completed'
    if (idx === stepIndex) return 'active'
    return 'waiting'
  }

  // Measure rendered cards and draw connectors between consecutive nodes.
  useEffect(() => {
    const computeEdges = () => {
      const grid = gridRef.current
      if (!grid) return
      const bounds = grid.getBoundingClientRect()
      const next: DrawnEdge[] = []

      for (let e = 0; e < flow.nodes.length - 1; e += 1) {
        const fromEl = nodeRefs.current[e + 1]
        const toEl = nodeRefs.current[e + 2]
        if (!fromEl || !toEl) continue
        const fromRect = fromEl.getBoundingClientRect()
        const toRect = toEl.getBoundingClientRect()

        const fromRight = fromRect.right - bounds.left
        const fromCy = fromRect.top - bounds.top + fromRect.height / 2
        const toLeft = toRect.left - bounds.left
        const toCy = toRect.top - bounds.top + toRect.height / 2

        const targetStep = e + 1
        const status: FlowState =
          targetStep < stepIndex ? 'completed' : targetStep === stepIndex ? 'active' : 'waiting'

        next.push({ d: `M ${fromRight} ${fromCy} L ${toLeft} ${toCy}`, status })
      }

      setEdges(next)
    }

    const raf = window.requestAnimationFrame(computeEdges)
    const ro = new ResizeObserver(() => computeEdges())
    if (gridRef.current) ro.observe(gridRef.current)
    window.addEventListener('resize', computeEdges)

    return () => {
      window.cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', computeEdges)
    }
  }, [flow, stepIndex])

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${flow.cols}, minmax(150px, 1fr))`,
      gridTemplateRows: '46px 1fr',
      minWidth: wide ? flow.cols * 162 : undefined,
      maxWidth: wide ? undefined : 1640,
    }),
    [flow.cols, wide],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Control strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-[#102033]">{heading}</h3>
          <p className="truncate text-[11px] font-medium text-slate-500">{sub}</p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2.5">
          {extraControls}
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-500">
            Step {Math.min(stepIndex + 1, flow.nodes.length)} / {flow.nodes.length}
          </span>
          <button
            type="button"
            onClick={() => setIsAuto((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold transition-colors',
              isAuto
                ? 'border-[#0f5f8c] bg-[#e7f3f8] text-[#0f5f8c]'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {isAuto ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isAuto ? 'Auto' : 'Manual'}
          </button>
          <span className="hidden items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-500 sm:inline-flex">
            <Keyboard className="h-3.5 w-3.5" /> Space / Enter
          </span>
          <button
            type="button"
            onClick={() => {
              setStepIndex(0)
              setIsAuto(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Flow */}
      <div className="relative min-h-0 flex-1 overflow-auto bg-slate-100/70 p-3">
        <div
          ref={gridRef}
          className="relative mx-auto grid h-full min-h-[360px] w-full gap-x-4 px-5 pb-6 pt-3"
          style={gridStyle}
        >
          {/* Lifecycle swimlane bands */}
          {flow.bands.map((band) => (
            <div
              key={`${band.stage}-${band.startCol}`}
              style={{ gridColumn: `${band.startCol} / span ${band.span}`, gridRow: '1 / 3' }}
              className={cn(
                'pointer-events-none relative z-0 rounded-2xl border-2 border-dashed',
                STAGE_STYLE[band.stage].wrap,
              )}
            >
              <span
                className={cn(
                  'absolute left-3 top-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  STAGE_STYLE[band.stage].pill,
                )}
              >
                {band.label}
              </span>
            </div>
          ))}

          {/* Connectors */}
          <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible">
            <defs>
              {(['waiting', 'active', 'completed'] as FlowState[]).map((s) => (
                <marker
                  key={s}
                  id={`shadowai-arrow-${s}`}
                  markerWidth="7"
                  markerHeight="7"
                  refX="5.5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M 0 0 L 7 3 L 0 6 z" fill={EDGE_COLOR[s]} />
                </marker>
              ))}
            </defs>
            {edges.map((edge, i) => (
              <path
                key={`${edge.d}-${i}`}
                d={edge.d}
                fill="none"
                stroke={EDGE_COLOR[edge.status]}
                strokeWidth={2}
                markerEnd={`url(#shadowai-arrow-${edge.status})`}
                strokeDasharray={edge.status === 'active' ? '6 6' : undefined}
                className={edge.status === 'active' ? 'animate-[dash_0.6s_linear_infinite]' : undefined}
              />
            ))}
          </svg>

          {/* Phase nodes */}
          {flow.nodes.map((node) => {
            const state = stateOf(node.col)
            const Icon = ICONS[node.icon]
            const ActorIcon = ICONS[node.actorIcon]
            const RecordIcon = node.recordIcon ? ICONS[node.recordIcon] : null
            const pill = STAGE_STYLE[node.stage].pill
            return (
              <div
                key={node.col}
                style={{ gridColumn: node.col, gridRow: 2 }}
                className="relative z-10 flex items-center justify-center px-1"
              >
                <div
                  ref={(el) => {
                    nodeRefs.current[node.col] = el
                  }}
                  className={cn(
                    'relative flex w-full max-w-[172px] flex-col items-center gap-1.5 rounded-xl border-2 px-2.5 py-3 text-center transition-all duration-300',
                    STATE_CARD[state],
                  )}
                >
                  <span className="absolute -left-2.5 -top-2.5 grid h-6 w-6 place-items-center rounded-full border-2 border-current bg-white text-[11px] font-bold">
                    {node.col}
                  </span>

                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-current/10">
                    <Icon className="h-4 w-4" />
                  </span>

                  <p className="text-[11.5px] font-bold leading-tight text-[#102033]">{node.title}</p>

                  <span
                    className={cn(
                      'rounded-full border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide',
                      pill,
                    )}
                  >
                    {node.badge}
                  </span>

                  <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-semibold text-slate-600">
                    <ActorIcon className="h-2.5 w-2.5 flex-shrink-0" />
                    <span className="truncate">{node.actor}</span>
                  </span>

                  {node.record && RecordIcon && (
                    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[8.5px] font-semibold text-slate-500">
                      <RecordIcon className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{node.record}</span>
                    </span>
                  )}

                  <p className="text-[9.5px] leading-snug text-slate-500">{node.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
