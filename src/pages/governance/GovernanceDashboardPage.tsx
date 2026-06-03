import { Activity, Bot, Lock, ShieldAlert, Siren, ClipboardList } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PortalPage, PortalPanel, PortalTable } from '../../components/portal/PortalShell'
import { accessViolations, agents, auditLog, fairnessData, injectionAlerts } from '../../data/staffGovernanceData'
import { cn } from '../../lib/cn'

export function GovernanceDashboardPage() {
  return (
    <PortalPage
      label="AI Governance Officer"
      eyebrow="AI governance dashboard"
      title="Control Tower evidence board"
      intro="A consolidated governance view for inventory, shadow AI detection, fairness monitoring, prompt injection, access violations, and Action Fabric audit evidence."
    >
      <div className="grid grid-cols-2 gap-4 rounded-[14px] border border-[#d7e5ec] border-l-[5px] border-l-[#40566b] bg-white p-[18px] shadow-[0_12px_30px_rgba(25,64,93,0.07)] max-[720px]:grid-cols-1">
        <div className="grid gap-[7px]"><span className="text-[0.74rem] font-black uppercase tracking-[0.06em] text-[#607487]">Registered agents</span><strong className="text-[1.25rem] text-[#102033]">{agents.length}</strong></div>
        <div className="grid gap-[7px]"><span className="text-[0.74rem] font-black uppercase tracking-[0.06em] text-[#607487]">Shadow AI detections</span><strong className="text-[1.25rem] text-[#102033]">1</strong></div>
      </div>
      <div className="grid items-start gap-[18px] grid-cols-3 max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
        <PortalPanel title="Agent inventory" icon={<Bot size={21} />} tone="secure">
          <PortalTable
            columns={['Agent', 'Status', 'Identity']}
            rows={agents.map((agent) => [agent.name, `${agent.status} · ${agent.last}`, agent.identity])}
          />
          <button className="mt-4 inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-extrabold text-[#0f5f8c] max-[720px]:w-full">View details</button>
        </PortalPanel>
        <PortalPanel title="Shadow AI detection" icon={<Siren size={21} />} tone="danger">
          <p className="rounded-xl border-2 border-[#eb5757] bg-[#fff0ee] p-3 font-black text-[#8f1f1f]">Unapproved endpoint detected: https://legacy-slot-ai.local/api</p>
          <p className="mt-1.5 mb-0 leading-normal text-[#607487]">First seen 09:08 AM. Not present in approved agent inventory.</p>
          <button className="mt-4 inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-extrabold text-[#0f5f8c] max-[720px]:w-full">Investigate</button>
        </PortalPanel>
        <PortalPanel title="Scheduling fairness monitor" icon={<Activity size={21} />} tone="warning" className="max-[1100px]:col-span-1 col-span-2 max-[720px]:col-span-1">
          <div className="h-[230px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={fairnessData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="group" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="slots" radius={[8, 8, 0, 0]}>
                  {fairnessData.map((entry) => <Cell key={entry.group} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <span className={cn('mt-4 inline-flex w-max max-w-full rounded-full bg-[#feeceb] px-[9px] py-[5px] text-[0.75rem] font-black text-[#a22828] max-[720px]:w-full')}>Statistically significant skew detected</span>
          <button className="mt-4 inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-extrabold text-[#0f5f8c] max-[720px]:w-full">View incident</button>
        </PortalPanel>
        <PortalPanel title="Prompt injection alerts" icon={<ShieldAlert size={21} />} tone="danger">
          <PortalTable
            columns={['Time', 'Session', 'Action']}
            rows={injectionAlerts.map((alert) => [alert.time, `${alert.session} · ${alert.confidence}`, alert.action])}
          />
          <button className="mt-4 inline-flex min-h-[42px] w-max cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#b7ceda] bg-white px-[15px] font-extrabold text-[#0f5f8c] max-[720px]:w-full">View all</button>
        </PortalPanel>
        <PortalPanel title="Agent access violations" icon={<Lock size={21} />} tone="warning">
          <PortalTable
            columns={['Time', 'Agent', 'Policy']}
            rows={accessViolations.map((violation) => [violation.time, `${violation.agent} -> ${violation.resource}`, violation.policy])}
          />
        </PortalPanel>
        <PortalPanel title="Action Fabric audit log" icon={<ClipboardList size={21} />} tone="secure" className="max-[1100px]:col-span-1 col-span-2 max-[720px]:col-span-1">
          <PortalTable
            columns={['Action', 'Subject', 'Decision trail']}
            rows={auditLog.map((entry) => [entry.action, entry.subject, entry.trail])}
          />
        </PortalPanel>
      </div>
    </PortalPage>
  )
}
