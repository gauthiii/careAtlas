import {
  Bell,
  CalendarCheck,
  ClipboardList,
  LoaderCircle,
  LogOut,
  UserRound,
  Pill,
  Activity,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PatientPanel,
  StatusBadge,
} from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { patientDisplayName, usePatientAuth } from '../../contexts/PatientAuthContext'
import { usePatientSchedule } from '../../hooks/usePatientSchedule'
import {
  appointmentReason,
  formatAppointmentDateTime,
  formatDate,
  formatTime,
} from '../../lib/scheduling'
import { dashboardActions } from '../../data/patientPortalData'

// Demo-only data: there is no ServiceNow table for medications, so these stay static.
const medications = [
  {
    name: 'Lisinopril 10mg',
    detail: 'Once daily · prescribed by Dr. Rao',
    status: 'Refill ok',
  },
  {
    name: 'Atorvastatin 20mg',
    detail: 'Once nightly · prescribed by Dr. Grant',
    status: 'Refill due',
  },
  {
    name: 'Sertraline 50mg',
    detail: 'Once daily · prescribed by Dr. Finch',
    status: 'Refill ok',
  },
]

function statusTone(status: string): 'success' | 'warning' | 'info' {
  const normalized = status.toLowerCase()
  if (normalized.includes('cancel')) return 'warning'
  if (normalized.includes('complete')) return 'success'
  return 'info'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = usePatientAuth()
  const displayName = patientDisplayName(user)
  const { profile, upcoming, past, nextAppointment, isLoading, error } = usePatientSchedule()

  async function handleLogout() {
    await logout()
    navigate('/patient/sign-in', { replace: true })
  }

  const totalVisits = past.length
  const profileStatus = profile
    ? profile.profile_complete
      ? 'Complete'
      : profile.registration_status || 'In progress'
    : '—'

  return (
    <PatientPage
      title={`Welcome back, ${displayName}`}
      intro="Your central place for appointments, health records, medications, and clinic messages."
    >
      <div className="-mt-3 mb-5 flex justify-end">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-bold text-[#0f5f8c] max-[720px]:w-full"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>

      {error && !isLoading && (
        <div className="mb-4 rounded-[10px] border border-[#f6c6c4] bg-[#fff4f3] p-3 text-[0.86rem] font-bold text-[#a22828]">
          {error}
        </div>
      )}

      {/* KPI SECTION */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Next appointment
          </div>

          {isLoading ? (
            <div className="mt-2 flex items-center gap-2 text-[#607487]">
              <LoaderCircle size={18} className="animate-spin" /> Loading
            </div>
          ) : nextAppointment ? (
            <>
              <div className="mt-2 text-xl font-bold">{formatDate(nextAppointment.date)}</div>
              <div className="text-sm font-bold text-[#12805c]">
                {formatTime(nextAppointment.start_time)} · {nextAppointment.doctor_name}
              </div>
            </>
          ) : (
            <div className="mt-2 text-xl font-bold text-[#607487]">None booked</div>
          )}
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Past visits
          </div>

          <div className="mt-2 text-2xl font-bold">{isLoading ? '—' : totalVisits}</div>

          <div className="text-sm text-[#607487]">From ServiceNow records</div>
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Active medications
          </div>

          <div className="mt-2 text-2xl font-bold">{medications.length}</div>

          <div className="text-sm text-[#bb6a00]">Demo data</div>
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Profile status
          </div>

          <div className="mt-2 text-xl font-bold">{isLoading ? '—' : profileStatus}</div>

          <div className="text-sm font-semibold text-[#12805c]">
            {profile?.email_verified ? 'Email verified' : 'From your record'}
          </div>
        </div>
      </section>

      {/* MAIN GRID */}

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        {/* LEFT COLUMN */}

        <div className="grid gap-4">
          <PatientPanel
            title="Upcoming appointment"
            icon={<CalendarCheck size={21} />}
            tone="success"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-[#607487]">
                <LoaderCircle size={18} className="animate-spin" /> Loading your appointments
              </div>
            ) : nextAppointment ? (
              <div className="grid gap-4">
                <div>
                  <div className="font-bold text-[#102033]">
                    {formatAppointmentDateTime(nextAppointment.date, nextAppointment.start_time)}
                  </div>

                  <div className="mt-1">{nextAppointment.doctor_name}</div>

                  <div>{nextAppointment.department || nextAppointment.speciality}</div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge tone={statusTone(nextAppointment.status)}>
                      {nextAppointment.status_label || nextAppointment.status}
                    </StatusBadge>

                    <StatusBadge tone="info">{appointmentReason(nextAppointment)}</StatusBadge>
                  </div>
                </div>

                <div className="rounded-lg bg-[#eef5fb] px-3 py-2 text-sm text-[#0f5f8c]">
                  Reminder: arrive 15 min early
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <Link
                    to="/patient/book"
                    className="rounded-lg bg-[#143A57] px-4 py-3 text-center font-bold text-white"
                  >
                    Book another
                  </Link>

                  <button className="rounded-lg border border-[#d7e5ec] bg-white px-4 py-3 font-bold">
                    Add to calendar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="text-[#607487]">You have no upcoming appointments.</div>
                <Link
                  to="/patient/book"
                  className="rounded-lg bg-[#143A57] px-4 py-3 text-center font-bold text-white"
                >
                  Book an appointment
                </Link>
              </div>
            )}
          </PatientPanel>

          <PatientPanel
            title="Quick actions"
            icon={<Activity size={21} />}
          >
            <div className="grid gap-2">
              {dashboardActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="rounded-lg border border-[#d7e5ec] bg-white px-4 py-3 font-semibold text-[#102033] transition hover:bg-[#f7fbfd]"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </PatientPanel>

          <PatientPanel
            title="Profile completeness"
            icon={<UserRound size={21} />}
          >
            <div className="grid gap-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold">
                    {profile?.profile_complete ? '100% complete' : 'In progress'}
                  </span>

                  <span className="text-sm text-[#607487]">
                    Supports better slot assignment
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-[#dfe9ef]">
                  <div
                    className="h-full bg-[#143A57]"
                    style={{ width: profile?.profile_complete ? '100%' : '60%' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>{profile?.first_name ? '✓' : '•'} Personal info</div>
                <div>{profile?.insurance_id ? '✓' : '•'} Insurance</div>
                <div>{profile?.emergency_name ? '✓' : '•'} Emergency contact</div>
                <div>{profile?.health_condition ? '✓' : '•'} Medical history</div>
              </div>
            </div>
          </PatientPanel>
        </div>

        {/* RIGHT COLUMN */}

        <div className="grid gap-4">
          <PatientPanel
            title="Appointment history"
            icon={<ClipboardList size={21} />}
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-[#607487]">
                <LoaderCircle size={18} className="animate-spin" /> Loading
              </div>
            ) : past.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#d7e5ec] p-4 text-center text-sm text-[#607487]">
                No past appointments on record.
              </div>
            ) : (
              <div className="grid gap-3">
                {past.slice(0, 6).map((appointment) => (
                  <div
                    key={appointment.appointment_record_id}
                    className="flex items-center justify-between rounded-lg border border-[#d7e5ec] p-3"
                  >
                    <div>
                      <div className="font-semibold">{formatDate(appointment.date)}</div>
                      <div className="text-sm">{appointment.doctor_name}</div>
                      <div className="text-sm text-[#607487]">{appointmentReason(appointment)}</div>
                    </div>

                    <StatusBadge tone={statusTone(appointment.status)}>
                      {appointment.status_label || appointment.status}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </PatientPanel>

          <PatientPanel
            title="Active medications"
            icon={<Pill size={21} />}
          >
            <div className="grid gap-3">
              {medications.map((med) => (
                <div
                  key={med.name}
                  className="flex items-start justify-between rounded-lg border border-[#d7e5ec] p-3"
                >
                  <div>
                    <div className="font-semibold">{med.name}</div>
                    <div className="text-sm text-[#607487]">{med.detail}</div>
                  </div>

                  <StatusBadge tone={med.status === 'Refill due' ? 'warning' : 'success'}>
                    {med.status}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </PatientPanel>

          <PatientPanel
            title="Clinic notifications"
            icon={<Bell size={21} />}
            tone="secure"
          >
            <div className="grid gap-3">
              {nextAppointment ? (
                <div className="rounded-lg border-l-4 border-l-[#0f5f8c] bg-[#eef5fb] p-4">
                  <div>
                    Your appointment with {nextAppointment.doctor_name} on{' '}
                    {formatDate(nextAppointment.date)} is{' '}
                    {(nextAppointment.status_label || nextAppointment.status).toLowerCase()}. Please
                    arrive 15 minutes early.
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border-l-4 border-l-[#0f5f8c] bg-[#eef5fb] p-4">
                  <div>No appointment reminders right now. Book a visit when you're ready.</div>
                </div>
              )}
            </div>
          </PatientPanel>
        </div>
      </section>
    </PatientPage>
  )
}
