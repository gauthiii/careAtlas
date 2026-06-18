import {
  BellRing,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  CheckCircle2,
  FileText,
  UserCheck,
  UserPlus,
  UserX,
  type LucideIcon,
} from 'lucide-react'

export interface NotificationTypeMeta {
  label: string
  icon: LucideIcon
  /** Tailwind classes for the icon chip (bg + text). */
  tone: string
}

const DEFAULT_META: NotificationTypeMeta = {
  label: 'Update',
  icon: BellRing,
  tone: 'bg-[#eef4f8] text-[#53687b]',
}

const TYPE_META: Record<string, NotificationTypeMeta> = {
  registration_complete: { label: 'Registration completed', icon: UserPlus, tone: 'bg-[#e7f0fb] text-[#1f5f9c]' },
  registration_approved: { label: 'Registration approved', icon: UserCheck, tone: 'bg-[#e6f6ec] text-[#1d7a45]' },
  registration_rejected: { label: 'Registration rejected', icon: UserX, tone: 'bg-[#feeceb] text-[#a22828]' },
  appointment_created: { label: 'Appointment booked', icon: CalendarPlus, tone: 'bg-[#e7f0fb] text-[#1f5f9c]' },
  appointment_received: { label: 'Appointment received', icon: CalendarClock, tone: 'bg-[#eef4f8] text-[#53687b]' },
  appointment_confirmed: { label: 'Appointment confirmed', icon: CalendarCheck, tone: 'bg-[#e6f6ec] text-[#1d7a45]' },
  appointment_cancelled: { label: 'Appointment cancelled', icon: CalendarX, tone: 'bg-[#feeceb] text-[#a22828]' },
  appointment_completed: { label: 'Appointment completed', icon: CheckCircle2, tone: 'bg-[#e6f6ec] text-[#1d7a45]' },
  summary_note_added: { label: 'Summary note added', icon: FileText, tone: 'bg-[#f0eafc] text-[#6b3fb0]' },
  summary_note_updated: { label: 'Summary note updated', icon: FileText, tone: 'bg-[#f0eafc] text-[#6b3fb0]' },
}

export function notificationTypeMeta(type: string): NotificationTypeMeta {
  return TYPE_META[type] ?? { ...DEFAULT_META, label: prettifyType(type) }
}

function prettifyType(type: string): string {
  if (!type) return 'Update'
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Best-effort "time ago" from a ServiceNow display datetime (e.g. "06-16-2026 12:49:54"). */
export function relativeTime(value: string): string {
  const parsed = parseSnowDate(value)
  if (!parsed) return value || ''
  const diffMs = Date.now() - parsed.getTime()
  const sec = Math.round(diffMs / 1000)
  if (sec < 45) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  return value
}

function parseSnowDate(value: string): Date | null {
  if (!value) return null
  // Formats seen: "MM-DD-YYYY HH:MM:SS" (display) or "YYYY-MM-DD HH:MM:SS".
  const mdy = value.match(/^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/)
  if (mdy) {
    const [, mm, dd, yyyy, h, m, s] = mdy
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(h), Number(m), Number(s))
  }
  const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/)
  if (ymd) {
    const [, yyyy, mm, dd, h, m, s] = ymd
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(h), Number(m), Number(s))
  }
  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}
