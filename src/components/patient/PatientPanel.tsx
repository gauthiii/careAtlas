import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type PanelTone = 'default' | 'success' | 'warning' | 'danger' | 'secure'
export type StatusTone = 'info' | 'success' | 'warning' | 'danger'

const panelTopBorder: Record<PanelTone, string> = {
  default: 'border-t-[#0f5f8c]',
  success: 'border-t-[#12805c]',
  warning: 'border-t-[#d97706]',
  danger: 'border-t-[#dc2626]',
  secure: 'border-t-[#40566b]',
}

const statusBadgeTone: Record<StatusTone, string> = {
  info: 'bg-[#e7f3f8] text-[#0f5f8c]',
  success: 'bg-[#e8f7ef] text-[#0f6b4f]',
  warning: 'bg-[#fff4df] text-[#9a5a00]',
  danger: 'bg-[#feeceb] text-[#a22828]',
}

export function PatientPanel({
  title,
  icon,
  children,
  tone = 'default',
  className,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  tone?: PanelTone
  className?: string
}) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-[14px] border border-[#d7e5ec] bg-white p-[18px] shadow-[0_12px_30px_rgba(25,64,93,0.07)] max-[720px]:rounded-xl',
        className,
      )}
    >
      <div className="mb-3.5 flex items-center gap-2.5">
        {icon && <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[#e7f3f8] text-[#0f5f8c]">{icon}</span>}
        <h2 className="m-0 text-[1.08rem] tracking-normal font-bold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export function StatusBadge({ children, tone = 'info' }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <span
      className={cn(
        'inline-flex w-max max-w-full rounded-full px-[9px] py-[5px] text-[0.75rem] font-black max-[720px]:w-full',
        statusBadgeTone[tone],
      )}
    >
      {children}
    </span>
  )
}

export function PatientTable({ rows, columns }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="grid gap-2" role="table">
      <div className="grid grid-cols-3 gap-3 border-b border-[#d7e5ec] px-3 py-2.5 max-[720px]:grid-cols-1" role="row">
        {columns.map((column) => (
          <span className="text-[0.74rem] font-black uppercase tracking-[0.06em] text-[#607487]" key={column} role="columnheader">{column}</span>
        ))}
      </div>
      {rows.map((row, index) => (
        <div className="grid grid-cols-3 gap-3 rounded-[10px] border border-[#e5eef3] bg-white px-3 py-2.5 max-[720px]:grid-cols-1" role="row" key={`${row.join('-')}-${index}`}>
          {row.map((cell, cellIndex) => (
            <span className="min-w-0 [overflow-wrap:anywhere] font-bold text-[#40566b]" role="cell" key={`${cell}-${cellIndex}`}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  )
}
