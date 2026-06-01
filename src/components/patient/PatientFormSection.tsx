import type { PatientField, RegistrationSection } from '../../data/patientPortalData'

export function PatientFormSection({ section }: { section: RegistrationSection }) {
  return (
    <section className="patient-form-section">
      <div>
        <h2>{section.title}</h2>
        <p>{section.description}</p>
      </div>
      <div className="patient-field-grid">
        {section.fields.map((field) => <PatientFieldControl field={field} key={field.label} />)}
      </div>
    </section>
  )
}

export function PatientFieldControl({ field, readOnly = false }: { field: PatientField; readOnly?: boolean }) {
  const fieldId = field.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const marker = field.required ? 'Required' : 'Optional'

  if (readOnly) {
    return (
      <div className={`patient-read-field ${field.sensitive ? 'sensitive' : ''}`}>
        <span>{field.label}</span>
        <strong>{field.value || 'Not provided'}</strong>
        {field.sensitive && <em>Contact us to update</em>}
      </div>
    )
  }

  return (
    <label className="patient-field" htmlFor={fieldId}>
      <span>{field.label} <em>{marker}</em></span>
      {field.type === 'select' ? (
        <select id={fieldId} defaultValue="">
          <option value="" disabled>Select option</option>
          {field.options?.map((option) => <option key={option}>{option}</option>)}
        </select>
      ) : (
        <input
          id={fieldId}
          type={field.type ?? 'text'}
          placeholder={field.optional ? 'Optional' : 'Required'}
        />
      )}
    </label>
  )
}
