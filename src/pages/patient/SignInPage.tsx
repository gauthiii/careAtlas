import { Fingerprint, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PatientPage } from '../../components/patient/PatientShell'

export function SignInPage() {
  return (
    <PatientPage
      title="Access your patient dashboard"
      intro="Use your patient portal credentials. A one-time MFA code is sent after username and password validation."
    >
      <div className="flex items-center justify-center">
      <section className="grid w-[540px] gap-4 rounded-[14px] border border-[#d7e5ec] bg-white p-[22px] shadow-[0_12px_30px_rgba(25,64,93,0.07)]">
        <label className="grid gap-[7px] text-md font-bold">
          <span className="flex flex-wrap items-baseline gap-1.5">Username</span>
          <input className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" placeholder="Enter username" />
        </label>
        <label className="grid gap-[7px] text-md font-bold">
          <span className="flex flex-wrap items-baseline gap-1.5">Password</span>
          <input className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" type="password" placeholder="Enter password" />
        </label>
        <Link className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#143A57] px-[15px] font-bold !text-white max-[720px]:w-full" to="/patient/dashboard">
        <LockKeyhole size={17} /> Sign in 
        </Link>
        <div className="flex flex-col items-left gap-3.5 font-bold text-[#0397AE]">
          <a>Forgot password?</a>
          <Link to="/patient/register">New patient? Register here</Link>
        </div>
      </section>
      </div>
    </PatientPage>
  )
}
