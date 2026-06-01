import { MailPlus, Phone } from 'lucide-react'
import { PatientPanel } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { hospital } from '../../data/patientPortalData'

export function ContactPage() {
  return (
    <PatientPage
      eyebrow="Contact us"
      title="Send a message to the clinic"
      intro="Use this form for appointment, billing, technical, or general questions."
    >
      <div className="patient-two-column">
        <PatientPanel title="Create a case" icon={<MailPlus size={21} />}>
          <label className="patient-field">
            <span>Subject</span>
            <select defaultValue="">
              <option value="" disabled>Select subject</option>
              <option>Appointment query</option>
              <option>Billing</option>
              <option>Technical issue</option>
              <option>Other</option>
            </select>
          </label>
          <label className="patient-field">
            <span>Message</span>
            <textarea placeholder="How can the clinic help?" />
          </label>
          <button className="patient-button primary">Submit case</button>
        </PatientPanel>
        <PatientPanel title="Clinic contact" icon={<Phone size={21} />} tone="secure">
          <div className="clinic-contact-card">
            <strong>{hospital.phone}</strong>
            <span>{hospital.hours}</span>
            <span>{hospital.address}</span>
          </div>
          <p className="case-reference">After submission, the patient receives email confirmation with reference number CASE-7802.</p>
        </PatientPanel>
      </div>
    </PatientPage>
  )
}
