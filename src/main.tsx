import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ClinicianAuthProvider } from './contexts/ClinicianAuthContext'
import { PatientAuthProvider } from './contexts/PatientAuthContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <PatientAuthProvider>
        <ClinicianAuthProvider>
          <App />
        </ClinicianAuthProvider>
      </PatientAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
