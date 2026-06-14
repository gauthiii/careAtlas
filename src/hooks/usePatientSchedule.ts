import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePatientAuth } from '../contexts/PatientAuthContext'
import {
  APPOINTMENT_HISTORY_RANGE_DAYS,
  APPOINTMENT_LOOKBACK_DAYS,
  addDays,
  appointmentSortValue,
  appointmentsForPatient,
  todayIso,
} from '../lib/scheduling'
import {
  fetchPatientBookingAvailability,
  fetchPatientProfile,
  type BookingAppointment,
  type PatientProfile,
} from '../services/serviceNow'

/**
 * Loads the signed-in patient's live ServiceNow record plus the scheduling window,
 * then derives that patient's appointments (split into upcoming and past). Mirrors
 * useClinicianSchedule but keyed off the patient auth identity (email / name / username).
 */
export function usePatientSchedule() {
  const { user } = usePatientAuth()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [appointments, setAppointments] = useState<BookingAppointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const today = useMemo(todayIso, [])
  const windowStart = useMemo(() => addDays(today, -APPOINTMENT_LOOKBACK_DAYS), [today])

  const email = user?.attributes.email?.trim() || ''
  const name = user?.attributes.name?.trim() || ''
  const username = user?.username?.trim() || ''

  useEffect(() => {
    let active = true

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [loadedProfile, availability] = await Promise.all([
          fetchPatientProfile({ email, username, name }),
          fetchPatientBookingAvailability(windowStart, APPOINTMENT_HISTORY_RANGE_DAYS),
        ])
        if (!active) return
        setProfile(loadedProfile)
        setAppointments(availability.appointments)
        if (!loadedProfile) {
          setError('No matching patient record was found in ServiceNow for this account.')
        }
      } catch (loadError) {
        if (!active) return
        setProfile(null)
        setAppointments([])
        setError(loadError instanceof Error ? loadError.message : 'Unable to load ServiceNow schedule.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    if (!email && !name && !username) {
      setIsLoading(false)
      setProfile(null)
      setAppointments([])
      return
    }

    load()

    return () => {
      active = false
    }
  }, [email, name, username, windowStart, refreshKey])

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  const patientAppointments = useMemo(
    () => appointmentsForPatient(appointments, profile),
    [appointments, profile],
  )

  const upcoming = useMemo(
    () =>
      patientAppointments
        .filter((appointment) => appointment.date >= today)
        .sort((a, b) => appointmentSortValue(a) - appointmentSortValue(b)),
    [patientAppointments, today],
  )

  const past = useMemo(
    () =>
      patientAppointments
        .filter((appointment) => appointment.date < today)
        .sort((a, b) => appointmentSortValue(b) - appointmentSortValue(a)),
    [patientAppointments, today],
  )

  return {
    profile,
    appointments: patientAppointments,
    upcoming,
    past,
    nextAppointment: upcoming[0] ?? null,
    error,
    isLoading,
    refetch,
    today,
    user,
  }
}
