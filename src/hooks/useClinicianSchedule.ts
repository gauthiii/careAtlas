import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClinicianAuth } from '../contexts/ClinicianAuthContext'
import {
  APPOINTMENT_HISTORY_RANGE_DAYS,
  APPOINTMENT_LOOKBACK_DAYS,
  addDays,
  activeAppointmentsForDoctor,
  matchDoctorForClinician,
  todayIso,
} from '../lib/scheduling'
import {
  fetchPatientBookingAvailability,
  type BookingAppointment,
  type BookingCalendarResponse,
  type BookingDoctor,
} from '../services/serviceNow'

export function useClinicianSchedule() {
  const { user } = useClinicianAuth()
  const [availability, setAvailability] = useState<BookingCalendarResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const today = useMemo(todayIso, [])
  const availabilityStart = useMemo(() => addDays(today, -APPOINTMENT_LOOKBACK_DAYS), [today])

  useEffect(() => {
    let active = true

    async function loadSchedule() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetchPatientBookingAvailability(availabilityStart, APPOINTMENT_HISTORY_RANGE_DAYS)
        if (!active) return
        setAvailability(response)
        if (response.doctors.filter((doctor) => doctor.active).length === 0) {
          setError('No active doctors were returned from ServiceNow.')
        }
      } catch (loadError) {
        if (!active) return
        setAvailability(null)
        setError(loadError instanceof Error ? loadError.message : 'Unable to load ServiceNow schedule.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadSchedule()

    return () => {
      active = false
    }
  }, [availabilityStart, refreshKey])

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  const doctors = useMemo(() => availability?.doctors ?? [], [availability])
  const appointments = useMemo(() => availability?.appointments ?? [], [availability])
  const doctor = useMemo(() => matchDoctorForClinician(doctors, user), [doctors, user])
  const doctorAppointments = useMemo<BookingAppointment[]>(
    () => (doctor ? activeAppointmentsForDoctor(appointments, doctor) : []),
    [appointments, doctor],
  )

  return {
    appointments,
    availability,
    doctor: doctor as BookingDoctor | null,
    doctorAppointments,
    error,
    isLoading,
    refetch,
    today,
    user,
  }
}
