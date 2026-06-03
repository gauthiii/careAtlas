import { Edit3, Lock, ShieldAlert } from 'lucide-react'
import { PatientFieldControl } from '../../components/patient/PatientFormSection'
import { PatientPanel } from '../../components/patient/PatientPanel'
import { PatientPage } from '../../components/patient/PatientShell'
import { profileControls, registrationSections } from '../../data/patientPortalData'
import { cn } from '../../lib/cn'

export function ProfilePage() {
  return (
    <PatientPage
      title="Review your patient information"
      intro="Non-sensitive contact details can be edited. Sensitive scheduling fields require clinic support"
    >
      <div className="grid gap-4 grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] max-[1100px]:grid-cols-1">
        <section className="grid gap-4">
          {registrationSections.map((section) => (
            <div className="grid gap-4 rounded-[14px] border border-[#d7e5ec] bg-white p-[18px] shadow-[0_12px_30px_rgba(25,64,93,0.07)] max-[720px]:rounded-xl" key={section.title}>
              <div className="flex items-center justify-between gap-3.5">
                <h2 className="m-0 text-[1.08rem] tracking-normal text-[#102033]">{section.title}</h2>
                <button className="flex items-center gap-[7px] rounded-[9px] border border-[#cbdde6] bg-white px-2.5 py-2 font-extrabold text-[#0f5f8c]"><Edit3 size={16} /> Edit non-sensitive fields</button>
              </div>
              <div className="grid grid-cols-2 gap-3.5 max-[720px]:grid-cols-1">
                {section.fields.map((field) => <PatientFieldControl field={field} readOnly key={field.label} />)}
              </div>
            </div>
          ))}
        </section>
        <aside className="grid gap-4">
          <PatientPanel title="Sensitive fields" icon={<ShieldAlert size={21} />} tone="warning">
            <p className="mt-1.5 mb-0 leading-normal text-[#607487]">Date of birth, ethnicity, and health condition category are shown but cannot be self-edited.</p>
          </PatientPanel>
          <PatientPanel title="Account controls" icon={<Lock size={21} />} tone="secure">
            <div className="grid gap-2.5">
              {profileControls.map((control) => (
                <button
                  className={cn(
                    'grid min-h-11 justify-items-start gap-0 rounded-[10px] border border-[#d7e5ec] bg-white px-3 py-2.5 text-left font-extrabold text-[#102033]',
                    control.danger && 'border-[#f1c7c7] bg-[#fff5f4] text-[#a22828]',
                  )}
                  key={control.label}
                >
                  <strong>{control.label}</strong>
                  <span className="text-[0.82rem] text-[#607487]">{control.detail}</span>
                </button>
              ))}
            </div>
          </PatientPanel>
        </aside>
      </div>
    </PatientPage>
  )
}
