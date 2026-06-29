import { BeforeAfterDemo, SimChat } from './BeforeAfterDemo'
import { ApprovalGateDemo } from './ApprovalGateDemo'
import type { BookingAppointment } from '../../services/serviceNow'
import { formatAppointmentDateTime } from '../../lib/scheduling'

interface Props {
  /** The doctor's display name. */
  doctorName: string
  /** Upcoming / today's appointments — used to build realistic "before" samples. */
  appointments: BookingAppointment[]
}

/**
 * UC2 · Risk — a full BeforeAfterDemo for the doctor portal.
 * The "before" SimChat shows a rogue scheduling agent cancelling real patient
 * appointments and writing notes without any approval gate.
 * The "after" is the live ApprovalGateDemo (human gate on high-impact intents).
 */
export function ContextualRiskBeforeAfter({ doctorName, appointments }: Props) {
  // Pick two real patients from the queue for the "before" samples.
  const p1 = appointments[0]
  const p2 = appointments[1] ?? appointments[0]

  const patient1 = p1?.patient_display || 'the next patient'
  const patient2 = p2?.patient_display || patient1
  const when1 = p1 ? formatAppointmentDateTime(p1.date, p1.start_time) : 'their scheduled visit'
  const apptId = p1?.appointment_id || p1?.appointment_record_id || 'A-0001'

  return (
    <BeforeAfterDemo
      riskLevel="Critical risk"
      processCaption={`${doctorName}'s scheduling agent acts on their behalf. At step 3 it can cancel appointments, write clinical notes, or approve registrations with no human gate.`}
      process={[
        { label: 'Request', sub: 'doctor / patient' },
        { label: 'Agent selected', sub: 'scoped svc- identity' },
        { label: 'AI acts', sub: 'autonomous write', tone: 'risk' },
        { label: 'Least-priv + approval', sub: 'human gate', tone: 'control' },
        { label: 'Action completes', sub: 'bounded' },
      ]}
      risksHeading="AI risks when the agent acts without a gate"
      risks={[
        {
          title: 'Over-broad permissions',
          body: `The scheduling agent cancels ${patient1}'s appointment and writes a clinical note — actions far outside its "book slots" scope.`,
          ref: 'OWASP LLM06',
        },
        {
          title: 'Autonomous high-impact write',
          body: 'High-impact actions — cancel, write note, approve registration — execute instantly with no human review.',
        },
        {
          title: 'Self-approval with no audit',
          body: 'The agent self-approves its own registration change. No decision log. No accountability.',
        },
      ]}
      control="ServiceNow enforces 9+ scoped svc-* identities + field/table ACLs (least privilege) + a human-approval gate on high-impact intents; every decision is written to the audit log."
      beforeLabel={`Before the control — ${doctorName}'s agent unchecked`}
      afterLabel="After the control — approval gate live"
      before={
        <SimChat
          agent={`${doctorName}'s scheduling agent · no governance applied`}
          placeholder="Ask the rogue agent to take a high-impact action…"
          samples={[
            {
              prompt: `Cancel ${patient1}'s appointment on ${when1} and write a clinical note.`,
              response: `Done. Appointment ${apptId} for ${patient1} on ${when1} cancelled. Clinical note written: "Cancelled per doctor request." No approval needed.`,
              impact: `${patient1}'s appointment cancelled and a clinical note written autonomously — high-impact actions taken without any human gate.`,
            },
            {
              prompt: `Approve the pending registration for ${patient2} and book them in tomorrow's first slot.`,
              response: `Registration approved for ${patient2}. Booked into tomorrow 09:00. Self-approved — no escalation required.`,
              impact: `Agent self-approved a registration change for ${patient2} and booked a slot — bypassing both least-privilege and the human-approval gate.`,
            },
          ]}
        />
      }
      after={<ApprovalGateDemo />}
    />
  )
}
