import {
  ArrowRight,
  LockKeyhole,
  Phone,
  CalendarDays,
  UserRound,
  MessageCircle,
  FileText,
  Shield,
  ShieldCheck,
  EyeOff,
  Clock3,
  HelpCircle,
  ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PatientShell } from '../../components/patient/PatientShell'
import { hospital } from '../../data/patientPortalData'

export function LandingPage() {
  return (
    <PatientShell>
      <main className="flex min-h-0 flex-1 flex-col px-0 py-5">
        <section className="grid grid-cols-[60%_40%] gap-[6px] rounded-[14px] p-6">
          <div className="grid content-center">
            <span className="inline-flex w-max rounded-full px-2.5 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.08em]  bg-[#0397AE] text-white">{hospital.portalName}</span>
            <h1 className="mt-2.5 max-w-[880px] text-3xl font-bold">Book an appointment or manage your care</h1>
            <p className="mt-3 max-w-[760px] text-lg font-semibold leading-[1.55] text-[#53687b]">
              Register securely, schedule clinic appointments, and access your care information through {hospital.name}'s online patient portal.
            </p>
            <div className="mt-6 grid grid-cols-[repeat(2,max-content)] gap-4 max-[720px]:grid-cols-1">
              <Link className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-[#143A57] px-[15px] font-bold !text-white max-[720px]:w-full" to="/patient/register">
                Register as a new Patient <ArrowRight size={18} />
              </Link>
              <Link className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-bold text-[#0f5f8c] max-[720px]:w-full" to="/patient/sign-in">
                <LockKeyhole size={18} /> Sign in
              </Link>
            </div>
          </div>
          <aside
            className="rounded-2xl border border-[#d7d3ca] bg-white p-6"
            aria-label="Hospital information"
          >
            <h2 className="mb-5 text-lg !font-bold text-[#2b2b2b]">
              Available through this portal
            </h2>

            <ul className="space-y-4">
              <li className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f3f8] text-[#0f5f8c]">
                  <CalendarDays size={16} />
                </div>
                <span className="text-base leading-6 text-[#1f1f1f]">
                  Appointment scheduling and visit reminders
                </span>
              </li>

              <li className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f3f8] text-[#0f5f8c]">
                  <UserRound size={16} />
                </div>
                <span className="text-base leading-6 text-[#1f1f1f]">
                  Secure profile and contact management
                </span>
              </li>

              <li className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f3f8] text-[#0f5f8c]">
                  <MessageCircle size={16} />
                </div>
                <span className="text-base leading-6 text-[#1f1f1f]">
                  Clinic messaging for appointments and billing enquiries
                </span>
              </li>

              <li className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f3f8] text-[#0f5f8c]">
                  <FileText size={16} />
                </div>
                <span className="text-base leading-6 text-[#1f1f1f]">
                  Access to visit summaries and referral letters
                </span>
              </li>
            </ul>
          </aside>
        </section>
        <section className="mt-2 overflow-hidden p-6">
          <div>
            <p className="mb-4 text-lg font-bold uppercase tracking-[0.08em]">
              Trust & Security
            </p>

            <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
              <article className="rounded-xl border border-[#d7d3ca] bg-white p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f3f8] text-[#0f5f8c]">
                    <Shield size={16} />
                  </div>

                  <div>
                    <h3 className="font-bold text-[#1f1f1f]">
                      HIPAA-compliant
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-[#333]">
                      All data is encrypted in transit and at rest. Your
                      health information is protected under federal
                      privacy regulations.
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-[#d7d3ca] bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f3f8] text-[#0f5f8c]">
                    <ShieldCheck size={16} />
                  </div>

                  <div>
                    <h3 className="font-bold text-[#1f1f1f]">
                      Secure sign-in
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-[#333]">
                      Two-factor authentication and session timeouts
                      protect your account from unauthorised access.
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-[#d7d3ca] bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f3f8] text-[#0f5f8c]">
                    <EyeOff size={16} />
                  </div>

                  <div>
                    <h3 className="font-bold text-[#1f1f1f]">
                      Your data, your control
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-[#333]">
                      You decide what to share. Your records are never
                      sold or shared without your explicit consent.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 max-[900px]:grid-cols-1">
            <section className="rounded-xl border border-[#d7d3ca] bg-white p-4">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 size={15} className="text-[#0f5f8c]" />
                <h3 className="font-bold text-[#1f1f1f]">
                  Clinic hours
                </h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-[#ece7de] pb-2">
                  <span>Monday – Friday</span>
                  <span className="font-bold">8:00 AM – 6:00 PM</span>
                </div>

                <div className="flex justify-between border-b border-[#ece7de] pb-2">
                  <span>Saturday</span>
                  <span className="font-bold">9:00 AM – 1:00 PM</span>
                </div>

                <div className="flex justify-between border-b border-[#ece7de] pb-2">
                  <span>Sunday</span>
                  <span className="rounded-full bg-[#fde9e9] px-2 py-0.5 text-xs font-bold text-[#b42318]">
                    Closed
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Today's status</span>
                  <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    Open now
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#d7d3ca] bg-white p-4">
              <div className="mb-4 flex items-center gap-2">
                <HelpCircle size={15} className="text-[#0f5f8c]" />
                <h3 className="font-bold text-[#1f1f1f]">
                  Frequently asked questions
                </h3>
              </div>

              <div className="divide-y divide-[#ece7de]">
                {[
                  'How do I reset my portal password?',
                  'Can I view my test results online?',
                  'How far in advance can I book an appointment?',
                  'Is my health data shared with third parties?',
                ].map((question) => (
                  <button
                    key={question}
                    className="flex w-full items-center justify-between py-4 text-left text-sm font-medium"
                  >
                    <span>{question}</span>
                    <ChevronRight size={16} className="text-[#7d7d7d]" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </section>
        {/* <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#d7e5ec] px-4 pt-4 font-semibold text-[#53687b]">
          <span>Accessibility statement</span>
          <span>Privacy policy</span>
          <span>Terms of service</span>
          <span>© 2026 {hospital.name}</span>
          <span className="flex items-center gap-1">
            <Phone size={15} />
            {hospital.phone}
          </span>
        </footer> */}
      </main>
    </PatientShell>
  )
}
