import { useEffect, type ReactNode } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { GovernanceAclPage } from './pages/governance/GovernanceAclPage'
import { GovernanceAiAgentsPage } from './pages/governance/GovernanceAiAgentsPage'
import { GovernanceDashboardPage } from './pages/governance/GovernanceDashboardPage'
import { GovernanceDemoPage } from './pages/governance/GovernanceDemoPage'
import { GovernanceSignInPage } from './pages/governance/GovernanceSignInPage'
import { ViewChooserPage } from './pages/home/ViewChooserPage'
import { BookAppointmentPage } from './pages/patient/BookAppointmentPage'
import { ContactPage } from './pages/patient/ContactPage'
import { DashboardPage } from './pages/patient/DashboardPage'
import { EmailVerificationPage } from './pages/patient/EmailVerificationPage'
import { LandingPage } from './pages/patient/LandingPage'
import { ProfilePage } from './pages/patient/ProfilePage'
import { RegistrationPage } from './pages/patient/RegistrationPage'
import { SignInPage as PatientSignInPage } from './pages/patient/SignInPage'
import { AdminDashboardPage } from './pages/staff/AdminDashboardPage'
import { AvailabilityPage } from './pages/staff/AvailabilityPage'
import { DoctorDashboardPage } from './pages/staff/DoctorDashboardPage'
import { PatientRecordPage } from './pages/staff/PatientRecordPage'
import { StaffSignInPage } from './pages/staff/StaffSignInPage'
import { AiAssistantWidget, type AiAssistantAgentConfig } from './components/AiAssistantWidget'
import { useClinicianAuth } from './contexts/ClinicianAuthContext'
import { useGovernanceAuth } from './contexts/GovernanceAuthContext'
import { patientDisplayName, usePatientAuth, type PatientAuthUser } from './contexts/PatientAuthContext'

const BOOK_APPOINTMENT_AGENT_ID = 'b2cdf70e1bd50f54d7eaea45604bcb0c'

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

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-[min(1760px,calc(100%-28px))] flex-col pt-3.5 max-[720px]:w-[min(calc(100%-18px),1760px)] max-[720px]:pt-3.5">
        <Outlet />
      </div>
      <AiAssistantWidget agentConfig={assistantAgentConfig} />
    </div>
  )
}

function getAssistantAgentConfig(pathname: string, user: PatientAuthUser | null): AiAssistantAgentConfig | null {
  if (pathname !== '/patient/book') return null

  const fullName = patientDisplayName(user)
  const email = user?.attributes.email?.trim() || user?.username || 'unknown email'

  return {
    agentSysId: BOOK_APPOINTMENT_AGENT_ID,
    pageName: 'Book Appointment',
    systemContext: `System context: The logged-in CareAtlas patient is ${fullName}. Email: ${email}. Current page: Book Appointment. Use this context when helping with appointment booking.`,
  }
}

export default App
