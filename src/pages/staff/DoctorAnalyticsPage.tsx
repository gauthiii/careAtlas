import { AlertTriangle, BarChart3, CalendarRange, LoaderCircle, RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { useClinicianSchedule } from '../../hooks/useClinicianSchedule'
import { addDays, dateFromIso, formatShortDate, isCancelledAppointment } from '../../lib/scheduling'

function titleCase(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function DoctorAnalyticsPage() {
  const { doctor, doctorAppointments, error, isLoading, refetch, today } = useClinicianSchedule()

  const stats = useMemo(() => {
    const all = doctorAppointments
    const total = all.length
    const cancelled = all.filter(isCancelledAppointment).length
    const noShow = all.filter((a) => a.status.toLowerCase() === 'no-show').length
    const completed = all.filter((a) => a.status.toLowerCase() === 'completed').length
    const upcoming = all.filter((a) => a.date >= today && !isCancelledAppointment(a)).length

    const byStatus = new Map<string, number>()
    const byReason = new Map<string, number>()
    for (const a of all) {
      const s = (a.status_label || a.status || 'Unknown').trim()
      byStatus.set(s, (byStatus.get(s) ?? 0) + 1)
      const r = (a.reason_category || 'Unspecified').trim()
      byReason.set(r, (byReason.get(r) ?? 0) + 1)
    }

    // Appointments per week for the last 8 weeks.
    const weeks: { label: string; count: number }[] = []
    for (let w = 7; w >= 0; w--) {
      const start = addDays(today, -w * 7)
      const end = addDays(start, 6)
      const count = all.filter((a) => a.date >= start && a.date <= end && !isCancelledAppointment(a)).length
      weeks.push({ label: formatShortDate(start), count })
    }

    const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0

    return {
      total,
      cancelled,
      noShow,
      completed,
      upcoming,
      noShowRate,
      byStatus: [...byStatus.entries()].sort((a, b) => b[1] - a[1]),
      byReason: [...byReason.entries()].sort((a, b) => b[1] - a[1]),
      weeks,
    }
  }, [doctorAppointments, today])

  const maxWeek = Math.max(1, ...stats.weeks.map((w) => w.count))
  const reasonMax = Math.max(1, ...stats.byReason.map(([, n]) => n))

  // dateFromIso kept imported for potential future range use; reference to avoid lint noise
  void dateFromIso

  return (
    <DoctorPage
      title="My analytics"
      intro={`Appointment trends for ${doctor?.name || 'this clinician'}, derived from the loaded scheduling window.`}
    >
      <div className="-mt-3 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-bold text-[#53687b]">
          {isLoading ? (
            <span className="inline-flex items-center gap-2"><LoaderCircle size={16} className="animate-spin" /> Loading</span>
          ) : error ? (
            <span className="inline-flex items-center gap-2 text-[#a22828]"><AlertTriangle size={16} /> {error}</span>
          ) : (
            <span>{stats.total} appointments in window</span>
          )}
        </div>
        <button type="button" onClick={refetch} className="inline-flex items-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-4 py-2 text-sm font-bold text-[#0f5f8c] hover:bg-[#f5f9fb]">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Upcoming" value={stats.upcoming} />
        <StatCard label="Completed" value={stats.completed} tone="emerald" />
        <StatCard label="No-show rate" value={`${stats.noShowRate}%`} tone={stats.noShowRate > 15 ? 'red' : 'default'} sub={`${stats.noShow} no-shows · ${stats.cancelled} cancelled`} />
      </div>

      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><CalendarRange size={18} /> Appointments per week</h3>
          <div className="flex h-44 items-end gap-2">
            {stats.weeks.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="text-xs font-bold text-slate-600">{w.count}</div>
                <div
                  className="w-full rounded-t bg-[#0397AE]"
                  style={{ height: `${Math.max(4, (w.count / maxWeek) * 130)}px` }}
                />
                <div className="text-[10px] text-slate-400">{w.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><BarChart3 size={18} /> By reason</h3>
          {stats.byReason.length === 0 ? (
            <div className="text-sm text-slate-500">No data.</div>
          ) : (
            <div className="space-y-2.5">
              {stats.byReason.map(([reason, n]) => (
                <div key={reason}>
                  <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
                    <span>{titleCase(reason)}</span>
                    <span>{n}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-[#143A57]" style={{ width: `${(n / reasonMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">By status</h3>
          <div className="flex flex-wrap gap-2">
            {stats.byStatus.map(([status, n]) => (
              <span key={status} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                {status}: <strong>{n}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>
    </DoctorPage>
  )
}

function StatCard({ label, value, sub, tone = 'default' }: { label: string; value: string | number; sub?: string; tone?: 'default' | 'emerald' | 'red' }) {
  const color = tone === 'emerald' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : 'text-slate-900'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="mt-2 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}
