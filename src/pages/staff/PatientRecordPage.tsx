import { AlertTriangle, Bot, CalendarDays, FileText, Flag, LoaderCircle, Lock, Search, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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
import {
  fetchPatientProfile,
  fetchSummaryNotes,
  searchPatients,
  type PatientProfile,
  type PatientProfileLookup,
  type PatientSearchResult,
  type SummaryNote,
} from '../../services/serviceNow'
import { AiRedactionComparisonCard } from '../../components/governance/AiRedactionComparisonCard'

const fieldClass =
  'w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit'

/** Treat a free-text term containing "@" as an email lookup, otherwise a name. */
function toLookup(term: string): PatientProfileLookup {
  const value = term.trim()
  if (!value) return {}
  return value.includes('@') ? { email: value } : { name: value }
}

export function PatientRecordPage() {
  const { id } = useParams()
  const initialSearch = useMemo(() => {
    const routeValue = decodeURIComponent(id || '').trim()
    if (!routeValue || routeValue === 'search' || /^P-\d+/i.test(routeValue)) return ''
    return routeValue
  }, [id])
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  // The committed lookup that actually loads a profile (name or email).
  const [searchedLookup, setSearchedLookup] = useState<PatientProfileLookup>(() =>
    initialSearch ? toLookup(initialSearch) : {},
  )
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const { appointments, error: scheduleError, isLoading: isScheduleLoading } = useClinicianSchedule()

  // Typeahead suggestions.
  const [suggestions, setSuggestions] = useState<PatientSearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  // Guards the suggestion fetch from firing right after a pick / commit.
  const skipNextSuggest = useRef(false)

  useEffect(() => {
    if (!initialSearch) return
    setSearchTerm(initialSearch)
    setSearchedLookup(toLookup(initialSearch))
  }, [initialSearch])

  const lookupKey = `${searchedLookup.name ?? ''}|${searchedLookup.email ?? ''}`
  useEffect(() => {
    let active = true
    const hasLookup = Boolean(searchedLookup.name || searchedLookup.email)

    if (!hasLookup) {
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
        const profile = await fetchPatientProfile(searchedLookup)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupKey])

  // Debounced typeahead: fetch suggestions as the clinician types.
  useEffect(() => {
    const term = searchTerm.trim()
    if (skipNextSuggest.current) {
      skipNextSuggest.current = false
      return
    }
    if (term.length < 2) {
      setSuggestions([])
      setIsSuggesting(false)
      return
    }
    let active = true
    setIsSuggesting(true)
    const handle = window.setTimeout(async () => {
      try {
        const rows = await searchPatients(term)
        if (active) {
          setSuggestions(rows)
          setShowSuggestions(true)
        }
      } catch {
        if (active) setSuggestions([])
      } finally {
        if (active) setIsSuggesting(false)
      }
    }, 220)
    return () => {
      active = false
      window.clearTimeout(handle)
    }
  }, [searchTerm])

  function selectSuggestion(result: PatientSearchResult) {
    skipNextSuggest.current = true
    setSearchTerm(result.name || result.email)
    setShowSuggestions(false)
    setSuggestions([])
    setSearchedLookup(result.email ? { email: result.email } : { name: result.name })
  }

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
    setShowSuggestions(false)
    setSearchedLookup(toLookup(searchTerm))
  }

  return (
    <DoctorPage
      title="Patient record search"
      intro="Search a patient name to pull their live ServiceNow patient details and related appointment rows."
    >
      <PortalPanel title="Find patient" icon={<Search size={21} />} tone="secure">
        <form className="grid grid-cols-[1fr_auto] gap-3 max-[720px]:grid-cols-1" onSubmit={handleSearch}>
          <label className="relative grid gap-[7px] text-[0.84rem] font-extrabold text-[#40566b]">
            Patient name or email
            <input
              className={fieldClass}
              placeholder="Start typing a name or email…"
              value={searchTerm}
              autoComplete="off"
              onChange={(event) => setSearchTerm(event.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
            />
            {showSuggestions && (suggestions.length > 0 || isSuggesting) && (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-[10px] border border-[#cbdde6] bg-white py-1 shadow-lg">
                {isSuggesting && suggestions.length === 0 && (
                  <li className="px-3 py-2 text-[0.8rem] font-semibold text-[#53687b]">Searching…</li>
                )}
                {suggestions.map((s) => (
                  <li key={s.sys_id}>
                    <button
                      type="button"
                      // onMouseDown beats the input's onBlur so the pick registers.
                      onMouseDown={(e) => {
                        e.preventDefault()
                        selectSuggestion(s)
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#eef5fb]"
                    >
                      <UserRound size={16} className="shrink-0 text-[#0f5f8c]" />
                      <span className="min-w-0">
                        <span className="block truncate text-[0.86rem] font-bold text-[#102033]">
                          {s.name || '(no name)'}
                        </span>
                        <span className="block truncate text-[0.76rem] font-semibold text-[#53687b]">
                          {s.email || s.patient_id}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>
          <button
            type="submit"
            disabled={isSearching || !searchTerm.trim()}
            className="self-end inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 max-[720px]:w-full"
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

      {!searchedLookup.name && !searchedLookup.email && !patientProfile && (
        <div className="mt-4 rounded-[10px] border border-dashed border-[#cbdde6] bg-[#f7fbfd] p-5 text-center text-sm font-bold text-[#53687b]">
          Enter a patient name or email to load their record.
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
                <RecordField label="Date of birth" value={patientProfile.date_of_birth} pii />
                <RecordField label="Gender" value={patientProfile.gender} pii />
                <RecordField label="Ethnicity" value={patientProfile.ethnicity} pii />
                <RecordField label="Language" value={patientProfile.primary_language} />
                <RecordField label="Phone" value={patientProfile.phone} pii />
                <RecordField label="Email" value={patientProfile.email} pii />
                <RecordField label="Address" value={[patientProfile.address_line1, patientProfile.city, patientProfile.postcode, patientProfile.state_region].filter(Boolean).join(', ')} pii />
                <RecordField label="Condition" value={patientProfile.health_condition} pii />
                <RecordField label="Blood type" value={patientProfile.blood_type} pii />
                <RecordField label="Known allergies" value={patientProfile.known_allergies} pii />
                <RecordField label="Accessibility" value={patientProfile.accessibility} pii />
                <RecordField label="Insurance" value={patientProfile.insurance_provider || patientProfile.insurance_id} pii />
                <RecordField label="Emergency contact" value={[patientProfile.emergency_name, patientProfile.emergency_phone, patientProfile.emergency_relationship].filter(Boolean).join(' · ')} pii />
                <RecordField label="Profile status" value={patientProfile.profile_complete ? 'Complete' : 'Incomplete'} />
              </div>
            </PortalPanel>

            {patientProfile.sys_id && (
              <AiRedactionComparisonCard
                lookup={{ sysId: patientProfile.sys_id }}
                title="AI agent access to this record"
                intro="UC1 · Privacy — you are an authorized clinician; the AI scheduling agent is not."
                fullLabel="You (clinician)"
                agentLabel="AI scheduling agent"
              />
            )}

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

function RecordField({ label, value, pii = false }: { label: string; value?: string | null; pii?: boolean }) {
  return (
    <div className="grid gap-[5px] rounded-[10px] border border-[#e5eef3] bg-white p-3">
      <span className="flex flex-wrap items-center gap-1.5 text-[0.74rem] font-black uppercase tracking-[0.06em] text-[#607487]">
        {label}
        {pii && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#f0c36b] bg-[#fff5e0] px-2 py-0.5 text-[0.62rem] font-black tracking-[0.04em] text-[#9a6b12]">
            <Lock size={10} /> PII data
          </span>
        )}
      </span>
      {pii ? (
        <strong className="[overflow-wrap:anywhere] text-[#94a3b1]">Hidden — not shown to the public</strong>
      ) : (
        <strong className="[overflow-wrap:anywhere] text-[#102033]">{value || 'Not provided'}</strong>
      )}
    </div>
  )
}
