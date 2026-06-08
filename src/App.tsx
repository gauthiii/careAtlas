import { useEffect, type ReactNode } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { GovernanceAclPage } from './pages/governance/GovernanceAclPage'
import { GovernanceAiAgentsPage } from './pages/governance/GovernanceAiAgentsPage'
import { GovernanceDashboardPage } from './pages/governance/GovernanceDashboardPage'
import { GovernanceDemoPage } from './pages/governance/GovernanceDemoPage'
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
import { usePatientAuth } from './contexts/PatientAuthContext'

function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<ViewChooserPage />} />
        <Route path="/role-picker" element={<ViewChooserPage />} />
        <Route path="/patient/home" element={<LandingPage />} />
        <Route path="/patient/register" element={<RegistrationPage />} />
        <Route path="/patient/verify-email" element={<EmailVerificationPage />} />
        <Route path="/patient/sign-in" element={<PatientSignInPage />} />
        <Route
          path="/patient/dashboard"
          element={
            <PatientProtectedRoute>
              <DashboardPage />
            </PatientProtectedRoute>
          }
        />
        <Route
          path="/patient/book"
          element={
            <PatientProtectedRoute>
              <BookAppointmentPage />
            </PatientProtectedRoute>
          }
        />
        <Route
          path="/patient/profile"
          element={
            <PatientProtectedRoute>
              <ProfilePage />
            </PatientProtectedRoute>
          }
        />
        <Route path="/patient/contact" element={<ContactPage />} />
        <Route
          path="/staff/sign-in"
          element={
            <PatientRoleBlocker>
              <StaffSignInPage />
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/staff/doctor"
          element={
            <PatientRoleBlocker>
              <DoctorDashboardPage />
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/staff/admin"
          element={
            <PatientRoleBlocker>
              <AdminDashboardPage />
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/staff/patient/:id"
          element={
            <PatientRoleBlocker>
              <PatientRecordPage />
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/staff/availability"
          element={
            <PatientRoleBlocker>
              <AvailabilityPage />
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance"
          element={
            <PatientRoleBlocker>
              <GovernanceDashboardPage />
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/ai-agents"
          element={
            <PatientRoleBlocker>
              <GovernanceAiAgentsPage />
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/acl"
          element={
            <PatientRoleBlocker>
              <GovernanceAclPage />
            </PatientRoleBlocker>
          }
        />
        <Route
          path="/governance/demo"
          element={
            <PatientRoleBlocker>
              <GovernanceDemoPage />
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

function Shell() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [pathname])

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-[min(1760px,calc(100%-28px))] flex-col pt-3.5 max-[720px]:w-[min(calc(100%-18px),1760px)] max-[720px]:pt-3.5">
        <Outlet />
      </div>
    </div>
  )
}

export default App
