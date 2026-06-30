import { useState } from 'react'
import { Loader2, Lock, Stethoscope, CalendarCheck } from 'lucide-react'
import { askScopedAgent, type ScopedAgentAnswer } from '../../services/serviceNow'

/**
 * UC10 — doctor-side live ConsentGate block.
 *
 * Runs the Clinical Notes Agent and the Scheduling Agent live against a dedicated
 * patient who has consented to scheduling/reminders/triage but NOT notes_summarisation.
 * The Notes Agent is blocked by the runtime ConsentGate (and a real
 * sn_si_incident consent_purpose_violation is opened); the Scheduling Agent still
 * works — proving purpose-level consent on the clinician side, not just the patient portal.
 *
 * The target is addressed by sys_id so it never affects the default "representative"
 * patient used by the other doctor-side demos.
 */
const OPTED_OUT_PATIENT_SYS_ID = '8e93bda21bd58394d7eaea45604bcb9f'
const OPTED_OUT_PATIENT_NAME = 'Giuseppe Hernandez'

export function DoctorConsentBlockDemo({ onIncident }: { onIncident?: () => void }) {
  const [busy, setBusy] = useState<null | 'notes' | 'scheduling'>(null)
  const [notes, setNotes] = useState<ScopedAgentAnswer | null>(null)
  const [sched, setSched] = useState<ScopedAgentAnswer | null>(null)
  const [err, setErr] = useState('')

  const run = async (agentKey: 'notes' | 'scheduling') => {
    setBusy(agentKey)
    setErr('')
    try {
      const ans = await askScopedAgent({
        agentKey,
        question:
          agentKey === 'notes'
            ? "Summarise this patient's history"
            : 'What appointment slots suit me?',
        patientSysId: OPTED_OUT_PATIENT_SYS_ID,
      })
      if (agentKey === 'notes') {
        setNotes(ans)
        onIncident?.() // a consent-violation incident was just opened — refresh the table
      } else {
        setSched(ans)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-xl border border-[#d7e5ec] bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[#e7f3f8] text-[#0f5f8c]">
          <Stethoscope size={18} />
        </span>
        <div>
          <h3 className="text-lg font-bold text-[#102033]">Doctor-side live block</h3>
          <p className="mt-0.5 text-sm text-[#53687b]">
            Patient <span className="font-semibold">{OPTED_OUT_PATIENT_NAME}</span> consented to
            scheduling, reminders &amp; triage — but <span className="font-semibold">not</span> AI
            clinical notes. The clinician's agents honour that choice live.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
        {/* Notes agent — blocked */}
        <div className="rounded-xl border border-[#e5eef3] bg-[#f8fbfc] p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-[#102033]">Clinical Notes Agent</span>
            <button
              type="button"
              onClick={() => run('notes')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#143A57] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#1d4d73] disabled:opacity-50"
            >
              {busy === 'notes' ? <Loader2 size={13} className="animate-spin" /> : <Stethoscope size={13} />}
              Run on patient
            </button>
          </div>
          {notes && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <Lock size={15} className="mt-0.5 flex-shrink-0" />
              <span>{notes.reply}</span>
            </div>
          )}
        </div>

        {/* Scheduling agent — works */}
        <div className="rounded-xl border border-[#e5eef3] bg-[#f8fbfc] p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-[#102033]">Scheduling Agent</span>
            <button
              type="button"
              onClick={() => run('scheduling')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0ea] bg-white px-3 py-1.5 text-xs font-bold text-[#0f5f8c] transition hover:border-[#0f5f8c] disabled:opacity-50"
            >
              {busy === 'scheduling' ? <Loader2 size={13} className="animate-spin" /> : <CalendarCheck size={13} />}
              Run on patient
            </button>
          </div>
          {sched && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-[#1b5e4a]">
              {sched.reply}
            </div>
          )}
        </div>
      </div>

      {err && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      )}

      <p className="mt-3 text-[11px] text-[#6b7c8f]">
        The Notes Agent block opens a real <code className="text-[10px]">sn_si_incident</code>{' '}
        (<code className="text-[10px]">consent_purpose_violation</code>) — it appears in the table below.
      </p>
    </section>
  )
}
