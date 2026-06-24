import { FlaskConical } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Subtle, honest "this is the demonstration layer" chip.
 *
 * Used on the Focus-Five use-case UI that is wired to deterministic client-side
 * mock data/logic while the ServiceNow-backed endpoints are still being built.
 * It reads as production during a live walkthrough but never claims the data is
 * live.
 */
export function DemoTag({
  label = 'Simulated · demo',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      title="This panel is driven by client-side demo data. The live ServiceNow path is added in the backend phase."
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700',
        className,
      )}
    >
      <FlaskConical className="h-3 w-3" />
      {label}
    </span>
  )
}
