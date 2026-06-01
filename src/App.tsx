import { ArrowRight, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'

import { GovernanceDashboardPage } from './pages/governance/GovernanceDashboardPage'
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

const screenLinks = [
  ['View chooser', '/'],
  ['Patient landing', '/patient/home'],
  ['Patient registration', '/patient/register'],
  ['Email verification', '/patient/verify-email'],
  ['Patient sign in', '/patient/sign-in'],
  ['Patient dashboard', '/patient/dashboard'],
  ['Book appointment', '/patient/book'],
  ['My profile', '/patient/profile'],
  ['Contact us', '/patient/contact'],
  ['Staff sign in', '/staff/sign-in'],
  ['Doctor dashboard', '/staff/doctor'],
  ['Admin dashboard', '/staff/admin'],
  ['Patient record', '/staff/patient/P-1048'],
  ['Availability', '/staff/availability'],
  ['AI governance', '/governance'],
]

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Shell() {
  const [directoryOpen, setDirectoryOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="atlas-shell">
      <div className="atlas-stage">
        <Outlet />
      </div>

      <button className="directory-button floating-directory" onClick={() => setDirectoryOpen(true)}>
        <Menu size={18} /> Screens
      </button>

      <aside className={`directory ${directoryOpen ? 'open' : ''}`} aria-hidden={!directoryOpen}>
        <div className="directory-head">
          <div>
            <span className="eyebrow">Screen directory</span>
            <h2>Jump to any page</h2>
          </div>
          <button onClick={() => setDirectoryOpen(false)} aria-label="Close screen directory"><X size={20} /></button>
        </div>
        <div className="directory-list">
          {screenLinks.map(([label, path]) => (
            <Link
              className={location.pathname === path ? 'active' : ''}
              key={path}
              to={path}
              onClick={() => setDirectoryOpen(false)}
            >
              {label}
              <ArrowRight size={15} />
            </Link>
          ))}
        </div>
      </aside>
      {directoryOpen && <button className="scrim" aria-label="Close directory" onClick={() => setDirectoryOpen(false)} />}
    </div>
  )
}

export default App
