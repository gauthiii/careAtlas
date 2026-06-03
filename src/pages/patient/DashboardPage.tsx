import {
  Bell,
  CalendarCheck,
  ClipboardList,
  UserRound,
  Pill,
  Activity,
  FileText,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  PatientPanel,
  StatusBadge,
} from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import {
  appointmentHistory,
  dashboardActions,
  notifications,
  patient,
  upcomingAppointment,
} from '../../data/patientPortalData'

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

export function DashboardPage() {
  return (
    <PatientPage
      title={`Welcome back, ${patient.firstName}`}
      intro="Your central place for appointments, health records, medications, and clinic messages."
    >
      {/* KPI SECTION */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Next appointment
          </div>

          <div className="mt-2 text-xl font-bold">
            June 4
          </div>

          <div className="text-sm font-bold text-[#12805c]">
            Tomorrow · 9:20 AM
          </div>
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Total visits
          </div>

          <div className="mt-2 text-2xl font-bold">
            {appointmentHistory.length + 8}
          </div>

          <div className="text-sm text-[#607487]">
            Since Jan 2024
          </div>
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Active medications
          </div>

          <div className="mt-2 text-2xl font-bold">
            3
          </div>

          <div className="text-sm text-[#bb6a00]">
            1 refill due soon
          </div>
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Profile status
          </div>

          <div className="mt-2 text-xl font-bold">
            {patient.profileStatus}
          </div>

          <div className="text-sm font-semibold text-[#12805c]">
            All sections filled
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
            <div className="grid gap-4">
              <div>
                <div className="font-bold text-[#102033]">
                  {upcomingAppointment.date}
                </div>

                <div className="mt-1">
                  {upcomingAppointment.doctor}
                </div>

                <div>
                  {upcomingAppointment.department}
                </div>

                <div>{upcomingAppointment.location}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge tone="success">
                    Confirmed
                  </StatusBadge>

                  <StatusBadge tone="info">
                    In-person
                  </StatusBadge>
                </div>
              </div>

              <div className="rounded-lg bg-[#eef5fb] px-3 py-2 text-sm text-[#0f5f8c]">
                Reminder: arrive 15 min early
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <button className="rounded-lg bg-[#143A57] px-4 py-3 font-bold text-white">
                  Reschedule
                </button>

                <button className="rounded-lg border border-[#d7e5ec] bg-white px-4 py-3 font-bold">
                  Add to calendar
                </button>
              </div>
            </div>
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
                    100% complete
                  </span>

                  <span className="text-sm text-[#607487]">
                    Supports better slot assignment
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-[#dfe9ef]">
                  <div className="h-full w-full bg-[#143A57]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>✓ Personal info</div>
                <div>✓ Insurance</div>
                <div>✓ Emergency contact</div>
                <div>✓ Medical history</div>
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
            <div className="grid gap-3">
              {appointmentHistory.slice(1).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border border-[#d7e5ec] p-3"
                >
                  <div>
                    <div className="font-semibold">
                      {appointment.date}
                    </div>

                    <div className="text-sm">
                      {appointment.doctor}
                    </div>

                    <div className="text-sm text-[#607487]">
                      {appointment.department}
                    </div>
                  </div>

                  <StatusBadge tone="success">
                    {appointment.status}
                  </StatusBadge>
                </div>
              ))}
            </div>
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
                    <div className="font-semibold">
                      {med.name}
                    </div>

                    <div className="text-sm text-[#607487]">
                      {med.detail}
                    </div>
                  </div>

                  <StatusBadge
                    tone={
                      med.status === 'Refill due'
                        ? 'warning'
                        : 'success'
                    }
                  >
                    {med.status}
                  </StatusBadge>
                </div>
              ))}

              <button className="mt-2 rounded-lg border border-[#d7e5ec] bg-white px-4 py-3 font-bold">
                Request Atorvastatin refill
              </button>
            </div>
          </PatientPanel>

          <PatientPanel
            title="Clinic notifications"
            icon={<Bell size={21} />}
            tone="secure"
          >
            <div className="grid gap-3">
              <div className="rounded-lg border-l-4 border-l-[#0f5f8c] bg-[#eef5fb] p-4">
                <div>
                  Your appointment on June 4 is confirmed.
                  Please arrive 15 minutes early.
                </div>

                <div className="mt-2 text-xs text-[#607487]">
                  Today · 10:02 AM
                </div>
              </div>

              <div className="rounded-lg border-l-4 border-l-[#bb6a00] bg-[#fdf5e8] p-4">
                <div>
                  Atorvastatin refill is due. Contact your
                  care team or request online.
                </div>

                <div className="mt-2 text-xs text-[#607487]">
                  Yesterday · 3:45 PM
                </div>
              </div>

              {notifications.map((note) => (
                <div
                  key={note}
                  className="rounded-lg border-l-4 border-l-[#0f5f8c] bg-[#eef5fb] p-4"
                >
                  <div>{note}</div>
                </div>
              ))}
            </div>
          </PatientPanel>
        </div>
      </section>
    </PatientPage>
  )
}