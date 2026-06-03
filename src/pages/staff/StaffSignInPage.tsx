import { Fingerprint, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PortalPage } from '../../components/portal/PortalShell'

export function StaffSignInPage() {
  return (
    <PortalPage
      label="Clinical staff portal"
      eyebrow="Staff sign in"
      title="Access clinical operations"
      intro="Staff use the same ServiceNow authentication pattern with MFA enforced for all roles."
    >
      <section className="grid max-w-[540px] gap-4 rounded-[14px] border border-[#d7e5ec] bg-white p-[22px] shadow-[0_12px_30px_rgba(25,64,93,0.07)] max-[720px]:rounded-xl">
        <label className="grid gap-[7px] text-[0.84rem] font-extrabold text-[#40566b]">
          <span className="flex flex-wrap items-baseline gap-1.5">Username</span>
          <input className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" placeholder="clinician.name" />
        </label>
        <label className="grid gap-[7px] text-[0.84rem] font-extrabold text-[#40566b]">
          <span className="flex flex-wrap items-baseline gap-1.5">Password</span>
          <input className="w-full rounded-[9px] border border-[#cbdde6] bg-white px-3 py-[11px] text-inherit" type="password" placeholder="Enter password" />
        </label>
        <div className="flex items-center gap-2 rounded-[9px] border border-[#cbdde6] bg-[#f7fbfd] p-3 font-[750] text-[#40566b]"><Fingerprint size={18} /> MFA code is sent after credential validation.</div>
        <Link className="inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#0f5f8c] px-[15px] font-extrabold text-white max-[720px]:w-full" to="/role-picker">Sign in <LockKeyhole size={17} /></Link>
      </section>
    </PortalPage>
  )
}
