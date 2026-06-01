import { Edit3, Lock, ShieldAlert } from 'lucide-react'
import { PatientFieldControl } from '../../components/patient/PatientFormSection'
import { PatientPanel } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { profileControls, registrationSections } from '../../data/patientPortalData'

export function ProfilePage() {
  return (
    <PatientPage
      eyebrow="My profile"
      title="Review your patient information"
      intro="Non-sensitive contact details can be edited. Sensitive scheduling fields require clinic support."
    >
      <div className="profile-layout">
        <section className="profile-field-ledger">
          {registrationSections.map((section) => (
            <div className="profile-section" key={section.title}>
              <div className="profile-section-title">
                <h2>{section.title}</h2>
                <button><Edit3 size={16} /> Edit non-sensitive fields</button>
              </div>
              <div className="profile-field-grid">
                {section.fields.map((field) => <PatientFieldControl field={field} readOnly key={field.label} />)}
              </div>
            </div>
          ))}
        </section>
        <aside className="profile-side">
          <PatientPanel title="Sensitive fields" icon={<ShieldAlert size={21} />} tone="warning">
            <p>Date of birth, ethnicity, and health condition category are shown but cannot be self-edited.</p>
          </PatientPanel>
          <PatientPanel title="Account controls" icon={<Lock size={21} />} tone="secure">
            <div className="profile-control-list">
              {profileControls.map((control) => (
                <button className={control.danger ? 'danger' : ''} key={control.label}>
                  <strong>{control.label}</strong>
                  <span>{control.detail}</span>
                </button>
              ))}
            </div>
          </PatientPanel>
        </aside>
      </div>
    </PatientPage>
  )
}
