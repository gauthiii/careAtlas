import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'

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
        <Route path="/patient/dashboard" element={<DashboardPage />} />
        <Route path="/patient/book" element={<BookAppointmentPage />} />
        <Route path="/patient/profile" element={<ProfilePage />} />
        <Route path="/patient/contact" element={<ContactPage />} />
        <Route path="/staff/sign-in" element={<StaffSignInPage />} />
        <Route path="/staff/doctor" element={<DoctorDashboardPage />} />
        <Route path="/staff/admin" element={<AdminDashboardPage />} />
        <Route path="/staff/patient/:id" element={<PatientRecordPage />} />
        <Route path="/staff/availability" element={<AvailabilityPage />} />
        <Route path="/governance" element={<GovernanceDashboardPage />} />
        <Route path="/governance/ai-agents" element={<GovernanceAiAgentsPage />} />
        <Route path="/governance/acl" element={<GovernanceAclPage />} />
        <Route path="/governance/demo" element={<GovernanceDemoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
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
