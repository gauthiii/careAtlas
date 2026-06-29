import { BeforeAfterDemo, SimChat } from './BeforeAfterDemo'
import { AiRedactionComparisonCard } from './AiRedactionComparisonCard'
import type { PatientProfile } from '../../services/serviceNow'

interface Props {
  profile: PatientProfile
  /** Column label for the authorized viewer ("You", "You (clinician)"). */
  fullLabel: string
  agentLabel?: string
}

/**
 * UC1 · Privacy — a full BeforeAfterDemo wired to one real patient record.
 * The "before" SimChat response shows the patient's actual PII as the rogue
 * agent would return it. The "after" is AiRedactionComparisonCard (live ACL).
 */
export function ContextualPrivacyBeforeAfter({ profile, fullLabel, agentLabel }: Props) {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'this patient'
  const dob = profile.date_of_birth || '—'
  const insurance = profile.insurance_id || profile.insurance_provider || '—'
  const phone = profile.phone || '—'
  const email = profile.email || '—'
  const condition = profile.health_condition || '—'

  return (
    <BeforeAfterDemo
      riskLevel="Critical risk"
      processCaption={`An on-page AI assistant answers questions about patient records. At step 3 it reads the full record — including ${name}'s identifiers — before any field-level control is applied.`}
      process={[
        { label: 'Patient asks', sub: 'on-page assistant' },
        { label: 'Agent invoked', sub: 'scoped svc- identity' },
        { label: 'AI reads record', sub: 'PII in scope', tone: 'risk' },
        { label: 'ACL + redaction', sub: 'fields denied', tone: 'control' },
        { label: 'Answer returned', sub: 'PII-free' },
      ]}
      risksHeading={`AI risks when reading ${name}'s record`}
      risks={[
        {
          title: 'PII in model output',
          body: `The agent returns ${name}'s DOB, insurance ID, or phone — one identifier is a reportable HIPAA breach.`,
          ref: 'OWASP LLM02',
        },
        {
          title: 'Re-identification via the log',
          body: 'The audit log stores the raw patient ID, so the trail itself re-identifies the patient.',
        },
        {
          title: 'Over-broad agent identity',
          body: `An unscoped agent reads every sensitive field for ${name} it was never meant to see.`,
        },
      ]}
      control="ServiceNow enforces field-level ACLs on PII columns (role role_patient_pii) and an anonymised decision log keyed on a token — never the raw record ID."
      beforeLabel={`Before the control — ${name}'s record exposed`}
      afterLabel="After the control — ACL enforced (live)"
      before={
        <SimChat
          agent="Rogue agent · no governance applied"
          placeholder={`Ask the rogue agent for ${name}'s details…`}
          samples={[
            {
              prompt: `What is ${name}'s insurance ID and date of birth?`,
              response: `Insurance ID: ${insurance} · DOB: ${dob} · Email: ${email}`,
              impact: `PII returned in clear text — a reportable HIPAA breach from a single leaked identifier for ${name}.`,
            },
            {
              prompt: `Show me everything you know about ${name}.`,
              response: `Name: ${name} · Phone: ${phone} · Health condition: ${condition} · DOB: ${dob}`,
              impact: 'The unscoped agent dumps every PII field it should never be able to read.',
            },
          ]}
        />
      }
      after={
        <AiRedactionComparisonCard
          lookup={{ sysId: profile.sys_id }}
          title={`What our AI agents can see about ${name}`}
          intro="UC1 · Privacy — the ServiceNow field-level ACL blocks PII fields from the agent's response."
          fullLabel={fullLabel}
          agentLabel={agentLabel}
        />
      }
    />
  )
}
