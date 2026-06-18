import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchNotifications,
  markNotificationRead,
  type NotificationAudience,
  type NotificationItem,
} from '../services/serviceNow'

const POLL_INTERVAL_MS = 60_000

/**
 * Load notifications for the current patient or doctor and keep them fresh.
 *
 * Pass the resolved ServiceNow sys_id:
 *  - patient portal: usePatientSchedule().profile?.sys_id
 *  - clinician portal: useClinicianSchedule().doctor?.doctor_record_id
 *
 * `unreadCount` uses the audience-specific read flag (patient_read / staff_read).
 */
export function useNotifications(audience: NotificationAudience, ownerSysId: string | null | undefined) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ownerRef = useRef(ownerSysId)
  ownerRef.current = ownerSysId

  const load = useCallback(async () => {
    const owner = ownerRef.current
    if (!owner) {
      setItems([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchNotifications({
        audience,
        patientId: audience === 'patient' ? owner : undefined,
        doctorId: audience === 'staff' ? owner : undefined,
      })
      setItems(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications.')
    } finally {
      setIsLoading(false)
    }
  }, [audience])

  useEffect(() => {
    if (!ownerSysId) {
      setItems([])
      return
    }
    let active = true
    void load()
    const timer = window.setInterval(() => {
      if (active) void load()
    }, POLL_INTERVAL_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [ownerSysId, load])

  const isRead = useCallback(
    (item: NotificationItem) => (audience === 'patient' ? item.patient_read : item.staff_read),
    [audience],
  )

  const unreadCount = useMemo(() => items.filter((item) => !isRead(item)).length, [items, isRead])

  const markRead = useCallback(
    async (sysId: string) => {
      // Optimistic update so the badge reacts immediately.
      setItems((prev) =>
        prev.map((item) =>
          item.sys_id === sysId
            ? audience === 'patient'
              ? { ...item, patient_read: true }
              : { ...item, staff_read: true }
            : item,
        ),
      )
      try {
        await markNotificationRead(sysId, audience)
      } catch {
        // Revert on failure by reloading from source of truth.
        void load()
      }
    },
    [audience, load],
  )

  return { items, unreadCount, isLoading, error, refetch: load, markRead, isRead }
}
