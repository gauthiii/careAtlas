import { useEffect, useRef, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'
import { useNotifications } from '../hooks/useNotifications'
import { usePatientSchedule } from '../hooks/usePatientSchedule'
import { useClinicianSchedule } from '../hooks/useClinicianSchedule'
import { notificationTypeMeta, relativeTime } from '../lib/notifications'
import type { NotificationAudience, NotificationItem } from '../services/serviceNow'

interface NotificationBellProps {
  audience: NotificationAudience
  ownerSysId: string | null | undefined
  viewAllTo: string
}

const PREVIEW_LIMIT = 6

/** Bell button + dropdown widget. Resolve `ownerSysId` from the portal's schedule hook. */
export function NotificationBell({ audience, ownerSysId, viewAllTo }: NotificationBellProps) {
  const { items, unreadCount, isLoading, markRead, isRead } = useNotifications(audience, ownerSysId)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const preview = items.slice(0, PREVIEW_LIMIT)

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        className={cn(
          'relative grid h-[38px] w-[38px] place-items-center rounded-[10px] border border-[#d7e5ec] bg-white text-[#143A57] transition-colors hover:bg-[#f1f7fb]',
          open && 'bg-[#f1f7fb]',
        )}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#d92d20] px-1 text-[0.65rem] font-black leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[14px] border border-[#d7e5ec] bg-white shadow-[0_18px_44px_rgba(25,64,93,0.18)]">
          <div className="flex items-center justify-between border-b border-[#eef4f8] px-4 py-3">
            <strong className="text-[0.95rem] text-[#102033]">Notifications</strong>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#feeceb] px-2 py-0.5 text-[0.72rem] font-bold text-[#a22828]">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading && preview.length === 0 ? (
              <p className="px-4 py-6 text-center text-[0.85rem] font-semibold text-[#607487]">Loading…</p>
            ) : preview.length === 0 ? (
              <p className="px-4 py-6 text-center text-[0.85rem] font-semibold text-[#607487]">
                You have no notifications yet.
              </p>
            ) : (
              preview.map((item) => (
                <NotificationRow
                  key={item.sys_id}
                  item={item}
                  read={isRead(item)}
                  onMarkRead={() => markRead(item.sys_id)}
                />
              ))
            )}
          </div>

          <Link
            to={viewAllTo}
            onClick={() => setOpen(false)}
            className="block border-t border-[#eef4f8] px-4 py-3 text-center text-[0.85rem] font-bold text-[#0f5f8c] hover:bg-[#f7fbfd]"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}

function NotificationRow({
  item,
  read,
  onMarkRead,
}: {
  item: NotificationItem
  read: boolean
  onMarkRead: () => void
}) {
  const meta = notificationTypeMeta(item.notification_type)
  const Icon = meta.icon
  return (
    <div className={cn('flex gap-3 px-4 py-3 hover:bg-[#f7fbfd]', !read && 'bg-[#f3f8fd]')}>
      <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[9px]', meta.tone)}>
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <strong className="truncate text-[0.82rem] text-[#102033]">{meta.label}</strong>
          <span className="shrink-0 text-[0.7rem] font-semibold text-[#90a2b1]">
            {relativeTime(item.event_time || item.created_on)}
          </span>
        </div>
        <p className="mt-0.5 text-[0.8rem] font-medium leading-snug text-[#53687b]">{item.message}</p>
      </div>
      {!read && (
        <button
          type="button"
          onClick={onMarkRead}
          aria-label="Mark as read"
          title="Mark as read"
          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center self-start rounded-full text-[#90a2b1] hover:bg-[#e7f0fb] hover:text-[#1f5f9c]"
        >
          <Check size={14} />
        </button>
      )}
    </div>
  )
}

/** Patient-portal bell — resolves the patient sys_id from the schedule hook. */
export function PatientNotificationBell() {
  const { profile } = usePatientSchedule()
  return (
    <NotificationBell audience="patient" ownerSysId={profile?.sys_id} viewAllTo="/patient/notifications" />
  )
}

/** Clinician-portal bell — resolves the doctor sys_id from the schedule hook. */
export function ClinicianNotificationBell() {
  const { doctor } = useClinicianSchedule()
  return (
    <NotificationBell audience="staff" ownerSysId={doctor?.doctor_record_id} viewAllTo="/staff/notifications" />
  )
}
