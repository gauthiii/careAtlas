import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../lib/cn'
import { notificationTypeMeta, relativeTime } from '../lib/notifications'
import type { NotificationAudience, NotificationItem } from '../services/serviceNow'

interface NotificationFeedProps {
  items: NotificationItem[]
  isLoading: boolean
  error: string | null
  isRead: (item: NotificationItem) => boolean
  onMarkRead: (sysId: string) => void
  audience: NotificationAudience
}

/** Full chronological, expandable notification list shared by the patient + clinician pages. */
export function NotificationFeed({
  items,
  isLoading,
  error,
  isRead,
  onMarkRead,
  audience,
}: NotificationFeedProps) {
  if (error) {
    return (
      <div className="rounded-[12px] border border-[#f3c9c5] bg-[#fdf2f1] px-4 py-6 text-center text-[0.9rem] font-semibold text-[#a22828]">
        {error}
      </div>
    )
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#d7e5ec] bg-white px-4 py-10 text-center text-[0.9rem] font-semibold text-[#607487]">
        Loading notifications…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#d7e5ec] bg-white px-4 py-10 text-center text-[0.9rem] font-semibold text-[#607487]">
        You have no notifications yet.
      </div>
    )
  }

  return (
    <ul className="grid gap-2.5">
      {items.map((item) => (
        <NotificationFeedRow
          key={item.sys_id}
          item={item}
          read={isRead(item)}
          onMarkRead={() => onMarkRead(item.sys_id)}
          audience={audience}
        />
      ))}
    </ul>
  )
}

function NotificationFeedRow({
  item,
  read,
  onMarkRead,
  audience,
}: {
  item: NotificationItem
  read: boolean
  onMarkRead: () => void
  audience: NotificationAudience
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = notificationTypeMeta(item.notification_type)
  const Icon = meta.icon

  function toggle() {
    setExpanded((value) => !value)
    if (!read) onMarkRead()
  }

  // The "other party" most relevant to this audience.
  const counterparty =
    audience === 'patient'
      ? item.doctor_name && `Doctor: ${item.doctor_name}`
      : item.patient_name && `Patient: ${item.patient_name}`

  return (
    <li
      className={cn(
        'overflow-hidden rounded-[12px] border bg-white',
        read ? 'border-[#d7e5ec]' : 'border-[#bcd9f0] bg-[#f6fbff]',
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f7fbfd]"
      >
        <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px]', meta.tone)}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {!read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#1f7af0]" aria-label="Unread" />}
            <strong className="truncate text-[0.9rem] text-[#102033]">{meta.label}</strong>
          </div>
          <p className={cn('mt-0.5 text-[0.86rem] leading-snug text-[#53687b]', !expanded && 'line-clamp-2')}>
            {item.message}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[0.72rem] font-semibold text-[#90a2b1]">
            {relativeTime(item.event_time || item.created_on)}
          </span>
          {expanded ? (
            <ChevronUp size={16} className="text-[#90a2b1]" />
          ) : (
            <ChevronDown size={16} className="text-[#90a2b1]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="grid gap-1.5 border-t border-[#eef4f8] px-4 py-3 text-[0.8rem] text-[#53687b]">
          {counterparty && <span className="font-semibold">{counterparty}</span>}
          <span>
            <span className="font-semibold text-[#607487]">When: </span>
            {item.event_time || item.created_on || '—'}
          </span>
          {item.appointment_sys_id && (
            <span className="font-mono text-[0.74rem] text-[#90a2b1]">
              Appointment ref: {item.appointment_sys_id}
            </span>
          )}
          {item.summary_note_sys_id && (
            <span className="font-mono text-[0.74rem] text-[#90a2b1]">
              Summary note ref: {item.summary_note_sys_id}
            </span>
          )}
          <span className="font-mono text-[0.74rem] text-[#90a2b1]">ID: {item.notification_id}</span>
        </div>
      )}
    </li>
  )
}
