import { Fingerprint, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DoctorPage } from '../../components/staff/DoctorShell'

export function StaffSignInPage() {
  return (
    <DoctorPage
      title="Access Clinical Operations"
      intro="Use your clinical account credentials. A one-time MFA code is sent after username and password validation."
    >
       <div className="flex items-center justify-center">
      <section className="grid w-[540px] gap-4 rounded-xl border border-[#d7e5ec] bg-white p-6">
        <label className="grid gap-[7px] text-md font-bold">
          <span className="flex flex-wrap items-baseline gap-1.5">Username</span>
          <input className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" placeholder="clinician.name" />
        </label>
        <label className="grid gap-[7px] text-md font-bold">
          <span className="flex flex-wrap items-baseline gap-1.5">Password</span>
          <input className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" type="password" placeholder="Enter password" />
        </label>
        <Link
          className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#0f5f8c] px-[15px] font-bold !text-white max-[720px]:w-full"
          to="/staff/doctor"
        >
          <LockKeyhole size={17} /> Sign in 
        </Link>
        <div className="flex flex-col items-left gap-3.5 font-bold text-[#0397AE]">
          <a>Forgot password?</a>
        </div>
      </section>
      </div>
    </DoctorPage>
  )
}
