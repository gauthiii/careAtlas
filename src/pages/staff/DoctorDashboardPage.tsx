import {
  AlertTriangle,
  CalendarCheck,
  Clock3,
  UserCheck,
  Activity,
  ShieldAlert,
  FileText,
  Plus,
  ClipboardList,
  ListTodo,
  ArrowUpRight,
  LogOut,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { staffAppointments } from '../../data/staffGovernanceData'
import { PortalPanel } from '../../components/portal/PortalShell'
import { clinicianDisplayName, useClinicianAuth } from '../../contexts/ClinicianAuthContext'

type StatCardProps = {
  label: string
  value: string
  badge?: string
  badgeColor?: 'success' | 'warning'
  subtitle?: string
}

function StatCard({
  label,
  value,
  badge,
  badgeColor,
  subtitle,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </div>

      {badge && (
        <div
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeColor === 'warning'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
            }`}
        >
          {badge}
        </div>
      )}

      {subtitle && (
        <div className="mt-2 text-sm text-slate-500">
          {subtitle}
        </div>
      )}
    </div>
  )
}

type AvailabilityRowProps = {
  title: string
  subtitle: string
  enabled?: boolean
}

function AvailabilityRow({
  title,
  subtitle,
  enabled = true,
}: AvailabilityRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium text-slate-900">
          {title}
        </div>

        <div className="text-sm text-slate-500">
          {subtitle}
        </div>
      </div>

      <div
        className={`relative h-6 w-11 rounded-full transition ${enabled ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${enabled ? 'right-1' : 'left-1'
            }`}
        />
      </div>
    </div>
  )
}

type VitalCardProps = {
  title: string
  value: string
  trend?: string
}

function VitalCard({
  title,
  value,
  trend,
}: VitalCardProps) {
  return (
    <div className="rounded-xl bg-slate-100 p-3 text-center">
      <div className="text-xl font-bold text-slate-900">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {title}
      </div>

      {trend && (
        <div className="mt-1 text-[10px] text-emerald-600">
          {trend}
        </div>
      )}
    </div>
  )
}

const weekDays = [
  { day: 'Fri', date: 5, visits: 4, active: true },
  { day: 'Sat', date: 6, visits: 7 },
  { day: 'Sun', date: 7, visits: 8 },
  { day: 'Mon', date: 8, visits: 2 },
  { day: 'Tue', date: 9, visits: 3 },
  { day: 'Wed', date: 10, visits: 4 },
  { day: 'Thu', date: 11, visits: 5 },
]

export function DoctorDashboardPage() {
  const navigate = useNavigate()
  const { logout, user } = useClinicianAuth()
  const displayName = clinicianDisplayName(user)

  async function handleLogout() {
    await logout()
    navigate('/staff/sign-in', { replace: true })
  }

  return (
    <DoctorPage
      title="Today's clinical run sheet"
      intro={`Friday, 5 June 2026 · ${displayName} · General Medicine`}
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

      {/* KPI CARDS */}
      <div className="mb-6 grid grid-cols-4 gap-4 max-[1200px]:grid-cols-2 max-[640px]:grid-cols-1">
        <StatCard
          label="Appointments Today"
          value={`${staffAppointments.length}`}
          badge="2 Completed"
          badgeColor="success"
        />

        <StatCard
          label="Open Governance Alerts"
          value="2"
          badge="Needs Review"
          badgeColor="warning"
        />

        <StatCard
          label="Average Wait Time"
          value="8 min"
          badge="Down 3 min"
          badgeColor="success"
        />

        <StatCard
          label="Next Available Slot"
          value="3:30 PM"
          subtitle="Today · Room 4B"
        />
      </div>

      {/* TOP SECTION */}
      <div className="mb-6 grid grid-cols-[1.5fr_1fr] gap-4 max-[1200px]:grid-cols-1">
        {/* APPOINTMENTS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Clock3 size={18} />
              Today's Appointments
            </h3>

            <button className="bg-[#143A57] p-2 rounded-lg">
              <span className="inline-flex items-center gap-2 !text-sm font-semibold text-white"><Plus size={18} /> Add Slot</span>
            </button>
          </div>

          <div className="space-y-3">
            {staffAppointments.map((appointment) => (
              <div
                key={appointment.patient}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7f3f8] text-[#0397AE] font-bold text-md">
                  {appointment.patient
                    .split(' ')
                    .map((word) => word[0])
                    .join('')}
                </div>

                <div className="flex-1">
                  <p className="font-semibold">
                    {appointment.patient}
                  </p>

                  <p className="text-xs text-slate-500">
                    Consultation · Room 2A
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold">
                    {appointment.time}
                  </p>

                  <p className="text-xs text-emerald-700">
                    {appointment.status}
                  </p>
                </div>
              </div>
            ))}
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7f3f8] text-[#0397AE] font-bold text-md">
                  SR
                </div>

                <div>
                  <div className="font-semibold text-slate-900">
                    Samira Raza
                  </div>

                  <div className="text-xs text-slate-500">
                    Upcoming · Medication review · 3:30 PM
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex flex-col gap-4">
          {/* CALENDAR */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <CalendarCheck size={18} />
              Next 7 Days
            </h3>

            <div className="grid grid-cols-7 gap-2 max-[700px]:grid-cols-2">
              {weekDays.map((item) => (
                <div
                  key={item.day}
                  className={`rounded-xl border p-2 text-center ${item.active
                      ? 'border-[#0397AE] bg-[#e7f3f8] border-3'
                      : 'border-slate-200'
                    }`}
                >
                  <div className="text-xs text-slate-500">
                    {item.day}
                  </div>

                  <div className="text-xl font-bold">
                    {item.date}
                  </div>

                  <div className="text-[10px] text-slate-500">
                    {item.visits} visits
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AVAILABILITY */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <UserCheck size={18} />
                My Availability
              </h3>

              <Link
                to="/staff/availability"
                className="rounded-lg bg-[#143A57] px-3 py-2 text-sm font-semibold !text-white"
              >
                Manage
              </Link>
            </div>

            <div className="space-y-4">
              <AvailabilityRow
                title="Morning Slots"
                subtitle="8:00 AM – 12:00 PM"
              />

              <AvailabilityRow
                title="Afternoon Slots"
                subtitle="1:00 PM – 5:00 PM"
              />

              <AvailabilityRow
                title="Telemedicine"
                subtitle="Video consults enabled"
                enabled={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-4 max-[1200px]:grid-cols-1">
        {/* GOVERNANCE ALERTS */}
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex gap-3">
              <AlertTriangle size={20} className="text-amber-700" />
              <div>
                <h4 className="font-semibold text-amber-800">
                  Flagged Scheduling — Jordan Brooks
                </h4>

                <p className="mt-1 text-sm text-slate-600">
                  AI suggested an earlier slot that conflicts with
                  an existing lab request.
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Flagged 40 minutes ago
                </p>

                <div className="mt-3 flex gap-2">
                  <Link
                    to="/staff/patient/P-2193"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                  >
                    Open Record
                  </Link>

                  <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm !font-semibold">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-red-300 bg-red-50 p-4">
            <div className="flex gap-3">
              <AlertTriangle size={20} className="text-red-700" />

              <div>
                <h4 className="font-semibold text-red-800">
                  Medication Interaction — Priya Singh
                </h4>

                <p className="mt-1 text-sm text-slate-600">
                  Newly prescribed medication may interact with
                  existing potassium supplement.
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Flagged 2 hours ago
                </p>

                <div className="mt-3 flex gap-2">
                  <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm !font-semibold">
                    Review
                  </button>

                  <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm !font-semibold">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ClipboardList size={18} />
            Pending Tasks
          </h3>
          <div>
            <div className="space-y-3">
              <div className="rounded-lg border border-[#d7e5ec] p-3">
                <span className="inline-flex items-center gap-2">
                <ListTodo size={18} />
                Review Jordan Brooks scheduling conflict <ArrowUpRight size={18} />
                </span>
              </div>

              <div className="rounded-lg border border-[#d7e5ec] p-3">
                <span className="inline-flex items-center gap-2">
                <ListTodo size={18} />
                Sign 2 consultation notes <ArrowUpRight size={18} />
                </span>
              </div>

              <div className="rounded-lg border border-[#d7e5ec] p-3">
                <span className="inline-flex items-center gap-2">
                <ListTodo size={18} />
                Approve medication update for Priya Singh <ArrowUpRight size={18} />
                </span>
              </div>

              <div className="rounded-lg border border-[#d7e5ec] p-3">
                <span className="inline-flex items-center gap-2">
                <ListTodo size={18} />
                Complete discharge summary <ArrowUpRight size={18} />
                </span>
              </div>
            </div>
          </div>
        </div>
            {/* NOTES */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <FileText size={18} />
                Quick Notes
              </h3>
              <div>
                <textarea
                  className="h-32 w-full rounded-lg border border-slate-300 p-3"
                  placeholder="Add a clinical note for today's shift..."
                />

                <button className="mt-3 rounded-lg bg-[#143A57] px-4 py-2 !font-semibold text-white !text-sm">
                  Save Note
                </button>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <div className="mb-2 text-sm font-semibold text-slate-600">
                    Recent Notes
                  </div>

                  <div className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">
                      Owen Miller
                    </span>
                    {' '}— Post-op wound healing well. No signs of
                    infection. Follow-up in 2 weeks.
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    5 Jun · 10:52 AM
                  </div>
                </div>
              </div>

            </div>
          </div>
        </DoctorPage>
        )
}
