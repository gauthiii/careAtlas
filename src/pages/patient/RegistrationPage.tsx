import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PatientPage } from '../../components/patient/PatientShell'
import { PatientFormSection } from '../../components/patient/PatientFormSection'
import { registrationSections } from '../../data/patientPortalData'
import { generatePatient } from '../../lib/patientDataGenerator'

// Maps a generated patient onto the exact field labels rendered by the form.
function buildAutoFillValues(): Record<string, string> {
  const selectOptions: Record<string, string[]> = {}
  for (const section of registrationSections) {
    for (const field of section.fields) {
      if (field.type === 'select' && field.options) selectOptions[field.label] = field.options
    }
  }

  const patient = generatePatient(selectOptions)
  return {
    'First name': patient.firstName,
    'Last name': patient.lastName,
    'Date of birth': patient.dob,
    Gender: patient.gender,
    Ethnicity: patient.ethnicity,
    'Primary language': patient.language,
    'Contact phone number': patient.phone,
    'Email address': patient.email,
    'Street address line 1': patient.street1,
    'Street address line 2': patient.street2,
    City: patient.city,
    'Postcode / ZIP': patient.zip,
    'Primary health condition category': patient.condition,
    'Do you have any mobility or accessibility requirements?': patient.accessibility,
    'Insurance / coverage ID number': patient.insuranceId,
    'Emergency contact name': patient.emergencyName,
    'Emergency contact phone': patient.emergencyPhone,
    'Relationship to emergency contact': patient.emergencyRelationship,
    'Create a username': patient.username,
    'Create a password': patient.password,
    'Confirm password': patient.password,
  }
}

export function RegistrationPage() {
  const [values, setValues] = useState<Record<string, string>>({})

  const handleFieldChange = (label: string, value: string) =>
    setValues((current) => ({ ...current, [label]: value }))

  const handleAutoFill = () => setValues(buildAutoFillValues())

  return (
    <PatientPage
      title="Create your patient portal account"
      intro="Complete the intake form so the clinic can verify your identity and prepare appointment access."
    >
      <div className="grid gap-[22px] rounded-[14px] border border-[#d7e5ec] bg-white p-6 shadow-[0_12px_30px_rgba(25,64,93,0.07)] max-[720px]:rounded-xl">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#e7d8f5] bg-gradient-to-r from-[#f6f0fc] to-[#eef5fb] p-4 max-[720px]:grid max-[720px]:grid-cols-1">
          <div>
            <h2 className="m-0 flex items-center gap-1.5 text-[1.02rem] tracking-normal text-[#102033]">
              <Sparkles size={18} className="text-[#8b3fd1]" /> Auto-fill with sample data
            </h2>
            <p className="mt-1.5 mb-0 leading-normal text-[#607487]">Generate a realistic patient profile to skip manual entry while testing.</p>
          </div>
          <button
            type="button"
            onClick={handleAutoFill}
            className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-gradient-to-r from-[#8b3fd1] to-[#5a55e0] px-[18px] font-bold !text-white shadow-[0_8px_20px_rgba(124,58,209,0.28)] transition-transform hover:-translate-y-px active:translate-y-0"
          >
            <Sparkles size={16} /> Generate fields
          </button>
        </div>
        {registrationSections.map((section) => (
          <PatientFormSection
            section={section}
            key={section.title}
            values={values}
            onFieldChange={handleFieldChange}
          />
        ))}
        <section className="flex items-center justify-between gap-[18px] rounded-xl border border-[#d7e5ec] bg-[#f7fbfd] p-4 max-[720px]:grid max-[720px]:grid-cols-1">
          <div>
            <h2 className="m-0 text-[1.08rem] tracking-normal text-[#102033]">Password strength</h2>
            <p className="mt-1.5 mb-0 leading-normal text-[#607487]">Use at least 12 characters with a mix of letters, numbers, and symbols.</p>
          </div>
          <div className="grid grid-cols-4 gap-1.5" aria-label="Password strength indicator">
            <span className="h-2 rounded-full bg-[#12805c]" />
            <span className="h-2 rounded-full bg-[#12805c]" />
            <span className="h-2 rounded-full bg-[#12805c]" />
            <span className="h-2 rounded-full bg-[#d7e5ec]" />
          </div>
        </section>
        <label className="flex items-center gap-2.5 font-[750] text-[#40566b]">
          <input className="h-[18px] w-[18px]" type="checkbox" />
          <span>I agree to the terms of service and privacy policy.</span>
        </label>
      </div>

        <Link className="mt-6 inline-flex min-h-[42px] w-max cursor-pointer align-center flex items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white" to="/patient/verify-email">Submit registration</Link>

    </PatientPage>
  )
}
