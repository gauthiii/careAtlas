const PRIORITY_MAP: Record<string, { label: string; cls: string }> = {
  '1': { label: 'Critical', cls: 'border-red-300 bg-red-50 text-red-700' },
  '2': { label: 'High', cls: 'border-orange-300 bg-orange-50 text-orange-700' },
  '3': { label: 'Moderate', cls: 'border-amber-300 bg-amber-50 text-amber-700' },
  '4': { label: 'Low', cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  '5': { label: 'Planning', cls: 'border-slate-200 bg-slate-50 text-slate-600' },
}

const STATE_MAP: Record<string, { label: string; cls: string }> = {
  '10': { label: 'New', cls: 'border-slate-200 bg-slate-50 text-slate-600' },
  '16': { label: 'Analysis', cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  '18': { label: 'Contain', cls: 'border-amber-300 bg-amber-50 text-amber-700' },
  '19': { label: 'Eradicate', cls: 'border-orange-300 bg-orange-50 text-orange-700' },
  '20': { label: 'Recover', cls: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  '100': { label: 'Review', cls: 'border-purple-200 bg-purple-50 text-purple-700' },
  '3': { label: 'Closed', cls: 'border-green-300 bg-green-50 text-green-700' },
  '7': { label: 'Cancelled', cls: 'border-slate-200 bg-slate-50 text-slate-400' },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITY_MAP[priority] ?? { label: priority || '—', cls: 'border-slate-200 bg-slate-50 text-slate-500' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${p.cls}`}>
      {p.label}
    </span>
  )
}

export function StateBadge({ state }: { state: string }) {
  const s = STATE_MAP[state] ?? { label: state || '—', cls: 'border-slate-200 bg-slate-50 text-slate-500' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  )
}
