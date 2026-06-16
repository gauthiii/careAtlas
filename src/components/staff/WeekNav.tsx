import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, formatShortDate, WEEK_LENGTH } from '../../lib/scheduling'

// Limit navigation to ±1 month (4 weeks) back and forth from the current week.
export const WEEK_OFFSET_MIN = -4
export const WEEK_OFFSET_MAX = 4

export function WeekNav({
  weekOffset,
  weekStart,
  onChange,
}: {
  weekOffset: number
  weekStart: string
  onChange: (next: number) => void
}) {
  const weekEnd = addDays(weekStart, WEEK_LENGTH - 1)
  const atMin = weekOffset <= WEEK_OFFSET_MIN
  const atMax = weekOffset >= WEEK_OFFSET_MAX

  const label =
    weekOffset === 0
      ? 'This week'
      : `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}`

  return (
    <div className="inline-flex items-center gap-1 rounded-[10px] border border-[#d7e5ec] bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange(Math.max(WEEK_OFFSET_MIN, weekOffset - 1))}
        disabled={atMin}
        title="Previous week"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#0f5f8c] hover:bg-[#f5f9fb] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </button>

      <button
        type="button"
        onClick={() => onChange(0)}
        disabled={weekOffset === 0}
        className="min-w-[150px] rounded-lg px-3 py-1.5 text-center text-sm font-bold text-[#102033] hover:bg-[#f5f9fb] disabled:hover:bg-transparent"
      >
        {label}
        <span className="block text-[0.66rem] font-bold uppercase tracking-wide text-[#8295a5]">
          {weekOffset === 0 ? `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}` : 'Back to this week'}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChange(Math.min(WEEK_OFFSET_MAX, weekOffset + 1))}
        disabled={atMax}
        title="Next week"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#0f5f8c] hover:bg-[#f5f9fb] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
