import type { ReactNode } from 'react'

export function PatientPanel({
  title,
  icon,
  children,
  tone = 'default',
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'secure'
}) {
  return (
    <section className={`patient-panel patient-panel-${tone}`}>
      <div className="patient-panel-title">
        {icon && <span>{icon}</span>}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}

export function StatusBadge({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' | 'warning' | 'danger' }) {
  return <span className={`status-badge status-${tone}`}>{children}</span>
}

export function PatientTable({ rows, columns }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="patient-table" role="table">
      <div className="patient-table-head" role="row">
        {columns.map((column) => <span key={column} role="columnheader">{column}</span>)}
      </div>
      {rows.map((row, index) => (
        <div className="patient-table-row" role="row" key={`${row.join('-')}-${index}`}>
          {row.map((cell, cellIndex) => <span role="cell" key={`${cell}-${cellIndex}`}>{cell}</span>)}
        </div>
      ))}
    </div>
  )
}
