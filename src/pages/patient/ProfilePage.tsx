import {
  Edit3,
  ShieldAlert,
  Lock,
  Camera,
} from 'lucide-react'

import { PatientPage } from '../../components/patient/PatientShell'
import { patient } from '../../data/patientPortalData'

const Toggle = ({ enabled = true }: { enabled?: boolean }) => (
  <button
    className={`relative h-5 w-9 rounded-full transition ${enabled ? 'bg-[#143f6b]' : 'bg-slate-300'
      }`}
  >
    <span
      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${enabled ? 'right-0.5' : 'left-0.5'
        }`}
    />
  </button>
)

const InfoField = ({
  label,
  value,
}: {
  label: string
  value: string
}) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold uppercase tracking-wide text-[#6c7b8a]">
      {label}
    </p>
    <p className="text-sm text-[#102033]">{value}</p>
  </div>
)

export function ProfilePage() {
  return (
    <PatientPage
      title="Patient profile"
      intro="Non-sensitive contact details can be edited directly. Sensitive scheduling fields require clinic support."
    >
      <div className="grid grid-cols-[1fr_400px] gap-10 max-[1100px]:grid-cols-1 border border-[#d7e5ec] rounded-xl p-6">
        {/* LEFT CONTENT */}
        <div className="space-y-10">
          {/* HEADER */}
          <div>
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e6eef5] font-semibold text-[#17436b]">
                  MP
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-[#102033]">
                    Maya Patel
                  </h2>

                  <p className="text-sm text-[#607487]">
                    Patient ID: NGH-4820-19
                  </p>

                  <div className="mt-2 flex gap-2">
                    <span className="rounded-full bg-[#eaf8ef] px-3 py-1 text-xs text-[#1e7c42]">
                      Profile complete
                    </span>

                    <span className="rounded-full bg-[#e9f5ff] px-3 py-1 text-xs text-[#0f5f8c]">
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              <button className="flex items-center gap-2 text-sm font-medium text-[#0f5f8c]">
                <Camera size={16} />
                Upload photo
              </button>
            </div>

            {/* STATS */}
            <div className="mt-8 flex gap-12">
              <div>
                <p className="text-xs text-[#607487]">Total visits</p>
                <p className="text-lg font-semibold">12</p>
              </div>

              <div>
                <p className="text-xs text-[#607487]">Active since</p>
                <p className="text-lg font-semibold">Jan 2024</p>
              </div>

              <div>
                <p className="text-xs text-[#607487]">Next appointment</p>
                <p className="text-lg font-semibold">June 4</p>
              </div>
            </div>
          </div>

          {/* PERSONAL INFORMATION */}
          <section className="border-t border-[#d7e5ec] pt-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#102033]">
                Personal information
              </h3>

              <button className="flex items-center gap-2 text-[#0f5f8c]">
                <Edit3 size={15} />
                Edit
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-8 max-[700px]:grid-cols-1">
              <InfoField label="First Name" value="Maya" />
              <InfoField label="Last Name" value="Patel" />

              <InfoField label="Date of Birth" value="1986-04-18" />
              <InfoField label="Gender" value="Female" />

              <InfoField label="Ethnicity" value="Asian" />
              <InfoField label="Primary Language" value="English" />

              <InfoField label="Phone Number" value="(602) 555-0148" />
              <InfoField
                label="Email Address"
                value="maya.patel@example.com"
              />
            </div>

            <div className="mt-10 grid grid-cols-2 gap-y-8 max-[700px]:grid-cols-1">
              <InfoField
                label="Street Address Line 1"
                value="214 Copper Ridge Ave"
              />

              <InfoField
                label="Street Address Line 2"
                value="Apt 4B"
              />

              <InfoField label="City" value="Phoenix" />
              <InfoField label="Postal Code / ZIP" value="85004" />

              <InfoField
                label="State / Region"
                value="Arizona, United States"
              />
            </div>
          </section>

          {/* HEALTH INFORMATION */}
          <section className="border-t border-[#d7e5ec] pt-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-[#102033]">
                  Health information
                </h3>

                <span className="rounded-full bg-[#eef6ff] px-2 py-1 text-[11px] text-[#0f5f8c]">
                  Clinic-managed
                </span>
              </div>

              <button className="text-[#0f5f8c]">
                Edit non-sensitive
              </button>
            </div>

            <div className="mb-8 flex items-center gap-2 rounded-md bg-[#eaf3fb] px-4 py-3 text-sm text-[#607487]">
              <ShieldAlert size={16} />
              Date of birth, ethnicity, and health condition category are shown
              but cannot be self-edited.
            </div>

            <div className="grid grid-cols-2 gap-y-8 max-[700px]:grid-cols-1">
              <InfoField
                label="Primary Health Condition"
                value="Chronic condition"
              />

              <InfoField
                label="Mobility / Accessibility Needs"
                value="No requirements"
              />

              <InfoField
                label="Insurance / Coverage ID"
                value="NGH-4820-19"
              />

              <InfoField
                label="Insurance Provider"
                value="Blue Cross Blue Shield"
              />

              <InfoField
                label="Emergency Contact Name"
                value="Ravi Patel"
              />

              <InfoField
                label="Relationship"
                value="Spouse"
              />

              <InfoField
                label="Emergency Contact Phone"
                value="(602) 555-0191"
              />

              <InfoField label="Blood Type" value="O+" />

              <InfoField
                label="Known Allergies"
                value="Penicillin · Sulfa drugs"
              />
            </div>
          </section>

        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-8">
          <section>
            <h3 className="mb-4 font-semibold">Account controls</h3>

            <div className="space-y-4 text-sm">
              <div>
                <p>Change password</p>
                <p className="text-[#607487]">
                  Update your credentials
                </p>
              </div>

              <div className="flex justify-between">
                <div>
                  <p>Email reminders</p>
                  <p className="text-[#607487]">
                    Appointment reminders enabled
                  </p>
                </div>
                <Toggle />
              </div>

              <div className="flex justify-between">
                <div>
                  <p>SMS reminders</p>
                  <p className="text-[#607487]">
                    Text reminders enabled
                  </p>
                </div>
                <Toggle />
              </div>

              <div className="flex justify-between">
                <div>
                  <p>Clinic notifications</p>
                  <p className="text-[#607487]">
                    Push alerts enabled
                  </p>
                </div>
                <Toggle />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-4 font-semibold">
              Privacy & data sharing
            </h3>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <div>
                  <p>Share records with GP</p>
                  <p className="text-[#607487]">
                    Enabled
                  </p>
                </div>
                <Toggle />
              </div>

              <div className="flex justify-between">
                <div>
                  <p>Clinician record access</p>
                  <p className="text-[#607487]">
                    Full access enabled
                  </p>
                </div>
                <Toggle />
              </div>

              <button className="text-[#0f5f8c]">
                View full privacy policy
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-4 font-semibold">
              Recent account activity
            </h3>

            <div className="space-y-4 text-sm">
              <div>
                <p>Signed in from Chrome</p>
                <p className="text-[#607487]">
                  Today • 9:04 AM
                </p>
              </div>

              <div>
                <p>Appointment booked</p>
                <p className="text-[#607487]">
                  Jun 2 • 2:18 PM
                </p>
              </div>

              <div>
                <p>Address updated</p>
                <p className="text-[#607487]">
                  May 3 • 4:55 PM
                </p>
              </div>

              <div>
                <p>Lab results downloaded</p>
                <p className="text-[#607487]">
                  May 1 • 1:00 PM
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-4 font-semibold">
              Accessibility preferences
            </h3>

            <div className="space-y-4 text-sm">
              <div>
                <p>Large text mode</p>
                <p className="text-[#607487]">Off</p>
              </div>

              <div>
                <p>Hearing loop required</p>
                <p className="text-[#607487]">Not set</p>
              </div>

              <div>
                <p>Interpreter required</p>
                <p className="text-[#607487]">Not required</p>
              </div>
            </div>
          </section>
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#102033]">
                Account credentials
              </h3>

              <button className="flex items-center gap-2 text-[#0f5f8c]">
                <Edit3 size={15} />
                Edit
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-8">
              <InfoField label="Username" value="maya.patel" />
              <InfoField label="Password" value="••••••••••" />
            </div>

            <div className="mt-8 flex items-center justify-between rounded-lg border border-[#d7e5ec] p-4">
              <div>
                <p className="font-medium">Two-factor authentication</p>
                <p className="text-sm text-[#607487]">Not enabled</p>
              </div>

              <button className="rounded-md bg-[#143f6b] px-4 py-2 text-sm font-medium text-white">
                Enable 2FA
              </button>
            </div>
          </section>
        </aside>
      </div>
    </PatientPage>
  )
}