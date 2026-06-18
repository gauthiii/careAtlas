import { useMemo, useState } from 'react'
import { CheckCheck, LoaderCircle } from 'lucide-react'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { useClinicianSchedule } from '../../hooks/useClinicianSchedule'
import { useNotifications } from '../../hooks/useNotifications'
import { NotificationFeed } from '../../components/NotificationFeed'

export function NotificationsPage() {
  const { doctor } = useClinicianSchedule()
  const { items, unreadCount, isLoading, error, markRead, isRead } = useNotifications(
    'staff',
    doctor?.doctor_record_id,
  )
  const [busy, setBusy] = useState(false)

  const unread = useMemo(() => items.filter((item) => !isRead(item)), [items, isRead])

  async function markAllRead() {
    setBusy(true)
    try {
      await Promise.all(unread.map((item) => markRead(item.sys_id)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <DoctorPage
      title="Notifications"
      intro="Activity across your appointments, summary notes and new patient registrations."
    >
      <section className="grid gap-4">
        <div className="flex items-center justify-between">
          <p className="text-[0.92rem] font-bold text-[#53687b]">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
          {unreadCount > 0 && (
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

        <NotificationFeed
          items={items}
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
