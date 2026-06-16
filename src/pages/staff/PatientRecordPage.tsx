import { AlertTriangle, Bot, CalendarDays, FileText, Flag, LoaderCircle, Search, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { DoctorPage } from '../../components/staff/DoctorShell'
import { PortalPanel, PortalTable } from '../../components/portal/PortalShell'
import { useClinicianSchedule } from '../../hooks/useClinicianSchedule'
import {
  appointmentReason,
  appointmentSortValue,
  appointmentsForPatient,
  formatAppointmentDateTime,
  formatDate,
  formatTime,
} from '../../lib/scheduling'
import { fetchPatientProfile, fetchSummaryNotes, type PatientProfile, type SummaryNote } from '../../services/serviceNow'

const fieldClass =
  'w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit'

export function PatientRecordPage() {
  const { id } = useParams()
  const initialSearch = useMemo(() => {
    const routeValue = decodeURIComponent(id || '').trim()
    if (!routeValue || routeValue === 'search' || /^P-\d+/i.test(routeValue)) return ''
    return routeValue
  }, [id])
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [searchedName, setSearchedName] = useState(initialSearch)
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const { appointments, error: scheduleError, isLoading: isScheduleLoading } = useClinicianSchedule()

  useEffect(() => {
    if (!initialSearch) return
    setSearchTerm(initialSearch)
    setSearchedName(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    let active = true
    const name = searchedName.trim()

    if (!name) {
      setPatientProfile(null)
      setSearchError(null)
      setIsSearching(false)
      return () => {
        active = false
      }
    }

    async function loadPatient() {
      setIsSearching(true)
      setSearchError(null)
      try {
        const profile = await fetchPatientProfile({ name })
        if (!active) return
        setPatientProfile(profile)
        if (!profile) setSearchError('Patient profile not found.')
      } catch (error) {
        if (!active) return
        setPatientProfile(null)
        setSearchError(error instanceof Error ? error.message : 'Unable to load patient profile.')
      } finally {
        if (active) setIsSearching(false)
      }
    }

    loadPatient()

    return () => {
      active = false
    }
  }, [searchedName])

  const patientAppointments = useMemo(
    () => appointmentsForPatient(appointments, patientProfile).sort((a, b) => appointmentSortValue(b) - appointmentSortValue(a)),
    [appointments, patientProfile],
  )

  const [patientNotes, setPatientNotes] = useState<SummaryNote[]>([])
  useEffect(() => {
    let active = true
    const sysId = patientProfile?.sys_id
    if (!sysId) {
      setPatientNotes([])
      return () => { active = false }
    }
    fetchSummaryNotes({ patientSysId: sysId })
      .then((rows) => { if (active) setPatientNotes(rows) })
      .catch(() => { if (active) setPatientNotes([]) })
    return () => { active = false }
  }, [patientProfile?.sys_id])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearchedName(searchTerm.trim())
  }

  return (
    <DoctorPage
      title="Patient record search"
      intro="Search a patient name to pull their live ServiceNow patient details and related appointment rows."
    >
      <PortalPanel title="Find patient" icon={<Search size={21} />} tone="secure">
        <form className="grid grid-cols-[1fr_auto] gap-3 max-[720px]:grid-cols-1" onSubmit={handleSearch}>
          <label className="grid gap-[7px] text-[0.84rem] font-extrabold text-[#40566b]">
            Patient name
            <input
              className={fieldClass}
              placeholder="Search by first and last name"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={isSearching || !searchTerm.trim()}
            className="self-end inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#0f5f8c] px-[15px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 max-[720px]:w-full"
          >
            {isSearching ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}
            Search
          </button>
        </form>
      </PortalPanel>

      {searchError && (
        <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-[#f6c6c4] bg-[#fff4f3] p-3 text-[0.86rem] font-bold text-[#a22828]">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {!searchedName && !patientProfile && (
        <div className="mt-4 rounded-[10px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-5 text-center text-sm font-bold text-[#53687b]">
          Enter a patient name to load their record.
        </div>
      )}

      {patientProfile && (
        <div className="mt-4 grid gap-4 grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] max-[1100px]:grid-cols-1">
          <section className="grid gap-4">
            <PortalPanel
              title={`${patientProfile.first_name} ${patientProfile.last_name}`.trim() || 'Patient demographic details'}
              icon={<UserRound size={21} />}
              tone="secure"
            >
              <div className="grid grid-cols-2 gap-3.5 max-[720px]:grid-cols-1">
                <RecordField label="Patient ID" value={patientProfile.patient_id} />
                <RecordField label="ServiceNow sys_id" value={patientProfile.sys_id} />
                <RecordField label="Date of birth" value={patientProfile.date_of_birth} />
                <RecordField label="Gender" value={patientProfile.gender} />
                <RecordField label="Ethnicity" value={patientProfile.ethnicity} />
                <RecordField label="Language" value={patientProfile.primary_language} />
                <RecordField label="Phone" value={patientProfile.phone} />
                <RecordField label="Email" value={patientProfile.email} />
                <RecordField label="Address" value={[patientProfile.address_line1, patientProfile.city, patientProfile.postcode, patientProfile.state_region].filter(Boolean).join(', ')} />
                <RecordField label="Condition" value={patientProfile.health_condition} />
                <RecordField label="Blood type" value={patientProfile.blood_type} />
                <RecordField label="Known allergies" value={patientProfile.known_allergies} />
                <RecordField label="Accessibility" value={patientProfile.accessibility} />
                <RecordField label="Insurance" value={patientProfile.insurance_provider || patientProfile.insurance_id} />
                <RecordField label="Emergency contact" value={[patientProfile.emergency_name, patientProfile.emergency_phone, patientProfile.emergency_relationship].filter(Boolean).join(' · ')} />
                <RecordField label="Profile status" value={patientProfile.profile_complete ? 'Complete' : 'Incomplete'} />
              </div>
            </PortalPanel>

            <PortalPanel title="Appointment history" icon={<CalendarDays size={21} />}>
              {isScheduleLoading && (
                <div className="flex items-center gap-2 rounded-[10px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-4 text-sm font-bold text-[#53687b]">
                  <LoaderCircle size={17} className="animate-spin" />
                  Loading appointment rows
                </div>
              )}
              {!isScheduleLoading && scheduleError && (
                <div className="flex items-start gap-2 rounded-[10px] border border-[#f6c6c4] bg-[#fff4f3] p-3 text-[0.86rem] font-bold text-[#a22828]">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <span>{scheduleError}</span>
                </div>
              )}
              {!isScheduleLoading && !scheduleError && patientAppointments.length === 0 && (
                <div className="rounded-[10px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-4 text-center text-[0.86rem] font-bold text-[#53687b]">
                  No appointment rows matched this patient in the loaded scheduling window.
                </div>
              )}
              {patientAppointments.length > 0 && (
                <PortalTable
                  columns={['Date', 'Doctor', 'Status', 'Reason']}
                  rows={patientAppointments.map((appointment) => [
                    formatAppointmentDateTime(appointment.date, appointment.start_time),
                    appointment.doctor_name,
                    appointment.status_label || appointment.status,
                    appointmentReason(appointment),
                  ])}
                />
              )}
            </PortalPanel>

            <PortalPanel title={`Summary notes (${patientNotes.length})`} icon={<FileText size={21} />}>
              {patientNotes.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-4 text-center text-[0.86rem] font-bold text-[#53687b]">
                  No summary notes recorded for this patient.
                </div>
              ) : (
                <div className="grid gap-3">
                  {patientNotes.map((note) => (
                    <div key={note.sys_id} className="rounded-[10px] border border-[#e5eef3] bg-white p-3">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[0.72rem] font-bold text-[#607487]">
                        <span>
                          {note.date ? formatDate(note.date) : '—'}
                          {note.start_time ? ` · ${formatTime(note.start_time)}` : ''}
                          {note.doctor_name ? ` · ${note.doctor_name}` : ''}
                        </span>
                        <span className="rounded-full bg-[#e7f3f8] px-2 py-0.5 text-[#0f5f8c]">
                          {note.appointment_id || 'Note'}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-[0.9rem] leading-relaxed text-[#102033]">{note.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </PortalPanel>
          </section>

          <aside className="grid gap-4">
            <PortalPanel title="AI decision log" icon={<Bot size={21} />} tone="warning">
              <PortalTable
                columns={['Check', 'Result', 'Source']}
                rows={[
                  ['Patient lookup', 'Best matching profile loaded', '/api/patients/profile'],
                  ['Appointment match', `${patientAppointments.length} rows linked`, 'u_appointment'],
                  ['Schedule context', 'Clinic calendar reviewed', 'Appointment rows'],
                ]}
              />
              <button className="mt-4 inline-flex min-h-[42px] w-max cursor-pointer items-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-extrabold text-[#0f5f8c] max-[720px]:w-full">
                <Flag size={17} /> Flag for review
              </button>
            </PortalPanel>
          </aside>
        </div>
      )}
    </DoctorPage>
  )
}

function RecordField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-[5px] rounded-[10px] border border-[#e5eef3] bg-white p-3">
      <span className="text-[0.74rem] font-black uppercase tracking-[0.06em] text-[#607487]">{label}</span>
      <strong className="[overflow-wrap:anywhere] text-[#102033]">{value || 'Not provided'}</strong>
    </div>
  )
}
