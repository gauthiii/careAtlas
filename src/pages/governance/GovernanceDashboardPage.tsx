import {
  Activity,
  Bot,
  Lock,
  ShieldAlert,
  Siren,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  Plus,
  ChartBar,
} from 'lucide-react'

import {
  PortalPage,
  PortalPanel,
} from '../../components/portal/PortalShell'

export function GovernanceDashboardPage() {
  const fairnessData = [
    { group: 'Asian', value: 32, expected: '+22%' },
    { group: 'Black', value: 20, expected: '+2%' },
    { group: 'Mixed', value: 24, expected: '+1%' },
    { group: 'White', value: 27, expected: '-3%' },
    { group: 'Other', value: 11, expected: '-5%' },
  ]

  return (
    <PortalPage
      label="AI Governance Officer"
      title="Control Tower evidence board"
      intro="Consolidated governance view for agent inventory, shadow AI detection, fairness monitoring, prompt injection, access violations and Action Fabric audit evidence."
    >
      {/* KPI STRIP */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 p-6">
        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Registered agents
          </div>

          <div className="mt-2 text-2xl font-bold">
            4
          </div>

          <div className="text-sm font-semibold text-emerald-600">
            3 active • 1 quarantined
          </div>
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Shadow AI detections
          </div>

          <div className="mt-2 text-2xl font-bold">
            1
          </div>

          <div className="text-sm font-semibold text-red-600">
            First seen today 09:08
          </div>
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Prompt injection alerts
          </div>

          <div className="mt-2 text-2xl font-bold">
            4
          </div>

          <div className="text-sm font-semibold text-amber-600">
            2 blocked • 2 flagged today
          </div>
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Access violations
          </div>

          <div className="mt-2 text-2xl font-bold">
            2
          </div>

          <div className="text-sm font-semibold text-orange-600">
            PHI scope • Least privilege
          </div>
        </div>

        <div className="rounded-xl border border-[#d7e5ec] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[0.06em]">
            Fairness skew
          </div>

          <div className="mt-2 text-xl font-bold">
            High
          </div>

          <div className="text-sm font-semibold text-red-600">
            Asian cohort p &lt; 0.05
          </div>
        </div>
      </section>

      {/* MAIN GRID */}
      <div className="grid grid-cols-[1fr_1fr] gap-8 max-[1200px]:grid-cols-1 p-6">
        {/* LEFT COLUMN */}
        <div className="space-y-8">
          {/* AGENT INVENTORY */}
          <PortalPanel
            title="Agent Inventory"
            icon={<Bot size={18} />}
          >
            <table className="w-full border-separate border-spacing-y-3 text-sm">
              <thead>
                <tr className="text-left">
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Identity</th>
                  <th>Risk</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Scheduling Ranker</td>
                  <td>
                    <Badge success>Active</Badge>
                  </td>
                  <td>nih-schedule-01</td>
                  <td>
                    <Badge success>Low</Badge>
                  </td>
                </tr>

                <tr>
                  <td>Identity Verifier</td>
                  <td>
                    <Badge success>Active</Badge>
                  </td>
                  <td>nih-verify-02</td>
                  <td>
                    <Badge warning>Medium</Badge>
                  </td>
                </tr>

                <tr>
                  <td>Appointment Summarizer</td>
                  <td>
                    <Badge warning>Paused</Badge>
                  </td>
                  <td>nih-summary-03</td>
                  <td>
                    <Badge warning>Medium</Badge>
                  </td>
                </tr>

                <tr>
                  <td>Legacy Slot Optimizer</td>
                  <td>
                    <Badge danger>Quarantined</Badge>
                  </td>
                  <td>Unknown</td>
                  <td>
                    <Badge danger>High</Badge>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-5 flex gap-3">
              <button className="bg-[#143A57] text-white px-4 py-2 rounded-md inline-flex items-center gap-2">
                View all agents <ArrowRight size={16} />
              </button>

              <button className="bg-[#143A57] text-white px-4 py-2 rounded-md inline-flex items-center gap-2">
               <Plus size={16} /> Register new agent
              </button>
            </div>
          </PortalPanel>

          {/* FAIRNESS MONITOR */}
          <PortalPanel
            title="Scheduling Fairness Monitor"
            icon={<Activity size={18} />}
          >
            <div className="space-y-3">
              {fairnessData.map((item) => (
                <div key={item.group}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{item.group}</span>
                    <span>{item.value}</span>
                  </div>

                  <div className="h-4 rounded-full bg-[#eef3f7]">
                    <div
                      className="h-4 rounded-full bg-[#0397AE]"
                      style={{
                        width: `${item.value * 3}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-lg bg-[#fff7e6] p-3 text-sm text-[#946200]">
              Statistically significant skew detected in Asian
              cohort. Over-allocation relative to population
              proportion.
            </div>
          </PortalPanel>

          {/* PROMPT ALERTS */}
          <PortalPanel
            title="Prompt Injection Alerts"
            icon={<ShieldAlert size={18} />}
          >
             <table className="w-full border-separate border-spacing-y-3 text-sm text-left">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Session</th>
                  <th>Agent</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>09:14</td>
                  <td>S-9130 • 98%</td>
                  <td>Scheduling Ranker</td>
                  <td>
                    <Badge danger>Blocked</Badge>
                  </td>
                </tr>

                <tr>
                  <td>08:52</td>
                  <td>S-9189 • 95%</td>
                  <td>Identity Verifier</td>
                  <td>
                    <Badge warning>Flagged</Badge>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-6">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide">
                Today's injection pattern
              </div>

              <div className="flex gap-1">
                <div className="h-8 w-28 bg-red-300" />
                <div className="h-8 w-24 bg-red-200" />
                <div className="h-8 w-24 bg-orange-100" />
                <div className="h-8 flex-1 bg-green-100" />
              </div>
            </div>
          </PortalPanel>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
          {/* SHADOW AI */}
          <PortalPanel
            title="Shadow AI Detection"
            icon={<Siren size={18} />}
          >
            <div className="rounded-xl border border-red-300 bg-red-50 p-4">
              <div className="flex items-center gap-2 font-bold text-red-700">
                <AlertTriangle size={16} />
                Unapproved endpoint detected
              </div>

              <div className="mt-2 text-sm text-red-700">
                https://legacy-slot-ai.local/api
              </div>

              <div className="mt-2 text-sm">
                First seen 09:08 AM • Not present in approved
                inventory • Caller: Appointment Summarizer
              </div>
            </div>

            <table className="w-full border-separate border-spacing-y-3 text-sm mt-4 text-left">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Jun 1</td>
                  <td>test-image.local/v2</td>
                  <td>
                    <Badge success>Resolved</Badge>
                  </td>
                </tr>

                <tr>
                  <td>May 28</td>
                  <td>openai-proxy.internal</td>
                  <td>
                    <Badge success>Resolved</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </PortalPanel>

          {/* EXPECTED VS ACTUAL */}
          <PortalPanel icon={<ChartBar size={18} />} title="Expected vs Actual Allocation (%)">
            <div className="space-y-4">
              {fairnessData.map((item) => (
                <div
                  key={item.group}
                  className="grid grid-cols-[100px_1fr_60px] items-center gap-3"
                >
                  <span>{item.group}</span>

                  <div className="h-3 rounded-full bg-[#edf2f5]">
                    <div
                      className="h-3 rounded-full bg-[#0397AE]"
                      style={{ width: '75%' }}
                    />
                  </div>

                  <span>{item.expected}</span>
                </div>
              ))}
            </div>
          </PortalPanel>

          {/* ACCESS VIOLATIONS */}
          <PortalPanel
            title="Agent Access Violations"
            icon={<Lock size={18} />}
          >
            <table className="w-full border-separate border-spacing-y-3 text-sm text-left">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Agent → Resource</th>
                  <th>Policy</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>09:21</td>
                  <td>Scheduling Ranker → clinical_notes</td>
                  <td>
                    <Badge danger>PHI scope guard</Badge>
                  </td>
                </tr>

                <tr>
                  <td>08:35</td>
                  <td>Appt Summarizer → billing_records</td>
                  <td>
                    <Badge warning>Least privilege</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </PortalPanel>

          {/* AGENT RISK SCORECARD */}
          <PortalPanel title="Agent Risk Scorecard">
            <div className="space-y-4 text-sm">
              <RiskRow
                level="H"
                title="Legacy Slot Optimizer"
                desc="Unknown identity • shadow endpoint calls"
              />

              <RiskRow
                level="M"
                title="Appointment Summarizer"
                desc="Billing access violation"
              />

              <RiskRow
                level="L"
                title="Scheduling Ranker"
                desc="PHI scope violation blocked"
              />
            </div>
          </PortalPanel>
        </div>
      </div>

      {/* AUDIT LOG */}
      <section className="px-6">
        <PortalPanel
          title="Action Fabric Audit Log"
          icon={<ClipboardList size={18} />}
        >
          <table className="w-full border-separate border-spacing-y-3 text-sm text-left">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Subject</th>
                <th>Agent</th>
                <th>Decision Trail</th>
                <th>Outcome</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>09:18</td>
                <td>Booking confirmation</td>
                <td>Maya Patel</td>
                <td>Scheduling Ranker</td>
                <td>Ranked slot selected after fairness validation</td>
                <td>
                  <Badge success>Approved</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </PortalPanel>
      </section>
    </PortalPage>
  )
}

function Metric({
  title,
  value,
  note,
  color,
}: any) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[#6b7c8f]">
        {title}
      </div>

      <div className={`mt-1 text-3xl font-bold ${color}`}>
        {value}
      </div>

      <div className="mt-1 text-sm text-[#6b7c8f]">
        {note}
      </div>
    </div>
  )
}

function Badge({
  children,
  success,
  warning,
  danger,
}: any) {
  const styles = success
    ? 'bg-green-100 text-green-700'
    : warning
      ? 'bg-amber-100 text-amber-700'
      : danger
        ? 'bg-red-100 text-red-700'
        : 'bg-slate-100 text-slate-700'

  return (
    <span className={`rounded-full px-2 py-1 text-xs ${styles}`}>
      {children}
    </span>
  )
}

function RiskRow({ level, title, desc }: any) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef3f7] font-bold">
        {level}
      </div>

      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-[#6b7c8f]">{desc}</div>
      </div>
    </div>
  )
}