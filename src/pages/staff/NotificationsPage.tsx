import { useMemo, useState } from 'react'
import { CheckCheck, LoaderCircle } from 'lucide-react'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { useClinicianSchedule } from '../../hooks/useClinicianSchedule'
import { useNotifications } from '../../hooks/useNotifications'
import { NotificationFeed } from '../../components/NotificationFeed'
import { cn } from '../../lib/cn'

type StaffTab = 'all' | 'mine'

export function NotificationsPage() {
  const { doctor } = useClinicianSchedule()
  const doctorSysId = doctor?.doctor_record_id
  const { items, isLoading, error, markRead, isRead } = useNotifications('staff', doctorSysId)
  const [tab, setTab] = useState<StaffTab>('all')
  const [busy, setBusy] = useState(false)

  // "Only mine" = notifications directly linked to this doctor (excludes general
  // staff events like new registrations that have no doctor).
  const visible = useMemo(
    () => (tab === 'mine' ? items.filter((item) => item.doctor_sys_id && item.doctor_sys_id === doctorSysId) : items),
    [items, tab, doctorSysId],
  )

  const unreadVisible = useMemo(() => visible.filter((item) => !isRead(item)), [visible, isRead])
  const mineCount = useMemo(
    () => items.filter((item) => item.doctor_sys_id && item.doctor_sys_id === doctorSysId).length,
    [items, doctorSysId],
  )

  async function markAllRead() {
    setBusy(true)
    try {
      await Promise.all(unreadVisible.map((item) => markRead(item.sys_id)))
    } finally {
      setBusy(false)
    }
  }

  const tabs: { key: StaffTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: items.length },
    { key: 'mine', label: 'Only mine', count: mineCount },
  ]

  return (
    <DoctorPage
      title="Notifications"
      intro="Activity across your appointments, summary notes and new patient registrations."
    >
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-xl border border-[#d7e5ec] bg-[#f7fbfd] p-1">
            {tabs.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setTab(entry.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[0.82rem] font-bold text-[#53687b]',
                  tab === entry.key && 'bg-[#143A57] !text-white',
                )}
              >
                {entry.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[0.68rem] font-black',
                    tab === entry.key ? 'bg-white/20 text-white' : 'bg-[#e3edf3] text-[#607487]',
                  )}
                >
                  {entry.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <p className="text-[0.92rem] font-bold text-[#53687b]">
              {unreadVisible.length > 0 ? `${unreadVisible.length} unread` : 'All caught up'}
            </p>
            {unreadVisible.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#b7ceda] bg-white px-3 py-2 text-[0.82rem] font-bold text-[#0f5f8c] disabled:opacity-60"
              >
                {busy ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCheck size={15} />}
                Mark all read
              </button>
            )}
          </div>
        </div>

        <NotificationFeed
          items={visible}
          isLoading={isLoading}
          error={error}
          isRead={isRead}
          onMarkRead={markRead}
          audience="staff"
        />
      </section>
    </DoctorPage>
  )
}
