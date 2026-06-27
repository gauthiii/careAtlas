import { FileCheck2, Scale } from 'lucide-react'
import { type RegulatoryClassification, type RegulatoryTier } from '../../data/useCaseDemoData'
import { cn } from '../../lib/cn'

const TIER_STYLE: Record<RegulatoryTier, string> = {
  High: 'border-red-300 bg-red-50 text-red-700',
  Medium: 'border-orange-300 bg-orange-50 text-orange-700',
  Low: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  Unacceptable: 'border-red-400 bg-red-100 text-red-800',
  'To be determined': 'border-slate-300 bg-slate-50 text-slate-600',
  Limited: 'border-amber-300 bg-amber-50 text-amber-700',
  Minimal: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  Unverified: 'border-slate-300 bg-slate-50 text-slate-600',
}

/**
 * UC3 · Regulation — read-only EU AI Act classification badge.
 * Shows verified live classification data when supplied. Without live evidence
 * it renders as Unverified rather than guessing from an agent name.
 */
export function RegulatoryClassificationBadge({
  classification,
  compact,
}: {
  agentName?: string
  classification?: RegulatoryClassification
  compact?: boolean
}) {
  const c = classification ?? {
    agent: '',
    tier: 'Unverified' as RegulatoryTier,
    assessment: 'Draft' as const,
    friaAttached: false,
  }

  if (compact) {
    return (
      <span
        title={classification ? `EU AI Act ${c.tier} · ${c.assessment}${c.friaAttached ? ' · FRIA attached' : ''}` : 'Live ServiceNow classification unavailable'}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
          TIER_STYLE[c.tier],
        )}
      >
        <Scale size={11} /> EU AI Act · {c.tier}
      </span>
    )
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
          TIER_STYLE[c.tier],
        )}
      >
        <Scale size={11} /> EU AI Act · {c.tier}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
        {c.assessment}
      </span>
      {c.friaAttached && (
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
          <FileCheck2 size={11} /> FRIA
        </span>
      )}
    </span>
  )
}
