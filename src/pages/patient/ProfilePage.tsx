import { type ChangeEvent, type PointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  KeyRound,
  Lock,
  MessageCircle,
  Move,
  RefreshCw,
  ShieldAlert,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react'

import { PatientPage } from '../../components/patient/PatientShell'
import { patient } from '../../data/patientPortalData'
import { usePatientAuth } from '../../contexts/PatientAuthContext'
import { fetchPatientProfile, type PatientProfile } from '../../services/serviceNow'

type ProfileView = {
  patientId: string
  firstName: string
  lastName: string
  dob: string
  gender: string
  ethnicity: string
  language: string
  phone: string
  email: string
  street1: string
  street2: string
  city: string
  zip: string
  stateRegion: string
  condition: string
  accessibility: string
  insuranceId: string
  insuranceProvider: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelationship: string
  username: string
  profileStatus: string
  registrationStatus: string
  verified: boolean
  accountStatus: string
  bloodType: string
  knownAllergies: string
  activeSince: string
  confidenceScore: string
  consentAccepted: boolean
  privacyNoticeVersion: string
  timePreference: string
  lastUpdated: string
}

type ModalKind = 'password' | 'privacy' | 'twoFactor' | null

const fallbackProfile: ProfileView = {
  patientId: patient.insuranceId,
  firstName: patient.firstName,
  lastName: patient.lastName,
  dob: patient.dob,
  gender: patient.gender,
  ethnicity: patient.ethnicity,
  language: patient.language,
  phone: patient.phone,
  email: patient.email,
  street1: patient.street1,
  street2: patient.street2,
  city: patient.city,
  zip: patient.zip,
  stateRegion: 'Arizona, United States',
  condition: patient.condition,
  accessibility: 'No requirements',
  insuranceId: patient.insuranceId,
  insuranceProvider: 'Blue Cross Blue Shield',
  emergencyName: patient.emergencyName,
  emergencyPhone: patient.emergencyPhone,
  emergencyRelationship: patient.emergencyRelationship,
  username: patient.username,
  profileStatus: patient.profileStatus,
  registrationStatus: 'Approved',
  verified: true,
  accountStatus: 'Active',
  bloodType: 'O+',
  knownAllergies: 'Penicillin, Sulfa drugs',
  activeSince: 'Jan 2024',
  confidenceScore: '100',
  consentAccepted: true,
  privacyNoticeVersion: 'v1',
  timePreference: 'Morning',
  lastUpdated: 'Jun 2026',
}

const activityItems = [
  {
    title: 'Signed in from Chrome',
    time: 'Today, 9:04 AM',
    detail: 'Session opened from the current browser. This is mock audit data for the demo.',
  },
  {
    title: 'Appointment booked',
    time: 'Jun 2, 2:18 PM',
    detail: 'A primary care follow-up appointment was reserved from the patient portal.',
  },
  {
    title: 'Address updated',
    time: 'May 3, 4:55 PM',
    detail: 'The address card was reviewed. This page does not write changes back to ServiceNow.',
  },
  {
    title: 'Lab results downloaded',
    time: 'May 1, 1:00 PM',
    detail: 'A PDF download event is shown for demonstration only.',
  },
]

const statusText = (enabled: boolean) => (enabled ? 'Enabled' : 'Off')

function Toggle({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean
  onChange: (enabled: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? 'bg-[#143f6b]' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
          enabled ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function SkeletonBlock({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded bg-[#dfeaf0] ${className}`} aria-hidden="true" />
}

function InfoField({ label, value, loading = false }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#6c7b8a]">{label}</p>
      {loading ? <SkeletonBlock className="h-4 w-36" /> : <p className="text-sm text-[#102033]">{value || 'Not provided'}</p>}
    </div>
  )
}

function mergeProfile(profile: PatientProfile | null): ProfileView {
  if (!profile) return fallbackProfile

  const profileComplete = profile.profile_complete ? 'Complete' : profile.registration_status || fallbackProfile.profileStatus

  return {
    patientId: profile.patient_id || fallbackProfile.patientId,
    firstName: profile.first_name || fallbackProfile.firstName,
    lastName: profile.last_name || fallbackProfile.lastName,
    dob: profile.date_of_birth || fallbackProfile.dob,
    gender: profile.gender || fallbackProfile.gender,
    ethnicity: profile.ethnicity || fallbackProfile.ethnicity,
    language: profile.primary_language || fallbackProfile.language,
    phone: profile.phone || fallbackProfile.phone,
    email: profile.email || fallbackProfile.email,
    street1: profile.address_line1 || fallbackProfile.street1,
    street2: profile.address_line2 || fallbackProfile.street2,
    city: profile.city || fallbackProfile.city,
    zip: profile.postcode || fallbackProfile.zip,
    stateRegion: profile.state_region || fallbackProfile.stateRegion,
    condition: profile.health_condition || fallbackProfile.condition,
    accessibility: accessibilityLabel(profile.accessibility) || fallbackProfile.accessibility,
    insuranceId: profile.insurance_id || fallbackProfile.insuranceId,
    insuranceProvider: profile.insurance_provider || fallbackProfile.insuranceProvider,
    emergencyName: profile.emergency_name || fallbackProfile.emergencyName,
    emergencyPhone: profile.emergency_phone || fallbackProfile.emergencyPhone,
    emergencyRelationship: profile.emergency_relationship || fallbackProfile.emergencyRelationship,
    username: profile.username || fallbackProfile.username,
    profileStatus: profileComplete,
    registrationStatus: profile.registration_status || fallbackProfile.registrationStatus,
    verified: profile.email_verified || fallbackProfile.verified,
    accountStatus: profile.account_status || fallbackProfile.accountStatus,
    bloodType: profile.blood_type || fallbackProfile.bloodType,
    knownAllergies: profile.known_allergies || fallbackProfile.knownAllergies,
    activeSince: formatActiveSince(profile.active_since) || fallbackProfile.activeSince,
    confidenceScore: profile.confidence_score || fallbackProfile.confidenceScore,
    consentAccepted: profile.consent_accepted,
    privacyNoticeVersion: profile.privacy_notice_version || fallbackProfile.privacyNoticeVersion,
    timePreference: profile.time_preference || fallbackProfile.timePreference,
    lastUpdated: formatDateTime(profile.last_updated) || fallbackProfile.lastUpdated,
  }
}

function accessibilityLabel(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return ''
  if (['false', 'no', '0'].includes(normalized)) return 'No requirements'
  if (['true', 'yes', '1'].includes(normalized)) return 'Requirements noted'
  return value
}

function formatActiveSince(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function formatDateTime(value: string) {
  if (!value) return ''
  const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function initialsFor(profile: ProfileView) {
  return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || 'PT'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function ProfilePage() {
  const { user } = usePatientAuth()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [loadedProfile, setLoadedProfile] = useState<PatientProfile | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileRefreshKey, setProfileRefreshKey] = useState(0)
  const [modal, setModal] = useState<ModalKind>(null)
  const [emailReminders, setEmailReminders] = useState(true)
  const [smsReminders, setSmsReminders] = useState(true)
  const [clinicNotifications, setClinicNotifications] = useState(true)
  const [shareRecords, setShareRecords] = useState(true)
  const [clinicianAccess, setClinicianAccess] = useState(true)
  const [largeText, setLargeText] = useState(false)
  const [hearingLoop, setHearingLoop] = useState(false)
  const [interpreterRequired, setInterpreterRequired] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(0)
  const [avatarDataUrl, setAvatarDataUrl] = useState('')
  const [cropSource, setCropSource] = useState('')
  const [cropZoom, setCropZoom] = useState(1)
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [drag, setDrag] = useState<{ id: number; x: number; y: number } | null>(null)

  useEffect(() => {
    const email = user?.attributes.email?.trim() || ''
    const username = user?.username?.trim() || ''
    const name = user?.attributes.name?.trim() || ''

    if (!email && !username && !name) {
      setIsProfileLoading(false)
      return
    }

    let cancelled = false
    setLoadedProfile(null)
    setIsProfileLoading(true)
    fetchPatientProfile({ email, username, name })
      .then((profile) => {
        if (!cancelled && profile) setLoadedProfile(profile)
      })
      .catch(() => {
        if (!cancelled) setLoadedProfile(null)
      })
      .finally(() => {
        if (!cancelled) setIsProfileLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.attributes.email, user?.attributes.name, user?.username, profileRefreshKey])

  const profile = useMemo(() => mergeProfile(loadedProfile), [loadedProfile])
  const displayName = `${profile.firstName} ${profile.lastName}`.trim()

  function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = () => {
      setCropSource(String(reader.result || ''))
      setCropZoom(1)
      setCropX(0)
      setCropY(0)
    }
    reader.readAsDataURL(file)
  }

  function handleCropDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag || event.pointerId !== drag.id) return
    const nextX = clamp(cropX + (event.clientX - drag.x) / 2, -100, 100)
    const nextY = clamp(cropY + (event.clientY - drag.y) / 2, -100, 100)
    setCropX(nextX)
    setCropY(nextY)
    setDrag({ id: event.pointerId, x: event.clientX, y: event.clientY })
  }

  async function applyCrop() {
    if (!cropSource) return
    const image = await loadImage(cropSource)
    const outputSize = 320
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return

    canvas.width = outputSize
    canvas.height = outputSize

    const baseScale = Math.max(outputSize / image.naturalWidth, outputSize / image.naturalHeight) * cropZoom
    const sourceSize = outputSize / baseScale
    const maxX = Math.max((image.naturalWidth - sourceSize) / 2, 0)
    const maxY = Math.max((image.naturalHeight - sourceSize) / 2, 0)
    const centerX = image.naturalWidth / 2 - (cropX / 100) * maxX
    const centerY = image.naturalHeight / 2 - (cropY / 100) * maxY
    const sourceX = clamp(centerX - sourceSize / 2, 0, image.naturalWidth - sourceSize)
    const sourceY = clamp(centerY - sourceSize / 2, 0, image.naturalHeight - sourceSize)

    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize)
    setAvatarDataUrl(canvas.toDataURL('image/png'))
    setCropSource('')
  }

  return (
    <PatientPage
      title="Patient profile"
      intro="Non-sensitive contact details can be edited directly. Sensitive scheduling fields require clinic support."
    >
      <div className="-mt-3 mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setProfileRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-4 py-2 text-sm font-bold text-[#0f5f8c] hover:bg-[#f5f9fb]"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-[1fr_400px] gap-10 rounded-xl border border-[#d7e5ec] bg-white p-6 max-[1100px]:grid-cols-1">
        <div className="space-y-10">
          <div>
            <div className="flex items-start justify-between gap-4 max-[720px]:flex-col">
              <div className="flex gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e6eef5] font-semibold text-[#17436b]">
                  {avatarDataUrl ? (
                    <img src={avatarDataUrl} alt={`${displayName} profile`} className="h-full w-full object-cover" />
                  ) : isProfileLoading ? (
                    <SkeletonBlock className="h-full w-full rounded-full" />
                  ) : (
                    initialsFor(profile)
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-[#102033]">
                    {isProfileLoading ? <SkeletonBlock className="h-6 w-44" /> : displayName}
                  </h2>
                  {isProfileLoading ? (
                    <SkeletonBlock className="mt-2 h-4 w-36" />
                  ) : (
                    <p className="text-sm text-[#607487]">Patient ID: {profile.patientId}</p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {isProfileLoading ? (
                      <>
                        <SkeletonBlock className="h-6 w-28 rounded-full" />
                        <SkeletonBlock className="h-6 w-20 rounded-full" />
                        <SkeletonBlock className="h-6 w-20 rounded-full" />
                      </>
                    ) : (
                      <>
                        <span className="rounded-full bg-[#eaf8ef] px-3 py-1 text-xs text-[#1e7c42]">
                          Profile {profile.profileStatus.toLowerCase()}
                        </span>
                        <span className="rounded-full bg-[#e9f5ff] px-3 py-1 text-xs text-[#0f5f8c]">
                          {profile.verified ? 'Verified' : 'Verification pending'}
                        </span>
                        <span className="rounded-full bg-[#f2f6f8] px-3 py-1 text-xs text-[#607487]">
                          {profile.accountStatus}
                        </span>
                        {!loadedProfile && (
                          <span className="rounded-full bg-[#fff7df] px-3 py-1 text-xs text-[#8a5a00]">
                            Demo profile data
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm font-medium text-[#0f5f8c]"
              >
                <Camera size={16} />
                Upload photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </div>

            <div className="mt-8 flex flex-wrap gap-12">
              <Stat label="Total visits" value="12" loading={isProfileLoading} />
              <Stat label="Active since" value={profile.activeSince} loading={isProfileLoading} />
              <Stat label="Next appointment" value="June 4" loading={isProfileLoading} />
            </div>

            <section className="mt-8 rounded-[12px] border border-[#d7e5ec] bg-[#f7fbfd] p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-[#6c7b8a]">
                Profile assurance
              </p>
              <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1">
                <AssuranceFact label="Identity confidence score" value={`${profile.confidenceScore || 'Not scored'}%`} loading={isProfileLoading} />
                <AssuranceFact label="Registration status" value={profile.registrationStatus} loading={isProfileLoading} />
                <AssuranceFact label="Account status" value={profile.accountStatus} loading={isProfileLoading} />
                <AssuranceFact label="Last updated" value={profile.lastUpdated} loading={isProfileLoading} />
              </div>
            </section>
          </div>

          <section className="border-t border-[#d7e5ec] pt-6">
            <SectionHeader title="Personal information" action="Edit" onAction={() => setModal('password')} />
            <div className="grid grid-cols-2 gap-y-8 max-[700px]:grid-cols-1">
              <InfoField label="First Name" value={profile.firstName} loading={isProfileLoading} />
              <InfoField label="Last Name" value={profile.lastName} loading={isProfileLoading} />
              <InfoField label="Date of Birth" value={profile.dob} loading={isProfileLoading} />
              <InfoField label="Gender" value={profile.gender} loading={isProfileLoading} />
              <InfoField label="Ethnicity" value={profile.ethnicity} loading={isProfileLoading} />
              <InfoField label="Primary Language" value={profile.language} loading={isProfileLoading} />
              <InfoField label="Phone Number" value={profile.phone} loading={isProfileLoading} />
              <InfoField label="Email Address" value={profile.email} loading={isProfileLoading} />
            </div>

            <div className="mt-10 grid grid-cols-2 gap-y-8 max-[700px]:grid-cols-1">
              <InfoField label="Street Address Line 1" value={profile.street1} loading={isProfileLoading} />
              <InfoField label="Street Address Line 2" value={profile.street2} loading={isProfileLoading} />
              <InfoField label="City" value={profile.city} loading={isProfileLoading} />
              <InfoField label="Postal Code / ZIP" value={profile.zip} loading={isProfileLoading} />
              <InfoField label="State / Region" value={profile.stateRegion} loading={isProfileLoading} />
            </div>
          </section>

          <section className="border-t border-[#d7e5ec] pt-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-[#102033]">Health information</h3>
                <span className="rounded-full bg-[#eef6ff] px-2 py-1 text-[11px] text-[#0f5f8c]">
                  Clinic-managed
                </span>
              </div>
              <button type="button" onClick={() => setModal('privacy')} className="text-[#0f5f8c]">
                Edit non-sensitive
              </button>
            </div>

            <div className="mb-8 flex items-center gap-2 rounded-md bg-[#eaf3fb] px-4 py-3 text-sm text-[#607487]">
              <ShieldAlert size={16} />
              Date of birth, ethnicity, and health condition category are shown but cannot be self-edited.
            </div>

            <div className="mb-8 grid grid-cols-3 gap-3 rounded-[12px] border border-[#d7e5ec] bg-[#fbfdfe] p-4 max-[820px]:grid-cols-1">
              <AssuranceFact label="Preferred appointment time" value={profile.timePreference} loading={isProfileLoading} />
              <AssuranceFact label="Accessibility" value={profile.accessibility} loading={isProfileLoading} />
              <AssuranceFact label="Health condition source" value="Clinic-managed" loading={isProfileLoading} />
            </div>

            <div className="grid grid-cols-2 gap-y-8 max-[700px]:grid-cols-1">
              <InfoField label="Primary Health Condition" value={profile.condition} loading={isProfileLoading} />
              <InfoField label="Mobility / Accessibility Needs" value={profile.accessibility} loading={isProfileLoading} />
              <InfoField label="Insurance / Coverage ID" value={profile.insuranceId} loading={isProfileLoading} />
              <InfoField label="Insurance Provider" value={profile.insuranceProvider} loading={isProfileLoading} />
              <InfoField label="Emergency Contact Name" value={profile.emergencyName} loading={isProfileLoading} />
              <InfoField label="Relationship" value={profile.emergencyRelationship} loading={isProfileLoading} />
              <InfoField label="Emergency Contact Phone" value={profile.emergencyPhone} loading={isProfileLoading} />
              <InfoField label="Blood Type" value={profile.bloodType} loading={isProfileLoading} />
              <InfoField label="Known Allergies" value={profile.knownAllergies} loading={isProfileLoading} />
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <Panel title="Account controls" icon={<Lock size={18} />}>
            <div className="space-y-4 text-sm">
              <button type="button" onClick={() => setModal('password')} className="w-full text-left">
                <p className="font-semibold">Change password</p>
                <p className="text-[#607487]">Open mock credential flow</p>
              </button>
              <ToggleRow title="Email reminders" description={`Appointment reminders ${statusText(emailReminders).toLowerCase()}`} enabled={emailReminders} onChange={setEmailReminders} />
              <ToggleRow title="SMS reminders" description={`Text reminders ${statusText(smsReminders).toLowerCase()}`} enabled={smsReminders} onChange={setSmsReminders} />
              <ToggleRow title="Clinic notifications" description={`Push alerts ${statusText(clinicNotifications).toLowerCase()}`} enabled={clinicNotifications} onChange={setClinicNotifications} />
            </div>
          </Panel>

          <Panel title="Privacy & data sharing" icon={<Eye size={18} />}>
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 rounded-[12px] border border-[#d7e5ec] bg-[#fbfdfe] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#6c7b8a]">
                  Consent & privacy record
                </p>
                <RecordFact label="Consent accepted" value={profile.consentAccepted ? 'Yes' : 'No'} loading={isProfileLoading} />
                <RecordFact label="Privacy notice" value={profile.privacyNoticeVersion} loading={isProfileLoading} />
                <RecordFact label="Email verified" value={profile.verified ? 'Yes' : 'No'} loading={isProfileLoading} />
              </div>
              <ToggleRow title="Share records with GP" description={statusText(shareRecords)} enabled={shareRecords} onChange={setShareRecords} />
              <ToggleRow title="Clinician record access" description={clinicianAccess ? 'Full access enabled' : 'Limited access selected'} enabled={clinicianAccess} onChange={setClinicianAccess} />
              <button type="button" onClick={() => setModal('privacy')} className="text-[#0f5f8c]">
                View full privacy policy
              </button>
            </div>
          </Panel>

          <Panel title="Recent account activity" icon={<FileText size={18} />}>
            <div className="space-y-3 text-sm">
              {activityItems.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setSelectedActivity(index)}
                  className={`w-full rounded-[9px] border px-3 py-2 text-left ${
                    selectedActivity === index ? 'border-[#9fc8d8] bg-[#f2f9fc]' : 'border-transparent'
                  }`}
                >
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-[#607487]">{item.time}</p>
                  {selectedActivity === index && <p className="mt-2 text-[#53687b]">{item.detail}</p>}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Accessibility preferences" icon={<MessageCircle size={18} />}>
            <div className="space-y-4 text-sm">
              <ToggleRow title="Large text mode" description={largeText ? 'On for this session' : 'Off'} enabled={largeText} onChange={setLargeText} />
              <ToggleRow title="Hearing loop required" description={hearingLoop ? 'Required' : 'Not set'} enabled={hearingLoop} onChange={setHearingLoop} />
              <ToggleRow title="Interpreter required" description={interpreterRequired ? 'Required' : 'Not required'} enabled={interpreterRequired} onChange={setInterpreterRequired} />
            </div>
          </Panel>

          <Panel title="Account credentials" icon={<KeyRound size={18} />}>
            <div className="grid grid-cols-2 gap-y-8">
              <InfoField label="Username" value={profile.username} loading={isProfileLoading} />
              <InfoField label="Password" value="********" />
            </div>

            <div className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-[#d7e5ec] p-4">
              <div>
                <p className="font-medium">Two-factor authentication</p>
                <p className="text-sm text-[#607487]">Enabled</p>
              </div>
              <button
                type="button"
                onClick={() => setModal('twoFactor')}
                className="rounded-md bg-[#143f6b] px-4 py-2 text-sm font-medium text-white"
              >
                Disable 2FA
              </button>
            </div>
          </Panel>
        </aside>
      </div>

      <MockModal kind={modal} onClose={() => setModal(null)} />
      {cropSource && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#102033]/50 px-4 py-6">
          <section className="grid w-full max-w-[520px] gap-5 rounded-[12px] border border-[#d7e5ec] bg-white p-5 shadow-[0_18px_50px_rgba(16,32,51,0.24)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#102033]">Crop profile photo</h2>
              <button type="button" onClick={() => setCropSource('')} className="grid h-9 w-9 place-items-center rounded-[9px] border border-[#d7e5ec]">
                <X size={17} />
              </button>
            </div>

            <div
              className="mx-auto h-[260px] w-[260px] cursor-grab touch-none overflow-hidden rounded-[16px] border border-[#cbdde6] bg-[#eef3f7]"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                setDrag({ id: event.pointerId, x: event.clientX, y: event.clientY })
              }}
              onPointerMove={handleCropDrag}
              onPointerUp={() => setDrag(null)}
              onPointerCancel={() => setDrag(null)}
            >
              <img
                src={cropSource}
                alt="Crop preview"
                draggable={false}
                className="h-full w-full object-cover"
                style={{ transform: `translate(${cropX}px, ${cropY}px) scale(${cropZoom})` }}
              />
            </div>

            <CropSlider icon={<ZoomIn size={17} />} label="Zoom" min={1} max={3} step={0.05} value={cropZoom} onChange={setCropZoom} />
            <CropSlider icon={<Move size={17} />} label="Horizontal" min={-100} max={100} step={1} value={cropX} onChange={setCropX} />
            <CropSlider icon={<Move size={17} />} label="Vertical" min={-100} max={100} step={1} value={cropY} onChange={setCropY} />

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={applyCrop} className="inline-flex min-h-[42px] items-center gap-2 rounded-[9px] bg-[#143A57] px-[15px] font-bold text-white">
                <Upload size={17} />
                Apply photo
              </button>
              <button type="button" onClick={() => setCropSource('')} className="inline-flex min-h-[42px] items-center rounded-[9px] border border-[#b7ceda] px-[15px] font-bold text-[#0f5f8c]">
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </PatientPage>
  )
}

function Stat({ label, value, loading = false }: { label: string; value: string; loading?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[#607487]">{label}</p>
      {loading ? <SkeletonBlock className="mt-1 h-6 w-20" /> : <p className="text-lg font-semibold">{value}</p>}
    </div>
  )
}

function AssuranceFact({ label, value, loading = false }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#6c7b8a]">{label}</p>
      {loading ? (
        <SkeletonBlock className="mt-1 h-4 w-28" />
      ) : (
        <p className="mt-1 text-sm font-semibold text-[#102033] [overflow-wrap:anywhere]">{value || 'Not provided'}</p>
      )}
    </div>
  )
}

function RecordFact({ label, value, loading = false }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#607487]">{label}</span>
      {loading ? (
        <SkeletonBlock className="h-4 w-16" />
      ) : (
        <span className="text-right font-semibold text-[#102033]">{value || 'Not provided'}</span>
      )}
    </div>
  )
}

function SectionHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-[#102033]">{title}</h3>
      <button type="button" onClick={onAction} className="flex items-center gap-2 text-[#0f5f8c]">
        <Edit3 size={15} />
        {action}
      </button>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 flex items-center gap-2 font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#e7f3f8] text-[#0f5f8c]">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function ToggleRow({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-[#607487]">{description}</p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} label={title} />
    </div>
  )
}

function MockModal({ kind, onClose }: { kind: ModalKind; onClose: () => void }) {
  if (!kind) return null

  const content = {
    password: {
      icon: <KeyRound size={20} />,
      title: 'Mock password change',
      body: 'This opens the credential workflow only for demo interaction. No password is changed and nothing is sent to the database.',
    },
    privacy: {
      icon: <CheckCircle2 size={20} />,
      title: 'Mock privacy settings',
      body: 'These controls are playable for the session only. They do not update consent, sharing rules, ServiceNow, or clinical access.',
    },
    twoFactor: {
      icon: <AlertTriangle size={20} />,
      title: 'Two-factor authentication is mandatory',
      body: 'This is mandatory. IT Security Admin strongly recommends this.',
    },
  }[kind]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#102033]/45 px-4 py-6">
      <section className="grid w-full max-w-[440px] gap-4 rounded-[12px] border border-[#d7e5ec] bg-white p-5 shadow-[0_18px_50px_rgba(16,32,51,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[#e7f3f8] text-[#0f5f8c]">{content.icon}</span>
            <h2 className="m-0 text-lg font-bold text-[#102033]">{content.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[9px] border border-[#d7e5ec]" aria-label="Close dialog">
            <X size={17} />
          </button>
        </div>
        <p className="text-sm font-semibold leading-[1.55] text-[#53687b]">{content.body}</p>
        <button type="button" onClick={onClose} className="inline-flex min-h-[42px] w-max items-center rounded-[9px] bg-[#143A57] px-[15px] font-bold text-white">
          OK
        </button>
      </section>
    </div>
  )
}

function CropSlider({
  icon,
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  icon: ReactNode
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#102033]">
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}
