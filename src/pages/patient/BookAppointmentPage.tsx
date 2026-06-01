import { CalendarPlus, CheckCircle2, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppointmentCard } from '../../components/patient/AppointmentCard'
import { PatientPanel } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { bookingSlots, upcomingAppointment } from '../../data/patientPortalData'

export function BookAppointmentPage() {
  return (
    <PatientPage
      eyebrow="Book an appointment"
      title="Find an available clinic slot"
      intro="Choose a reason for visit, review available slots, and confirm the appointment summary."
    >
      <div className="booking-steps">
        <PatientPanel title="1. Reason for visit" icon={<FileText size={21} />}>
          <label className="patient-field">
            <span>Reason category</span>
            <select defaultValue="">
              <option value="" disabled>Select reason</option>
              <option>General check-up</option>
              <option>Follow-up</option>
              <option>Urgent concern</option>
              <option>Specialist referral</option>
              <option>Mental health</option>
              <option>Chronic condition management</option>
            </select>
          </label>
          <label className="patient-field">
            <span>Briefly describe your concern <em>Optional, max 200 characters</em></span>
            <textarea maxLength={200} placeholder="Add a short note for the clinic" />
          </label>
          <button className="patient-button secondary">Next</button>
        </PatientPanel>
        <PatientPanel title="2. Available slots" icon={<CalendarPlus size={21} />} tone="secure">
          <div className="booking-slot-grid">
            {bookingSlots.map((slot) => <AppointmentCard appointment={slot} selectable key={slot.id} />)}
          </div>
          <button className="patient-button secondary">Confirm booking</button>
        </PatientPanel>
        <PatientPanel title="3. Confirmation" icon={<CheckCircle2 size={21} />} tone="success">
          <div className="confirmation-summary">
            <strong>{upcomingAppointment.date} at {upcomingAppointment.time}</strong>
            <span>{upcomingAppointment.doctor}</span>
            <span>{upcomingAppointment.location}</span>
          </div>
          <button className="patient-button secondary">Add to calendar</button>
          <Link className="patient-button primary" to="/patient/dashboard">Return to dashboard</Link>
        </PatientPanel>
      </div>
    </PatientPage>
  )
}
