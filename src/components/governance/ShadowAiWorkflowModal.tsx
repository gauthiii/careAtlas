import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowUpCircle,
  BadgeCheck,
  ClipboardList,
  Filter,
  FlaskConical,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  Workflow,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn'

const ICONS = {
  scan: ScanSearch,
  clipboard: ClipboardList,
  filter: Filter,
  promote: ArrowUpCircle,
  risk: ShieldAlert,
  flask: FlaskConical,
  badge: BadgeCheck,
  activity: Activity,
  user: User,
  userCheck: UserCheck,
  shield: ShieldCheck,
  workflow: Workflow,
}

type IconKey = keyof typeof ICONS
type Stage = 'unmanaged' | 'managed' | 'deployed'
type FlowState = 'waiting' | 'active' | 'completed'

type Phase = {
  n: number
  /** Grid column (1-based) — also the running step order. */
  col: number
  title: string
  stage: Stage
  stateLabel: string
  role: string
  roleIcon: IconKey
  icon: IconKey
  desc: string
}

// The eight rows of the shadow-AI "End-to-End Workflow" table, in order.
const PHASES: Phase[] = [
  {
    n: 1,
    col: 1,
    title: 'Sync & Detect',
    stage: 'unmanaged',
    stateLabel: 'Unmanaged',
    role: 'System · AI Steward',
    roleIcon: 'workflow',
    icon: 'scan',
    desc: 'Discovery & cloud sync surface shadow AI into the AI Asset Inventory.',
  },
  {
    n: 2,
    col: 2,
    title: 'Intake & Review',
    stage: 'unmanaged',
    stateLabel: 'Unmanaged',
    role: 'AI Governance Steward',
    roleIcon: 'user',
    icon: 'clipboard',
    desc: 'Steward reviews the entry, adds business details & evaluates ownership.',
  },
  {
    n: 3,
    col: 3,
    title: 'Rule Application',
    stage: 'unmanaged',
    stateLabel: 'Unmanaged → Managed',
    role: 'System · Rules Engine',
    roleIcon: 'filter',
    icon: 'filter',
    desc: 'Automation rules assign metadata or auto-promote the asset to Managed.',
  },
  {
    n: 4,
    col: 4,
    title: 'Promotion',
    stage: 'managed',
    stateLabel: 'Managed · Intake',
    role: 'AI Governance Steward',
    roleIcon: 'user',
    icon: 'promote',
    desc: 'Steward promotes the asset to Managed, triggering the governance lifecycle.',
  },
  {
    n: 5,
    col: 5,
    title: 'Assess & Classify',
    stage: 'managed',
    stateLabel: 'Managed · Assess',
    role: 'AI Risk & Compliance Mgr',
    roleIcon: 'shield',
    icon: 'risk',
    desc: 'Formal risk & impact assessments run; risk classification is computed.',
  },
  {
    n: 6,
    col: 6,
    title: 'Build / Evaluate',
    stage: 'managed',
    stateLabel: 'Managed · Build / Evaluate',
    role: 'AI Asset Owner · Dev',
    roleIcon: 'userCheck',
    icon: 'flask',
    desc: 'Guardrails, prompt-injection tests & accuracy evaluation runs are carried out.',
  },
  {
    n: 7,
    col: 7,
    title: 'Approve & Deploy',
    stage: 'deployed',
    stateLabel: 'Deployed',
    role: 'Governance Board · Owner',
    roleIcon: 'badge',
    icon: 'badge',
    desc: 'Final approvals complete; the asset is sanctioned and marked Deployed.',
  },
  {
    n: 8,
    col: 8,
    title: 'Monitor & Track',
    stage: 'deployed',
    stateLabel: 'Deployed · Monitoring',
    role: 'AI Steward · Owner',
    roleIcon: 'activity',
    icon: 'activity',
    desc: 'Guardrail logs & AI Case exceptions are tracked continuously.',
  },
]

type StageBand = {
  stage: Stage
  label: string
  startCol: number
  span: number
  wrap: string
  pill: string
}

const STAGE_BANDS: StageBand[] = [
  {
    stage: 'unmanaged',
    label: 'Unmanaged',
    startCol: 1,
    span: 3,
    wrap: 'border-amber-200 bg-amber-50/60',
    pill: 'border-amber-300 bg-amber-100 text-amber-800',
  },
  {
    stage: 'managed',
    label: 'Managed',
    startCol: 4,
    span: 3,
    wrap: 'border-sky-200 bg-sky-50/60',
    pill: 'border-sky-300 bg-sky-100 text-[#0f5f8c]',
  },
  {
    stage: 'deployed',
    label: 'Deployed',
    startCol: 7,
    span: 2,
    wrap: 'border-emerald-200 bg-emerald-50/60',
    pill: 'border-emerald-300 bg-emerald-100 text-[#12805c]',
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
  const [stepIndex, setStepIndex] = useState(0)
  const [isAuto, setIsAuto] = useState(true)
  const [edges, setEdges] = useState<DrawnEdge[]>([])
  const gridRef = useRef<HTMLDivElement | null>(null)
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const lastIndex = PHASES.length - 1

  // Restart the run whenever the modal is (re)opened.
  useEffect(() => {
    if (!open) return
    setStepIndex(0)
    setIsAuto(true)
  }, [open])

  // Auto-advance through the phases.
  useEffect(() => {
    if (!open || !isAuto || stepIndex >= lastIndex) return
    const timer = window.setInterval(() => {
      setStepIndex((prev) => (prev >= lastIndex ? prev : prev + 1))
    }, SPEED_MS)
    return () => window.clearInterval(timer)
  }, [open, isAuto, stepIndex, lastIndex])

  // Keyboard: Esc closes, Space/Enter steps forward.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setStepIndex((prev) => Math.min(prev + 1, lastIndex))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, lastIndex])

  const stateOf = (col: number): FlowState => {
    const idx = col - 1
    if (idx < stepIndex) return 'completed'
    if (idx === stepIndex) return 'active'
    return 'waiting'
  }

  // Measure the rendered cards and draw straight horizontal connectors between them.
  useEffect(() => {
    if (!open) return

    const computeEdges = () => {
      const grid = gridRef.current
      if (!grid) return
      const bounds = grid.getBoundingClientRect()
      const next: DrawnEdge[] = []

      for (let e = 0; e < PHASES.length - 1; e += 1) {
        const fromEl = nodeRefs.current[e + 1]
        const toEl = nodeRefs.current[e + 2]
        if (!fromEl || !toEl) continue
        const fromRect = fromEl.getBoundingClientRect()
        const toRect = toEl.getBoundingClientRect()

        const fromRight = fromRect.right - bounds.left
        const fromCy = fromRect.top - bounds.top + fromRect.height / 2
        const toLeft = toRect.left - bounds.left
        const toCy = toRect.top - bounds.top + toRect.height / 2
        const cy = (fromCy + toCy) / 2

        // The target card sits at step index (e + 1).
        const targetStep = e + 1
        const status: FlowState =
          targetStep < stepIndex ? 'completed' : targetStep === stepIndex ? 'active' : 'waiting'

        next.push({ d: `M ${fromRight} ${cy} L ${toLeft} ${toCy}`, status })
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
  }, [open, stepIndex])

  if (!open) return null

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
                  From unmanaged discovery to a governed, deployed AI asset · Step{' '}
                  {stepIndex + 1} of {PHASES.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
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
                onClick={() => setStepIndex(0)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-md bg-[#143A57] text-white hover:bg-[#1d4d73]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Flow */}
          <div className="relative min-h-0 flex-1 overflow-auto bg-slate-100/70 p-3">
            <div
              ref={gridRef}
              className="relative mx-auto grid h-full min-h-[360px] w-full min-w-[920px] max-w-[1480px] grid-cols-8 gap-x-4 px-5 pb-5 pt-3"
              style={{ gridTemplateRows: '46px 1fr' }}
            >
              {/* Lifecycle swimlane bands */}
              {STAGE_BANDS.map((band) => (
                <div
                  key={band.stage}
                  style={{ gridColumn: `${band.startCol} / span ${band.span}`, gridRow: '1 / 3' }}
                  className={cn(
                    'pointer-events-none relative z-0 rounded-2xl border-2 border-dashed',
                    band.wrap,
                  )}
                >
                  <span
                    className={cn(
                      'absolute left-3 top-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      band.pill,
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

              {/* Phase cards */}
              {PHASES.map((phase) => {
                const state = stateOf(phase.col)
                const Icon = ICONS[phase.icon]
                const RoleIcon = ICONS[phase.roleIcon]
                const band = STAGE_BANDS.find((b) => b.stage === phase.stage)!
                return (
                  <div
                    key={phase.n}
                    style={{ gridColumn: phase.col, gridRow: 2 }}
                    className="relative z-10 flex items-center justify-center px-1"
                  >
                    <div
                      ref={(el) => {
                        nodeRefs.current[phase.col] = el
                      }}
                      className={cn(
                        'relative flex w-full max-w-[178px] flex-col items-center gap-1.5 rounded-xl border-2 px-2.5 py-3 text-center transition-all duration-300',
                        STATE_CARD[state],
                      )}
                    >
                      <span className="absolute -left-2.5 -top-2.5 grid h-6 w-6 place-items-center rounded-full border-2 border-current bg-white text-[11px] font-bold">
                        {phase.n}
                      </span>

                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-current/10">
                        <Icon className="h-4 w-4" />
                      </span>

                      <p className="text-[11.5px] font-bold leading-tight text-[#102033]">{phase.title}</p>

                      <span
                        className={cn(
                          'rounded-full border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide',
                          band.pill,
                        )}
                      >
                        {phase.stateLabel}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-semibold text-slate-600">
                        <RoleIcon className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{phase.role}</span>
                      </span>

                      <p className="text-[9.5px] leading-snug text-slate-500">{phase.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
