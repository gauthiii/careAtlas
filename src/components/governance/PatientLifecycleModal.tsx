import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Bell,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Database,
  DoorOpen,
  FileText,
  HeartPulse,
  Keyboard,
  Lock,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserPlus,
  Workflow,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn'

const ICONS = {
  verify: UserCheck,
  create: UserPlus,
  triage: HeartPulse,
  schedule: CalendarCheck,
  booking: ShieldCheck,
  encounter: Stethoscope,
  notes: NotebookPen,
  discharge: ClipboardCheck,
  reminder: Bell,
  integrity: Database,
  clipboard: ClipboardList,
  file: FileText,
  activity: Activity,
  door: DoorOpen,
  workflow: Workflow,
}

type IconKey = keyof typeof ICONS
type PhaseKey = 'onboarding' | 'scheduling' | 'encounter' | 'discharge'
type FlowState = 'waiting' | 'active' | 'completed'

type Step = {
  n: number
  /** Grid column (1-based) — also the running step order. */
  col: number
  title: string
  phase: PhaseKey
  agent: string
  table: string
  tableIcon: IconKey
  icon: IconKey
  desc: string
}

// The ten agent hand-offs that move a patient end-to-end through the secure
// digital-hospital lifecycle, grouped into the four lifecycle phases.
const STEPS: Step[] = [
  {
    n: 1,
    col: 1,
    title: 'Verify Patient Agent',
    phase: 'onboarding',
    agent: 'Verify Patient DG1',
    table: 'u_patient',
    tableIcon: 'clipboard',
    icon: 'verify',
    desc: 'Checks submitted identity against u_patient and scores a match to block duplicates.',
  },
  {
    n: 2,
    col: 2,
    title: 'Create Patient Agent',
    phase: 'onboarding',
    agent: 'Create Patients DG1',
    table: 'u_patient',
    tableIcon: 'clipboard',
    icon: 'create',
    desc: 'On a unique identity, writes core demographics while hiding sensitive PII/PHI fields.',
  },
  {
    n: 3,
    col: 3,
    title: 'Triage Agent',
    phase: 'scheduling',
    agent: 'Triage Appointment DG1',
    table: 'u_appointment',
    tableIcon: 'clipboard',
    icon: 'triage',
    desc: 'Reads the visit reason, sets clinical urgency and escalates high-risk requests.',
  },
  {
    n: 4,
    col: 4,
    title: 'Scheduling Agent',
    phase: 'scheduling',
    agent: 'Schedule Appointment DG1',
    table: 'u_doctor_availability',
    tableIcon: 'door',
    icon: 'schedule',
    desc: 'Correlates the patient, doctor availability and constraints to find a clean slot.',
  },
  {
    n: 5,
    col: 5,
    title: 'Governed Booking',
    phase: 'scheduling',
    agent: 'Action Fabric Booking',
    table: 'u_appointment',
    tableIcon: 'clipboard',
    icon: 'booking',
    desc: 'The single-door checkpoint: 5 native safety checks before writing u_appointment.',
  },
  {
    n: 6,
    col: 6,
    title: 'Clinical Encounter Agent',
    phase: 'encounter',
    agent: 'Clinical Encounter DG1',
    table: 'u_appointment',
    tableIcon: 'clipboard',
    icon: 'encounter',
    desc: "Parses the doctor's notes, maps them to medical coding and stages record updates.",
  },
  {
    n: 7,
    col: 7,
    title: 'Notes Summary Agent',
    phase: 'encounter',
    agent: 'Notes Summary Agent',
    table: 'u_patient',
    tableIcon: 'clipboard',
    icon: 'notes',
    desc: 'Condenses dense clinical dialogue into skimmable summaries for the physician.',
  },
  {
    n: 8,
    col: 8,
    title: 'Discharge Coordinator',
    phase: 'discharge',
    agent: 'Discharge Coordinator DG1',
    table: 'u_appointment',
    tableIcon: 'clipboard',
    icon: 'discharge',
    desc: 'Reconciles encounter logs, verifies checkout flags, sets status and clears the room.',
  },
  {
    n: 9,
    col: 9,
    title: 'Reminder Agent',
    phase: 'discharge',
    agent: 'Reminder Agent',
    table: 'u_appointment',
    tableIcon: 'clipboard',
    icon: 'reminder',
    desc: 'Schedules personalised post-discharge care, follow-up testing and medication alerts.',
  },
  {
    n: 10,
    col: 10,
    title: 'Data Integrity & Audit',
    phase: 'discharge',
    agent: 'Data Integrity Agent',
    table: 'u_ai_decision_log',
    tableIcon: 'file',
    icon: 'integrity',
    desc: 'Validates the full transaction and logs it to the tamper-proof audit ledgers.',
  },
]

type PhaseBand = {
  phase: PhaseKey
  label: string
  startCol: number
  span: number
  wrap: string
  pill: string
}

const PHASE_BANDS: PhaseBand[] = [
  {
    phase: 'onboarding',
    label: '1 · Onboarding & Authentication',
    startCol: 1,
    span: 2,
    wrap: 'border-sky-200 bg-sky-50/60',
    pill: 'border-sky-300 bg-sky-100 text-[#0f5f8c]',
  },
  {
    phase: 'scheduling',
    label: '2 · Triage & Governed Scheduling',
    startCol: 3,
    span: 3,
    wrap: 'border-teal-200 bg-teal-50/60',
    pill: 'border-teal-300 bg-teal-100 text-teal-800',
  },
  {
    phase: 'encounter',
    label: '3 · Physician Encounter & Consultation',
    startCol: 6,
    span: 2,
    wrap: 'border-violet-200 bg-violet-50/60',
    pill: 'border-violet-300 bg-violet-100 text-violet-800',
  },
  {
    phase: 'discharge',
    label: '4 · Administrative Discharge & Care Transition',
    startCol: 8,
    span: 3,
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

const SPEED_MS = 1400

type DrawnEdge = { d: string; status: FlowState }

type Props = {
  open: boolean
  onClose: () => void
}

export function PatientLifecycleModal({ open, onClose }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [isAuto, setIsAuto] = useState(true)
  const [edges, setEdges] = useState<DrawnEdge[]>([])
  const gridRef = useRef<HTMLDivElement | null>(null)
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const lastIndex = STEPS.length - 1

  // Restart the run whenever the modal is (re)opened.
  useEffect(() => {
    if (!open) return
    setStepIndex(0)
    setIsAuto(true)
  }, [open])

  // Auto-advance through the steps.
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

  // Measure the rendered cards and draw straight connectors between them.
  useEffect(() => {
    if (!open) return

    const computeEdges = () => {
      const grid = gridRef.current
      if (!grid) return
      const bounds = grid.getBoundingClientRect()
      const next: DrawnEdge[] = []

      for (let e = 0; e < STEPS.length - 1; e += 1) {
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
  }, [open, stepIndex])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-[#102033]/45 backdrop-blur-[1px]">
      <button type="button" aria-label="Close pipeline" onClick={onClose} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 p-4 md:p-6">
        <div className="pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-[#143A57] text-white">
                <HeartPulse className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#102033]">
                  Application Pipeline — Secure Digital Patient Lifecycle
                </h2>
                <p className="text-[11px] font-medium text-slate-500">
                  Registration → Booking → Encounter → Discharge, governed by the AI Control Tower · Step{' '}
                  {stepIndex + 1} of {STEPS.length}
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
              className="relative mx-auto grid h-full min-h-[360px] w-full min-w-[1180px] max-w-[1640px] grid-cols-10 gap-x-3 px-5 pb-5 pt-3"
              style={{ gridTemplateRows: '46px 1fr' }}
            >
              {/* Lifecycle phase bands */}
              {PHASE_BANDS.map((band) => (
                <div
                  key={band.phase}
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
                      id={`lifecycle-arrow-${s}`}
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
                    markerEnd={`url(#lifecycle-arrow-${edge.status})`}
                    strokeDasharray={edge.status === 'active' ? '6 6' : undefined}
                    className={edge.status === 'active' ? 'animate-[dash_0.6s_linear_infinite]' : undefined}
                  />
                ))}
              </svg>

              {/* Step cards */}
              {STEPS.map((step) => {
                const state = stateOf(step.col)
                const Icon = ICONS[step.icon]
                const TableIcon = ICONS[step.tableIcon]
                const band = PHASE_BANDS.find((b) => b.phase === step.phase)!
                return (
                  <div
                    key={step.n}
                    style={{ gridColumn: step.col, gridRow: 2 }}
                    className="relative z-10 flex items-center justify-center px-0.5"
                  >
                    <div
                      ref={(el) => {
                        nodeRefs.current[step.col] = el
                      }}
                      className={cn(
                        'relative flex w-full max-w-[156px] flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-all duration-300',
                        STATE_CARD[state],
                      )}
                    >
                      <span className="absolute -left-2.5 -top-2.5 grid h-6 w-6 place-items-center rounded-full border-2 border-current bg-white text-[11px] font-bold">
                        {step.n}
                      </span>

                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-current/10">
                        <Icon className="h-4 w-4" />
                      </span>

                      <p className="text-[11.5px] font-bold leading-tight text-[#102033]">{step.title}</p>

                      <span
                        className={cn(
                          'rounded-full border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide',
                          band.pill,
                        )}
                      >
                        {step.agent}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-semibold text-slate-600">
                        <TableIcon className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{step.table}</span>
                      </span>

                      <p className="text-[9.5px] leading-snug text-slate-500">{step.desc}</p>
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
            <div className="flex items-center gap-4 normal-case">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <Lock className="h-3 w-3" /> Least privilege enforced at every transition
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="h-3 w-3" /> Shadow AI discovery monitoring
              </span>
            </div>
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
