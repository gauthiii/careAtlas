import { useEffect, type ReactNode } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { GovernanceAclPage } from './pages/governance/GovernanceAclPage'
import { GovernanceAiAgentsPage } from './pages/governance/GovernanceAiAgentsPage'
import { GovernanceDashboardPage } from './pages/governance/GovernanceDashboardPage'
import { GovernanceAgendaPage } from './pages/governance/GovernanceAgendaPage'
import { GovernanceAdditionalWorkPage } from './pages/governance/GovernanceAdditionalWorkPage'
import { GovernanceLlm02AuditPage } from './pages/governance/GovernanceLlm02AuditPage'
import { GovernanceDemoPage } from './pages/governance/GovernanceDemoPage'
import { GovernancePrivacyPage } from './pages/governance/demo/PrivacyPage'
import { GovernanceRiskPage } from './pages/governance/demo/RiskPage'
import { GovernanceRegulationPage } from './pages/governance/demo/RegulationPage'
import { GovernanceSecurityPage } from './pages/governance/demo/SecurityPage'
import { GovernanceFairnessPage } from './pages/governance/demo/FairnessPage'
import { GovernanceConsentPage } from './pages/governance/demo/ConsentPage'
import { GovernanceSignInPage } from './pages/governance/GovernanceSignInPage'
import { ViewChooserPage } from './pages/home/ViewChooserPage'
import { AppointmentsPage as PatientAppointmentsPage } from './pages/patient/AppointmentsPage'
import { PatientAppointmentDetailPage } from './pages/patient/AppointmentDetailPage'
import { BookAppointmentPage } from './pages/patient/BookAppointmentPage'
import { ContactPage } from './pages/patient/ContactPage'
import { DashboardPage } from './pages/patient/DashboardPage'
import { NotificationsPage as PatientNotificationsPage } from './pages/patient/NotificationsPage'
import { EmailVerificationPage } from './pages/patient/EmailVerificationPage'
import { LandingPage } from './pages/patient/LandingPage'
import { ProfilePage } from './pages/patient/ProfilePage'
import { RegistrationPage } from './pages/patient/RegistrationPage'
import { SignInPage as PatientSignInPage } from './pages/patient/SignInPage'
import { AdminDashboardPage } from './pages/staff/AdminDashboardPage'
import { AvailabilityPage } from './pages/staff/AvailabilityPage'
import { AppointmentDetailPage } from './pages/staff/AppointmentDetailPage'
import { DoctorAnalyticsPage } from './pages/staff/DoctorAnalyticsPage'
import { DoctorAppointmentsPage } from './pages/staff/DoctorAppointmentsPage'
import { DoctorDashboardPage } from './pages/staff/DoctorDashboardPage'
import { DoctorNotesPage } from './pages/staff/DoctorNotesPage'
import { NotificationsPage as StaffNotificationsPage } from './pages/staff/NotificationsPage'
import { DoctorQueuePage } from './pages/staff/DoctorQueuePage'
import { DoctorProfilePage } from './pages/staff/DoctorProfilePage'
import { PatientRecordPage } from './pages/staff/PatientRecordPage'
import { StaffSignInPage } from './pages/staff/StaffSignInPage'
import { AiAssistantWidget, type AiAssistantAgentConfig } from './components/AiAssistantWidget'
import { BOOK_APPOINTMENT_AGENT_ID } from './services/serviceNow'
import { useClinicianAuth } from './contexts/ClinicianAuthContext'
import { useGovernanceAuth } from './contexts/GovernanceAuthContext'
import { patientDisplayName, usePatientAuth, type PatientAuthUser } from './contexts/PatientAuthContext'

function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<ViewChooserPage />} />
        <Route path="/role-picker" element={<ViewChooserPage />} />
        <Route
          path="/patient/home"
          element={
            <GovernanceRoleBlocker>
              <ClinicianRoleBlocker>
                <LandingPage />
              </ClinicianRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/patient/register"
          element={
            <GovernanceRoleBlocker>
              <ClinicianRoleBlocker>
                <RegistrationPage />
              </ClinicianRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/patient/verify-email"
          element={
            <GovernanceRoleBlocker>
              <ClinicianRoleBlocker>
                <EmailVerificationPage />
              </ClinicianRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/patient/sign-in"
          element={
            <GovernanceRoleBlocker>
              <ClinicianRoleBlocker>
                <PatientSignInPage />
              </ClinicianRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/patient/dashboard"
          element={
            <GovernanceRoleBlocker>
              <ClinicianRoleBlocker>
                <PatientProtectedRoute>
                  <DashboardPage />
                </PatientProtectedRoute>
              </ClinicianRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/patient/book"
          element={
            <GovernanceRoleBlocker>
              <ClinicianRoleBlocker>
                <PatientProtectedRoute>
                  <BookAppointmentPage />
                </PatientProtectedRoute>
              </ClinicianRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/patient/appointments"
          element={
            <GovernanceRoleBlocker>
              <ClinicianRoleBlocker>
                <PatientProtectedRoute>
                  <PatientAppointmentsPage />
                </PatientProtectedRoute>
              </ClinicianRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/patient/appointments/:recordId"
          element={
            <GovernanceRoleBlocker>
              <ClinicianRoleBlocker>
                <PatientProtectedRoute>
                  <PatientAppointmentDetailPage />
                </PatientProtectedRoute>
              </ClinicianRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/patient/profile"
          element={
            <GovernanceRoleBlocker>
              <ClinicianRoleBlocker>
                <PatientProtectedRoute>
                  <ProfilePage />
                </PatientProtectedRoute>
              </ClinicianRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/patient/contact"
          element={
            <GovernanceRoleBlocker>
              <ClinicianRoleBlocker>
                <ContactPage />
              </ClinicianRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/patient/notifications"
          element={
            <GovernanceRoleBlocker>
              <ClinicianRoleBlocker>
                <PatientProtectedRoute>
                  <PatientNotificationsPage />
                </PatientProtectedRoute>
              </ClinicianRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/staff/sign-in"
          element={
            <GovernanceRoleBlocker>
              <PatientRoleBlocker>
                <ClinicianSignInRoute>
                  <StaffSignInPage />
                </ClinicianSignInRoute>
              </PatientRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/staff/doctor"
          element={
            <GovernanceRoleBlocker>
              <PatientRoleBlocker>
                <ClinicianProtectedRoute>
                  <DoctorDashboardPage />
                </ClinicianProtectedRoute>
              </PatientRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/staff/admin"
          element={
            <GovernanceRoleBlocker>
              <PatientRoleBlocker>
                <ClinicianProtectedRoute>
                  <AdminDashboardPage />
                </ClinicianProtectedRoute>
              </PatientRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/staff/patient/:id"
          element={
            <GovernanceRoleBlocker>
              <PatientRoleBlocker>
                <ClinicianProtectedRoute>
                  <PatientRecordPage />
                </ClinicianProtectedRoute>
              </PatientRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/staff/notes"
          element={
            <GovernanceRoleBlocker>
              <PatientRoleBlocker>
                <ClinicianProtectedRoute>
                  <DoctorNotesPage />
                </ClinicianProtectedRoute>
              </PatientRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/staff/notifications"
          element={
            <GovernanceRoleBlocker>
              <PatientRoleBlocker>
                <ClinicianProtectedRoute>
                  <StaffNotificationsPage />
                </ClinicianProtectedRoute>
              </PatientRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/staff/appointments"
          element={
            <GovernanceRoleBlocker>
              <PatientRoleBlocker>
                <ClinicianProtectedRoute>
                  <DoctorAppointmentsPage />
                </ClinicianProtectedRoute>
              </PatientRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/staff/appointments/:recordId"
          element={
            <GovernanceRoleBlocker>
              <PatientRoleBlocker>
                <ClinicianProtectedRoute>
                  <AppointmentDetailPage />
                </ClinicianProtectedRoute>
              </PatientRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/staff/queue"
          element={
            <GovernanceRoleBlocker>
              <PatientRoleBlocker>
                <ClinicianProtectedRoute>
                  <DoctorQueuePage />
                </ClinicianProtectedRoute>
              </PatientRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/staff/analytics"
          element={
            <GovernanceRoleBlocker>
              <PatientRoleBlocker>
                <ClinicianProtectedRoute>
                  <DoctorAnalyticsPage />
                </ClinicianProtectedRoute>
              </PatientRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/staff/availability"
          element={
            <GovernanceRoleBlocker>
              <PatientRoleBlocker>
                <ClinicianProtectedRoute>
                  <AvailabilityPage />
                </ClinicianProtectedRoute>
              </PatientRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/staff/profile"
          element={
            <GovernanceRoleBlocker>
              <PatientRoleBlocker>
                <ClinicianProtectedRoute>
                  <DoctorProfilePage />
                </ClinicianProtectedRoute>
              </PatientRoleBlocker>
            </GovernanceRoleBlocker>
          }
        />
        <Route
          path="/governance/sign-in"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceSignInRoute>
                  <GovernanceSignInPage />
                </GovernanceSignInRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernanceDashboardPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/ai-agents"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernanceAiAgentsPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/acl"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernanceAclPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/demo"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernanceDemoPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/demo/privacy"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernancePrivacyPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/demo/risk"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernanceRiskPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/demo/regulation"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernanceRegulationPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/demo/security"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernanceSecurityPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/demo/fairness"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernanceFairnessPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/demo/consent"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernanceConsentPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/agenda"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernanceAgendaPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/additional-work"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernanceAdditionalWorkPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/llm02-audit"
          element={
            <PatientRoleBlocker>
              <ClinicianRoleBlocker>
                <GovernanceProtectedRoute>
                  <GovernanceLlm02AuditPage />
                </GovernanceProtectedRoute>
              </ClinicianRoleBlocker>
            </PatientRoleBlocker>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function PatientProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrating } = usePatientAuth()
  const location = useLocation()

  if (isHydrating) {
    return (
      <div className="grid min-h-[55vh] place-items-center text-sm font-bold text-[#53687b]">
        Checking patient session...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/patient/sign-in" replace state={{ from: location.pathname }} />
  }

  return children
}

function PatientRoleBlocker({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrating } = usePatientAuth()

  if (isHydrating) {
    return (
      <div className="grid min-h-[55vh] place-items-center text-sm font-bold text-[#53687b]">
        Checking patient session...
      </div>
    )
  }

  if (isAuthenticated) return <PatientAccessDeniedPage />

  return children
}

function ClinicianProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrating } = useClinicianAuth()
  const location = useLocation()

  if (isHydrating) return <SessionLoading />

  if (!isAuthenticated) {
    return <Navigate to="/staff/sign-in" replace state={{ from: location.pathname }} />
  }

  return children
}

function ClinicianSignInRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrating } = useClinicianAuth()

  if (isHydrating) return <SessionLoading />
  if (isAuthenticated) return <Navigate to="/staff/doctor" replace />

  return children
}

function ClinicianRoleBlocker({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrating } = useClinicianAuth()

  if (isHydrating) return <SessionLoading />
  if (isAuthenticated) return <ClinicianAccessDeniedPage />

  return children
}

function GovernanceProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrating } = useGovernanceAuth()
  const location = useLocation()

  if (isHydrating) return <SessionLoading />

  if (!isAuthenticated) {
    return <Navigate to="/governance/sign-in" replace state={{ from: location.pathname }} />
  }

  return children
}

function GovernanceSignInRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrating } = useGovernanceAuth()

  if (isHydrating) return <SessionLoading />
  if (isAuthenticated) return <Navigate to="/governance" replace />

  return children
}

function GovernanceRoleBlocker({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrating } = useGovernanceAuth()

  if (isHydrating) return <SessionLoading />
  if (isAuthenticated) return <GovernanceAccessDeniedPage />

  return children
}

function PatientAccessDeniedPage() {
  const { logout } = usePatientAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const logoutTarget = location.pathname.startsWith('/staff') ? '/staff/sign-in' : '/role-picker'

  async function handleLogout() {
    await logout()
    navigate(logoutTarget, { replace: true })
  }

  return (
    <main className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-10">
      <section className="grid w-full max-w-[620px] gap-5 rounded-[14px] border border-[#d7e5ec] bg-white p-7 text-center shadow-[0_12px_30px_rgba(25,64,93,0.07)]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#feeceb] text-[#a22828]">
          <span className="text-xl font-black">!</span>
        </div>
        <div className="grid gap-2">
          <h1 className="m-0 text-2xl font-bold text-[#102033]">Patient access only</h1>
          <p className="m-0 text-[1rem] font-semibold leading-[1.55] text-[#53687b]">
            You are signed in as a patient. You do not have access to this page. Log out as a patient and sign in to view this page.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white max-[720px]:w-full"
          >
            Log out as patient
          </button>
          <Link
            to="/patient/dashboard"
            className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-bold text-[#0f5f8c] max-[720px]:w-full"
          >
            Return to patient dashboard
          </Link>
        </div>
      </section>
    </main>
  )
}

function GovernanceAccessDeniedPage() {
  const { logout } = useGovernanceAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/governance/sign-in', { replace: true })
  }

  return (
    <main className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-10">
      <section className="grid w-full max-w-[620px] gap-5 rounded-[14px] border border-[#d7e5ec] bg-white p-7 text-center shadow-[0_12px_30px_rgba(25,64,93,0.07)]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#feeceb] text-[#a22828]">
          <span className="text-xl font-black">!</span>
        </div>
        <div className="grid gap-2">
          <h1 className="m-0 text-2xl font-bold text-[#102033]">AI Governance access only</h1>
          <p className="m-0 text-[1rem] font-semibold leading-[1.55] text-[#53687b]">
            You are signed in to AI Governance. You do not have access to this page.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/governance"
            className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-bold text-[#0f5f8c] max-[720px]:w-full"
          >
            Return to AI Governance
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white max-[720px]:w-full"
          >
            Log out of AI Governance
          </button>
        </div>
      </section>
    </main>
  )
}

function ClinicianAccessDeniedPage() {
  const { logout } = useClinicianAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/staff/sign-in', { replace: true })
  }

  return (
    <main className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-10">
      <section className="grid w-full max-w-[620px] gap-5 rounded-[14px] border border-[#d7e5ec] bg-white p-7 text-center shadow-[0_12px_30px_rgba(25,64,93,0.07)]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#feeceb] text-[#a22828]">
          <span className="text-xl font-black">!</span>
        </div>
        <div className="grid gap-2">
          <h1 className="m-0 text-2xl font-bold text-[#102033]">Clinician access only</h1>
          <p className="m-0 text-[1rem] font-semibold leading-[1.55] text-[#53687b]">
            You are signed in as a clinician. You do not have access to this page.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/staff/doctor"
            className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-bold text-[#0f5f8c] max-[720px]:w-full"
          >
            Return to clinician dashboard
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white max-[720px]:w-full"
          >
            Log out as clinician
          </button>
        </div>
      </section>
    </main>
  )
}

function SessionLoading() {
  return (
    <div className="grid min-h-[55vh] place-items-center text-sm font-bold text-[#53687b]">
      Checking session...
    </div>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const { user } = usePatientAuth()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [pathname])

  const assistantAgentConfig = getAssistantAgentConfig(pathname, user)

  // Portal routes own a full-height sidebar layout, so they render edge-to-edge.
  // The role picker and other standalone screens stay in the centered container.
  const isPortalRoute =
    pathname.startsWith('/patient') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/governance')

  return (
    <div className="min-h-screen">
      {isPortalRoute ? (
        <Outlet />
      ) : (
        <div className="mx-auto flex min-h-screen w-[min(1760px,calc(100%-28px))] flex-col pt-3.5 max-[720px]:w-[min(calc(100%-18px),1760px)] max-[720px]:pt-3.5">
          <Outlet />
        </div>
      )}
      <AiAssistantWidget
        agentConfig={assistantAgentConfig}
        doctorRegisterMode={pathname === '/staff/sign-in'}
        guardrailMode={pathname === '/governance/ai-agents'}
      />
    </div>
  )
}

// UC2 (portal continuation) — each page's "Ask AI" runs as a scoped svc-* ACL identity.
// patientEmail (patient portal) binds the read to the logged-in patient; doctor pages
// omit it, so the backend reads a representative patient to show the redaction contrast.
type ScopedPageAgent = { key: string; label: string; scope: string; pageName: string }

const PATIENT_PAGE_AGENTS: Record<string, ScopedPageAgent> = {
  '/patient/book': { key: 'scheduling', label: 'Scheduling Agent', scope: 'rank appointment slots', pageName: 'Book Appointment' },
  '/patient/appointments': { key: 'reminder', label: 'Reminder Agent', scope: 'send appointment reminders', pageName: 'My Appointments' },
  '/patient/profile': { key: 'identity', label: 'Identity Verification Agent', scope: 'verify your identity', pageName: 'Profile' },
  '/patient/contact': { key: 'triage', label: 'Triage Agent', scope: 'assign a triage priority', pageName: 'Contact' },
}

const DOCTOR_PAGE_AGENTS: Record<string, ScopedPageAgent> = {
  '/staff/notes': { key: 'notes', label: 'Clinical Notes Agent', scope: 'read/write appointment notes', pageName: 'Doctor Notes' },
  '/staff/appointments': { key: 'scheduling', label: 'Scheduling Agent', scope: 'rank appointment slots', pageName: 'Appointments' },
  '/staff/queue': { key: 'triage', label: 'Triage Agent', scope: 'assign a triage priority', pageName: 'Patient Queue' },
}

function getAssistantAgentConfig(pathname: string, user: PatientAuthUser | null): AiAssistantAgentConfig | null {
  // Patient portal — scoped agent bound to the logged-in patient.
  const patientAgent = PATIENT_PAGE_AGENTS[pathname]
  if (patientAgent) {
    const email = user?.attributes.email?.trim() || user?.username || ''
    return {
      agentSysId: BOOK_APPOINTMENT_AGENT_ID,
      pageName: patientAgent.pageName,
      identity: { key: patientAgent.key, label: patientAgent.label, scope: patientAgent.scope, patientEmail: email },
    }
  }

  // Doctor portal — Patient Record page (route carries the patient id) + fixed routes.
  const isPatientRecord = pathname.startsWith('/staff/patient/')
  const doctorAgent = isPatientRecord
    ? { key: 'identity', label: 'Identity Verification Agent', scope: 'verify patient identity', pageName: 'Patient Record' }
    : DOCTOR_PAGE_AGENTS[pathname]
  if (doctorAgent) {
    // On the Patient Record page, bind the scoped read to the record on screen.
    // The route's :id is a lookup value (name / email / patient id), so pass it as
    // the resolver query — the backend matches it LIKE name/email/patient_id — so
    // the assistant answers about the patient the clinician is viewing rather than
    // a representative one. The "search" placeholder (no patient chosen yet) falls
    // back to the representative patient.
    let patientLookup: string | undefined
    if (isPatientRecord) {
      const raw = decodeURIComponent(pathname.split('/staff/patient/')[1]?.split('/')[0] || '').trim()
      patientLookup = raw && raw.toLowerCase() !== 'search' ? raw : undefined
    }
    return {
      agentSysId: BOOK_APPOINTMENT_AGENT_ID,
      pageName: doctorAgent.pageName,
      identity: { key: doctorAgent.key, label: doctorAgent.label, scope: doctorAgent.scope, patientEmail: patientLookup },
    }
  }

  return null
}

export default App
