import { Activity, Bot, Lock, ShieldAlert, Siren, ClipboardList } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PortalPage, PortalPanel, PortalTable } from '../../components/portal/PortalShell'
import { accessViolations, agents, auditLog, fairnessData, injectionAlerts } from '../../data/staffGovernanceData'

export function GovernanceDashboardPage() {
  return (
    <PortalPage
      label="AI Governance Officer"
      eyebrow="AI governance dashboard"
      title="Control Tower evidence board"
      intro="A consolidated governance view for inventory, shadow AI detection, fairness monitoring, prompt injection, access violations, and Action Fabric audit evidence."
    >
      <div className="patient-welcome-band governance-kpis">
        <div><span>Registered agents</span><strong>{agents.length}</strong></div>
        <div><span>Shadow AI detections</span><strong>1</strong></div>
      </div>
      <div className="governance-grid clinical-governance-grid">
        <PortalPanel title="Agent inventory" icon={<Bot size={21} />} tone="secure">
          <PortalTable
            columns={['Agent', 'Status', 'Identity']}
            rows={agents.map((agent) => [agent.name, `${agent.status} · ${agent.last}`, agent.identity])}
          />
          <button className="patient-button secondary">View details</button>
        </PortalPanel>
        <PortalPanel title="Shadow AI detection" icon={<Siren size={21} />} tone="danger">
          <p className="alert-copy">Unapproved endpoint detected: https://legacy-slot-ai.local/api</p>
          <p>First seen 09:08 AM. Not present in approved agent inventory.</p>
          <button className="patient-button secondary">Investigate</button>
        </PortalPanel>
        <PortalPanel title="Scheduling fairness monitor" icon={<Activity size={21} />} tone="warning">
          <div className="chart-wrap">
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
          <span className="status-badge status-danger">Statistically significant skew detected</span>
          <button className="patient-button secondary">View incident</button>
        </PortalPanel>
        <PortalPanel title="Prompt injection alerts" icon={<ShieldAlert size={21} />} tone="danger">
          <PortalTable
            columns={['Time', 'Session', 'Action']}
            rows={injectionAlerts.map((alert) => [alert.time, `${alert.session} · ${alert.confidence}`, alert.action])}
          />
          <button className="patient-button secondary">View all</button>
        </PortalPanel>
        <PortalPanel title="Agent access violations" icon={<Lock size={21} />} tone="warning">
          <PortalTable
            columns={['Time', 'Agent', 'Policy']}
            rows={accessViolations.map((violation) => [violation.time, `${violation.agent} -> ${violation.resource}`, violation.policy])}
          />
        </PortalPanel>
        <PortalPanel title="Action Fabric audit log" icon={<ClipboardList size={21} />} tone="secure">
          <PortalTable
            columns={['Action', 'Subject', 'Decision trail']}
            rows={auditLog.map((entry) => [entry.action, entry.subject, entry.trail])}
          />
        </PortalPanel>
      </div>
    </PortalPage>
  )
}
