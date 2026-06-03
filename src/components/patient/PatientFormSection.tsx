import type { PatientField, RegistrationSection } from '../../data/patientPortalData'
import { Asterisk } from 'lucide-react'
import { cn } from '../../lib/cn'

export function PatientFormSection({ section }: { section: RegistrationSection }) {
  return (
    <section className="grid gap-4 border-b border-[#e5eef3] pb-[22px] last:border-b-0 last:pb-0">
      <div>
        <h2 className="m-0 text-lg font-semibold">{section.title}</h2>
        <p className="mt-1.5 mb-0 leading-normal text-[#607487]">{section.description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3.5 max-[720px]:grid-cols-1">
        {section.fields.map((field) => <PatientFieldControl field={field} key={field.label} />)}
      </div>
    </section>
  )
}

export function PatientFieldControl({ field, readOnly = false }: { field: PatientField; readOnly?: boolean }) {
  const fieldId = field.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const marker = field.required ? <Asterisk size={16} className="text-red-500" /> :  ''

  if (readOnly) {
    return (
      <div className={cn('grid gap-[5px] rounded-[10px] border border-[#e5eef3] bg-white p-3', field.sensitive && 'bg-[#fffaf0]')}>
        <span className="text-[0.74rem] font-black uppercase tracking-[0.06em] text-[#607487]">{field.label}</span>
        <strong className="[overflow-wrap:anywhere] text-[#102033]">{field.value || 'Not provided'}</strong>
        {field.sensitive && <em className="text-[0.75rem] font-extrabold not-italic text-[#9a5a00]">Contact us to update</em>}
      </div>
    )
  }

  return (
    <label className="grid gap-[7px] text-[0.84rem] font-bold" htmlFor={fieldId}>
      <span className="flex items-center gap-1 text-sm font-bold">{field.label} <em className="text-sm font-semibold">{marker}</em></span>
      {field.type === 'select' ? (
        <select id={fieldId} className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" defaultValue="">
          <option value="" disabled>Select option</option>
          {field.options?.map((option) => <option key={option}>{option}</option>)}
        </select>
      ) : (
        <input
          id={fieldId}
          className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit"
          type={field.type ?? 'text'}
          placeholder={field.label}
        />
      )}
    </label>
  )
}
