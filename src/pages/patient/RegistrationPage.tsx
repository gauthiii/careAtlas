import { useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle, LoaderCircle, SearchCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PatientPage } from '../../components/patient/PatientShell'
import { PatientFormSection } from '../../components/patient/PatientFormSection'
import { registrationSections } from '../../data/patientPortalData'
import { generatePatient } from '../../lib/patientDataGenerator'
import {
  checkPwnedPassword,
  registerPatient,
  type PatientRegistrationRequest,
  type PatientRegistrationResponse,
} from '../../services/serviceNow'

type PwnedPasswordState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'safe'; count: 0 }
  | { status: 'pwned'; count: number }
  | { status: 'error'; message: string }

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

function registrationPayload(values: Record<string, string>, consentAccepted: boolean): PatientRegistrationRequest {
  return {
    first_name: values['First name'] ?? '',
    last_name: values['Last name'] ?? '',
    date_of_birth: values['Date of birth'] ?? '',
    gender: values.Gender ?? '',
    ethnicity: values.Ethnicity ?? '',
    primary_language: values['Primary language'] ?? '',
    phone: values['Contact phone number'] ?? '',
    email: values['Email address'] ?? '',
    address_line1: values['Street address line 1'] ?? '',
    address_line2: values['Street address line 2'] || null,
    city: values.City ?? '',
    postcode: values['Postcode / ZIP'] ?? '',
    health_condition: values['Primary health condition category'] ?? '',
    accessibility: values['Do you have any mobility or accessibility requirements?'] ?? '',
    insurance_id: values['Insurance / coverage ID number'] || null,
    emergency_name: values['Emergency contact name'] ?? '',
    emergency_phone: values['Emergency contact phone'] ?? '',
    emergency_relationship: values['Relationship to emergency contact'] ?? '',
    username: values['Create a username'] ?? '',
    consent_accepted: consentAccepted,
  }
}

function validateRegistration(values: Record<string, string>, consentAccepted: boolean): string | null {
  const missingField = registrationSections
    .flatMap((section) => section.fields)
    .find((field) => {
      const isPassword = field.label === 'Create a password' || field.label === 'Confirm password'
      return field.required && !isPassword && !(values[field.label] ?? '').trim()
    })

  if (missingField) return `Please complete ${missingField.label}.`
  if (!(values['Create a password'] ?? '').trim()) return 'Please create a password.'
  if (values['Create a password'] !== values['Confirm password']) return 'Password and confirmation must match.'
  if (!consentAccepted) return 'Please agree to the terms of service and privacy policy.'
  return null
}

export function RegistrationPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmation, setConfirmation] = useState<PatientRegistrationResponse | null>(null)
  const [pwnedPassword, setPwnedPassword] = useState<PwnedPasswordState>({ status: 'idle' })

  const handleFieldChange = (label: string, value: string) => {
    setConfirmation(null)
    setErrorMessage('')
    if (label === 'Create a password') setPwnedPassword({ status: 'idle' })
    setValues((current) => ({ ...current, [label]: value }))
  }

  const handleAutoFill = () => {
    setValues(buildAutoFillValues())
    setConfirmation(null)
    setErrorMessage('')
    setPwnedPassword({ status: 'idle' })
  }

  const handlePasswordPwnedCheck = async () => {
    const password = values['Create a password'] ?? ''
    if (!password) {
      setPwnedPassword({ status: 'error', message: 'Enter a password before checking breaches.' })
      return
    }

    setPwnedPassword({ status: 'checking' })
    try {
      const result = await checkPwnedPassword(password)
      setPwnedPassword(result.pwned ? { status: 'pwned', count: result.count } : { status: 'safe', count: 0 })
    } catch (error) {
      setPwnedPassword({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to check password breaches.',
      })
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setConfirmation(null)

    const validationError = validateRegistration(values, consentAccepted)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await registerPatient(registrationPayload(values, consentAccepted))
      setConfirmation(response)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit registration.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PatientPage
      title="Create your patient portal account"
      intro="Complete the intake form so the clinic can verify your identity and prepare appointment access."
    >
      <form onSubmit={handleSubmit} className="grid gap-[22px] rounded-[14px] border border-[#d7e5ec] bg-white p-6 shadow-[0_12px_30px_rgba(25,64,93,0.07)] max-[720px]:rounded-xl">
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
            fieldAccessory={(field) =>
              field.label === 'Create a password' ? (
                <button
                  type="button"
                  onClick={handlePasswordPwnedCheck}
                  disabled={pwnedPassword.status === 'checking'}
                  title="Check password against known breaches"
                  aria-label="Check password against known breaches"
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-[#cbdde6] bg-white text-[#143A57] transition-colors hover:bg-[#f0f7fb] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pwnedPassword.status === 'checking' ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <SearchCheck size={16} />
                  )}
                </button>
              ) : null
            }
            fieldFeedback={(field) =>
              field.label === 'Create a password' ? <PasswordPwnedFeedback state={pwnedPassword} /> : null
            }
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
          <input
            className="h-[18px] w-[18px]"
            type="checkbox"
            checked={consentAccepted}
            onChange={(event) => {
              setConsentAccepted(event.target.checked)
              setConfirmation(null)
              setErrorMessage('')
            }}
          />
          <span>I agree to the terms of service and privacy policy.</span>
        </label>

        {errorMessage && (
          <div className="flex items-start gap-2 rounded-[10px] border border-[#f2c9c9] bg-[#fff4f4] p-4 text-sm font-semibold text-[#8a2f2f]" role="alert">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {confirmation && (
          <section className="grid gap-3 rounded-[10px] border border-[#bfe3d3] bg-[#f0fbf6] p-4 text-[#164c3a]" aria-live="polite">
            <h2 className="m-0 flex items-center gap-2 text-[1.02rem] tracking-normal">
              <CheckCircle size={19} /> {confirmation.message}
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm max-[720px]:grid-cols-1">
              <ConfirmationDetail label="Patient ID" value={confirmation.patient_id || confirmation.sys_id} />
              <ConfirmationDetail label="ServiceNow sys_id" value={confirmation.sys_id} />
              <ConfirmationDetail label="Name" value={`${confirmation.first_name} ${confirmation.last_name}`.trim()} />
              <ConfirmationDetail label="Email" value={confirmation.email} />
              <ConfirmationDetail label="Registration status" value={confirmation.registration_status} />
            </div>
            <Link className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white max-[720px]:w-full" to="/patient/verify-email">
              Continue to email verification
            </Link>
          </section>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white disabled:cursor-not-allowed disabled:opacity-70 max-[720px]:w-full"
        >
          {isSubmitting ? <LoaderCircle size={17} className="animate-spin" /> : null}
          {isSubmitting ? 'Creating registration...' : 'Submit registration'}
        </button>
      </form>

    </PatientPage>
  )
}

function PasswordPwnedFeedback({ state }: { state: PwnedPasswordState }) {
  if (state.status === 'idle') return null
  if (state.status === 'checking') {
    return <p className="m-0 text-xs font-bold text-[#607487]">Checking known breaches...</p>
  }
  if (state.status === 'safe') {
    return <p className="m-0 text-xs font-bold text-[#12805c]">This password was not found in known breaches.</p>
  }
  if (state.status === 'pwned') {
    return <p className="m-0 text-xs font-bold text-[#b42318]">This pwd is found in {state.count.toLocaleString()} breaches.</p>
  }
  return <p className="m-0 text-xs font-bold text-[#b42318]">{state.message}</p>
}

function ConfirmationDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-[8px] border border-[#cfeade] bg-white p-3">
      <span className="text-[0.72rem] font-black uppercase tracking-[0.06em] text-[#527464]">{label}</span>
      <strong className="[overflow-wrap:anywhere] text-[#143a2e]">{value || 'Not returned'}</strong>
    </div>
  )
}
