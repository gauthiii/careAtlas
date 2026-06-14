import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Columns3,
  Filter,
  Fingerprint,
  ListOrdered,
  Loader2,
  MessageSquare,
  Minus,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  UserRound,
  Workflow,
  X,
} from 'lucide-react'

import { PortalPage, PortalPanel } from '../../components/portal/PortalShell'
import { ShadowAiWorkflowModal } from '../../components/governance/ShadowAiWorkflowModal'
import { RegisterAgentModal } from '../../components/governance/RegisterAgentModal'
import { cn } from '../../lib/cn'
import { useUnmanagedAISystems } from '../../hooks/useUnmanagedAISystems'
import {
  executeAgent,
  fetchAgentExecution,
  fetchManagedAIAssets,
  fetchUnmanagedAIAssets,
  type ExecuteAgentResponse,
  type SnowAIAsset,
  type SnowAISystem,
} from '../../services/serviceNow'

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

type ColKey = 'name' | 'vendor' | 'managed_by' | 'lifecycle_phase' | 'state' | 'lifecycle_status'

const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'name', label: 'Display name' },
  { key: 'lifecycle_phase', label: 'Lifecycle phase' },
  { key: 'state', label: 'State' },
  { key: 'lifecycle_status', label: 'Lifecycle status' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'managed_by', label: 'Managed by' },
]

const DEFAULT_COLS: ColKey[] = ['name', 'lifecycle_phase', 'state', 'lifecycle_status']

function cellValue(asset: SnowAIAsset, key: ColKey): string {
  switch (key) {
    case 'name': return asset.name || asset.display_name || ''
    case 'vendor': return asset.vendor || ''
    case 'managed_by': return asset.managed_by || ''
    case 'lifecycle_phase': return asset.lifecycle_phase || ''
    case 'state': return asset.state || ''
    case 'lifecycle_status': return asset.lifecycle_status || ''
  }
}

// ---------------------------------------------------------------------------
// Filter & sort types
// ---------------------------------------------------------------------------

type FilterOp = 'contains' | 'equals' | 'starts_with'

interface ActiveFilter {
  id: string
  field: ColKey
  op: FilterOp
  value: string
}

type SortDir = 'asc' | 'desc'

interface SortState {
  field: ColKey
  dir: SortDir
}

const FILTER_OPS: { op: FilterOp; label: string }[] = [
  { op: 'contains', label: 'contains' },
  { op: 'equals', label: 'equals' },
  { op: 'starts_with', label: 'starts with' },
]

function applyFilter(value: string, op: FilterOp, query: string): boolean {
  const v = value.toLowerCase()
  const q = query.toLowerCase()
  if (op === 'equals') return v === q
  if (op === 'starts_with') return v.startsWith(q)
  return v.includes(q)
}

function filterAndSort(
  assets: SnowAIAsset[],
  filters: ActiveFilter[],
  sort: SortState | null,
): SnowAIAsset[] {
  let result = assets
  for (const f of filters) {
    if (!f.value.trim()) continue
    result = result.filter((a) => applyFilter(cellValue(a, f.field), f.op, f.value))
  }
  if (sort) {
    result = [...result].sort((a, b) => {
      const av = cellValue(a, sort.field).toLowerCase()
      const bv = cellValue(b, sort.field).toLowerCase()
      const cmp = av.localeCompare(bv)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }
  return result
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GovernanceAiAgentsPage() {
  return (
    <PortalPage
      label="AI Governance Officer"
      title="AI Agents"
      intro="Agent records created in the ServiceNow AI Control Tower table sn_aia_agent since June 2, 2026. Expand an agent to inspect its strategy, role, proficiency and operating instructions."
    >
      <section className="min-w-0 px-6 pb-4">
        <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
          <AssetTable managed />
          <AssetTable managed={false} />
        </div>
      </section>

      <section className="min-w-0 px-6 pb-6">
        <AgentInventory />
      </section>
    </PortalPage>
  )
}

// ---------------------------------------------------------------------------
// Data hook
// ---------------------------------------------------------------------------

type FetchState = 'loading' | 'error' | 'empty' | 'ok'

function useAIAssets(managed: boolean) {
  const [assets, setAssets] = useState<SnowAIAsset[]>([])
  const [state, setState] = useState<FetchState>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    const fetcher = managed ? fetchManagedAIAssets : fetchUnmanagedAIAssets
    fetcher()
      .then((data) => {
        if (cancelled) return
        setAssets(data)
        setState(data.length === 0 ? 'empty' : 'ok')
      })
      .catch((e: Error) => {
        if (cancelled) return
        setErrorMsg(e.message)
        setState('error')
      })
    return () => { cancelled = true }
  }, [managed, refreshKey])

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  return { assets, state, errorMsg, refetch }
}

// ---------------------------------------------------------------------------
// Asset table
// ---------------------------------------------------------------------------

function AssetTable({ managed }: { managed: boolean }) {
  const { assets, state, errorMsg, refetch } = useAIAssets(managed)

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(DEFAULT_COLS)
  const [colPanelOpen, setColPanelOpen] = useState(false)

  // Filters
  const [filters, setFilters] = useState<ActiveFilter[]>([])
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [draftField, setDraftField] = useState<ColKey>('name')
  const [draftOp, setDraftOp] = useState<FilterOp>('contains')
  const [draftValue, setDraftValue] = useState('')

  // Sort
  const [sort, setSort] = useState<SortState | null>(null)

  const displayed = filterAndSort(assets, filters, sort)
  const activeFilterCount = filters.filter((f) => f.value.trim()).length

  const addFilter = () => {
    if (!draftValue.trim()) return
    setFilters((prev) => [
      ...prev,
      { id: crypto.randomUUID(), field: draftField, op: draftOp, value: draftValue.trim() },
    ])
    setDraftValue('')
  }

  const removeFilter = (id: string) => setFilters((prev) => prev.filter((f) => f.id !== id))
  const clearFilters = () => setFilters([])

  const toggleSort = (field: ColKey) => {
    setSort((prev) => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc') return { field, dir: 'desc' }
      return null
    })
  }

  const toggleCol = (key: ColKey) => {
    if (key === 'name') return // always visible
    setVisibleCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  // Re-order visibleCols to match ALL_COLUMNS order
  const orderedCols = ALL_COLUMNS.filter((c) => visibleCols.includes(c.key))

  const title = managed ? 'Managed AI Assets' : 'Unmanaged AI Assets'
  const Icon = managed ? ShieldCheck : ShieldOff
  const iconColor = managed ? 'text-emerald-600' : 'text-amber-500'
  const headerBg = managed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
  const headerText = managed ? 'text-emerald-700' : 'text-amber-700'
  const countBg = managed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
  const accentBorder = managed ? 'focus:ring-emerald-500/20 focus:border-emerald-500' : 'focus:ring-amber-500/20 focus:border-amber-500'
  const btnActive = managed ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-100 text-amber-700 border-amber-300'

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5eef3] bg-white shadow-[0_2px_8px_rgba(25,64,93,0.06)]">
      {/* Header */}
      <div className={cn('flex items-center justify-between border-b px-4 py-3', headerBg)}>
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <span className={cn('text-sm font-bold', headerText)}>{title}</span>
          {state === 'ok' && (
            <span className={cn('rounded-full px-2 py-0.5 text-[0.68rem] font-bold', countBg)}>
              {displayed.length}
              {displayed.length !== assets.length && (
                <span className="font-normal opacity-70"> / {assets.length}</span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-[0.7rem] font-bold text-[#53687b] transition-colors hover:bg-white/60"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {state === 'ok' && (
          <div className="flex items-center gap-1.5">
            {/* Filter button */}
            <button
              type="button"
              onClick={() => { setFilterPanelOpen((p) => !p); setColPanelOpen(false) }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.7rem] font-bold transition-colors',
                filterPanelOpen || activeFilterCount > 0
                  ? btnActive
                  : 'border-transparent bg-transparent text-[#53687b] hover:bg-white/60',
              )}
            >
              <Filter size={12} />
              Filter
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-current/20 px-1 text-[0.62rem]">{activeFilterCount}</span>
              )}
            </button>

            {/* Columns button */}
            <button
              type="button"
              onClick={() => { setColPanelOpen((p) => !p); setFilterPanelOpen(false) }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.7rem] font-bold transition-colors',
                colPanelOpen
                  ? btnActive
                  : 'border-transparent bg-transparent text-[#53687b] hover:bg-white/60',
              )}
            >
              <Columns3 size={12} />
              Columns
            </button>
          </div>
        )}
      </div>

      {/* Column chooser panel */}
      {colPanelOpen && (
        <div className="border-b border-[#eef3f7] bg-[#f8fbfc] px-4 py-3">
          <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-wide text-[#8aa0b3]">
            Show / hide columns
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_COLUMNS.map((col) => {
              const active = visibleCols.includes(col.key)
              const locked = col.key === 'name'
              return (
                <button
                  key={col.key}
                  type="button"
                  disabled={locked}
                  onClick={() => toggleCol(col.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'border-[#143A57] bg-[#143A57] text-white'
                      : 'border-[#dbe6ee] bg-white text-[#53687b] hover:border-[#143A57]',
                    locked && 'cursor-default opacity-70',
                  )}
                >
                  {active ? <Check size={11} /> : <Plus size={11} />}
                  {col.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter panel */}
      {filterPanelOpen && (
        <div className="border-b border-[#eef3f7] bg-[#f8fbfc] px-4 py-3">
          <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-wide text-[#8aa0b3]">
            Add filter
          </p>

          {/* Active filters */}
          {filters.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-2">
              {filters.map((f) => {
                const colLabel = ALL_COLUMNS.find((c) => c.key === f.field)?.label ?? f.field
                const opLabel = FILTER_OPS.find((o) => o.op === f.op)?.label ?? f.op
                return (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe0ea] bg-[#e7f3f8] px-2.5 py-1 text-xs text-[#0f5f8c]"
                  >
                    <span className="font-semibold">{colLabel}</span>
                    <span className="opacity-60">{opLabel}</span>
                    <span className="font-mono">"{f.value}"</span>
                    <button
                      type="button"
                      onClick={() => removeFilter(f.id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-[#0f5f8c]/10"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )
              })}
              <button
                type="button"
                onClick={clearFilters}
                className="text-[0.7rem] text-[#8aa0b3] underline hover:text-[#53687b]"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Draft filter row */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={draftField}
              onChange={(e) => setDraftField(e.target.value as ColKey)}
              className={cn(
                'rounded-md border border-[#dbe6ee] bg-white px-2 py-1.5 text-xs text-[#40566b] outline-none focus:ring-2',
                accentBorder,
              )}
            >
              {ALL_COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>

            <select
              value={draftOp}
              onChange={(e) => setDraftOp(e.target.value as FilterOp)}
              className={cn(
                'rounded-md border border-[#dbe6ee] bg-white px-2 py-1.5 text-xs text-[#40566b] outline-none focus:ring-2',
                accentBorder,
              )}
            >
              {FILTER_OPS.map((o) => (
                <option key={o.op} value={o.op}>{o.label}</option>
              ))}
            </select>

            <input
              type="text"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFilter()}
              placeholder="Value…"
              className={cn(
                'flex-1 rounded-md border border-[#dbe6ee] bg-white px-2.5 py-1.5 text-xs text-[#40566b] outline-none placeholder:text-[#9fb0c0] focus:ring-2 min-w-[100px]',
                accentBorder,
              )}
            />

            <button
              type="button"
              onClick={addFilter}
              disabled={!draftValue.trim()}
              className="inline-flex items-center gap-1 rounded-md bg-[#143A57] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40 hover:opacity-90"
            >
              <Plus size={11} /> Add
            </button>
          </div>
        </div>
      )}

      {/* States */}
      {state === 'loading' && (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-[#6b7c8f]">
          <Loader2 size={14} className="animate-spin" /> Loading from ServiceNow…
        </div>
      )}
      {state === 'error' && (
        <div className="px-4 py-4 text-xs text-red-600">
          Could not load assets. {errorMsg && <span className="opacity-75">{errorMsg}</span>}
        </div>
      )}
      {state === 'empty' && (
        <div className="px-4 py-6 text-center text-sm text-[#6b7c8f]">
          No {managed ? 'managed' : 'unmanaged'} AI assets found.
        </div>
      )}
      {state === 'ok' && displayed.length === 0 && (
        <div className="px-4 py-5 text-center text-xs text-[#8aa0b3]">
          No assets match the current filters.{' '}
          <button type="button" onClick={clearFilters} className="underline hover:text-[#53687b]">
            Clear filters
          </button>
        </div>
      )}

      {/* Table */}
      {state === 'ok' && displayed.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#eef3f7] bg-[#f8fbfc]">
                {orderedCols.map((col) => {
                  const isSort = sort?.field === col.key
                  return (
                    <th
                      key={col.key}
                      className="cursor-pointer select-none px-3 py-2.5 text-left"
                      onClick={() => toggleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1 font-bold uppercase tracking-[0.05em] text-[#8aa0b3] hover:text-[#53687b]">
                        {col.label}
                        {isSort ? (
                          sort.dir === 'asc'
                            ? <ChevronUp size={11} className="text-[#143A57]" />
                            : <ChevronDown size={11} className="text-[#143A57]" />
                        ) : (
                          <span className="opacity-0 group-hover:opacity-100">
                            <ChevronUp size={11} />
                          </span>
                        )}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3f7]">
              {displayed.map((asset) => (
                <AssetRow key={asset.sys_id} asset={asset} cols={orderedCols.map((c) => c.key)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Asset row
// ---------------------------------------------------------------------------

function AssetRow({ asset, cols }: { asset: SnowAIAsset; cols: ColKey[] }) {
  return (
    <tr className="transition-colors hover:bg-[#f5f9fb]">
      {cols.map((col) => (
        <td key={col} className="px-3 py-2.5">
          {col === 'name' ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-[#143A57] text-white">
                  <Bot size={12} />
                </span>
                <span className="font-medium text-[#102033] [overflow-wrap:anywhere]">
                  {asset.name || asset.display_name || '—'}
                </span>
              </div>
            </div>
          ) : col === 'lifecycle_phase' ? (
            asset.lifecycle_phase ? (
              <span className="rounded bg-[#eef3f7] px-1.5 py-0.5 text-[0.68rem] font-medium text-[#40566b]">
                {asset.lifecycle_phase}
              </span>
            ) : <span className="text-[#c0cdd8]">—</span>
          ) : col === 'lifecycle_status' ? (
            asset.lifecycle_status
              ? <LifecycleStatusBadge status={asset.lifecycle_status} />
              : <span className="text-[#c0cdd8]">—</span>
          ) : (
            <span className="text-[#40566b]">{cellValue(asset, col) || <span className="text-[#c0cdd8]">—</span>}</span>
          )}
        </td>
      ))}
    </tr>
  )
}

function LifecycleStatusBadge({ status }: { status: string }) {
  const n = status.toLowerCase()
  let dot = 'bg-slate-400'; let text = 'text-slate-600'; let bg = 'bg-slate-50'
  if (n.includes('deploy')) { dot = 'bg-emerald-500'; text = 'text-emerald-700'; bg = 'bg-emerald-50' }
  else if (n.includes('review')) { dot = 'bg-violet-500'; text = 'text-violet-700'; bg = 'bg-violet-50' }
  else if (n.includes('ready')) { dot = 'bg-sky-500'; text = 'text-sky-700'; bg = 'bg-sky-50' }
  else if (n.includes('assess')) { dot = 'bg-amber-500'; text = 'text-amber-700'; bg = 'bg-amber-50' }
  else if (n.includes('retire') || n.includes('end')) { dot = 'bg-red-400'; text = 'text-red-700'; bg = 'bg-red-50' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5', bg)}>
      <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', dot)} />
      <span className={cn('text-[0.68rem] font-semibold', text)}>{status}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Agent inventory (unchanged)
// ---------------------------------------------------------------------------

function AgentInventory() {
  const { systems, state, errorMsg, refetch } = useUnmanagedAISystems()
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Record<string, ChatSession>>({})
  const [workflowOpen, setWorkflowOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

  const selectedAgent = systems.find((a) => a.sys_id === selectedAgentId) ?? null

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const title = state === 'ok' ? `AI Agent Inventory — ${systems.length} agents` : 'AI Agent Inventory'

  return (
    <PortalPanel title={title} icon={<ShieldAlert size={18} />} className="relative">
      <div className="absolute right-5 top-5 flex items-center gap-2">
        <button
          type="button"
          onClick={refetch}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfe0ea] bg-[#f5f9fb] px-3 py-2 text-xs font-bold text-[#53687b] transition-colors hover:bg-[#e7f3f8]"
        >
          <RefreshCw size={14} />
          <span className="max-[640px]:hidden">Refresh</span>
        </button>
        <button
          type="button"
          onClick={() => setWorkflowOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#cfe0ea] bg-[#e7f3f8] px-3 py-2 text-xs font-bold text-[#0f5f8c] transition-colors hover:border-[#0f5f8c] hover:bg-[#d8edf5]"
        >
          <Workflow size={16} />
          <span className="max-[640px]:hidden">End-to-End Workflow</span>
        </button>
      </div>

      <p className="mb-4 pr-40 text-xs text-[#53687b]">
        Agents created in ServiceNow AI Control Tower table{' '}
        <span className="font-semibold text-[#143A57]">sn_aia_agent</span> since June 2, 2026.
      </p>

      {state === 'loading' && (
        <div className="flex items-center gap-2 py-6 text-sm text-[#6b7c8f]">
          <Loader2 size={16} className="animate-spin" /> Loading from ServiceNow…
        </div>
      )}
      {state === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not reach ServiceNow AI Control Tower.{' '}
          {errorMsg && <span className="opacity-75">{errorMsg}</span>}
        </div>
      )}
      {state === 'empty' && (
        <div className="flex items-center justify-center rounded-lg bg-[#f5f9fb] px-4 py-6 text-sm text-[#6b7c8f]">
          No AI agents found in ServiceNow.
        </div>
      )}

      {state === 'ok' && (
        <div className="space-y-3">
          {systems.map((agent) => (
            <AgentCard
              key={agent.sys_id}
              agent={agent}
              open={open.has(agent.sys_id)}
              onToggle={() => toggle(agent.sys_id)}
              onChat={() => setSelectedAgentId(agent.sys_id)}
            />
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="inline-flex cursor-default items-center gap-2 rounded-md bg-[#143A57] px-4 py-2 text-white opacity-60">
          View all agents <ArrowRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => setRegisterOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#143A57] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0f5f8c]"
        >
          <Plus size={16} /> Register new agent
        </button>
      </div>

      <AgentChatDrawer
        agent={selectedAgent}
        session={selectedAgent ? sessions[selectedAgent.sys_id] : undefined}
        onClose={() => setSelectedAgentId(null)}
        onSessionChange={(id, sess) => setSessions((prev) => ({ ...prev, [id]: sess }))}
      />
      <ShadowAiWorkflowModal open={workflowOpen} onClose={() => setWorkflowOpen(false)} />
      <RegisterAgentModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={(_sys_id, _name) => setRegisterOpen(false)}
      />
    </PortalPanel>
  )
}

// ---------------------------------------------------------------------------
// Agent card
// ---------------------------------------------------------------------------

function AgentCard({ agent, open, onToggle, onChat }: {
  agent: SnowAISystem; open: boolean; onToggle: () => void; onChat: () => void
}) {
  const proficiency = parseBullets(agent.proficiency)
  const steps = parseSteps(agent.instructions)

  return (
    <div className={cn(
      'overflow-hidden rounded-xl border border-[#e5eef3] bg-white transition-shadow',
      open ? 'shadow-[0_8px_24px_rgba(25,64,93,0.08)]' : 'hover:shadow-[0_4px_14px_rgba(25,64,93,0.06)]',
    )}>
      <div className="flex w-full items-center gap-4 px-4 py-3.5">
        <button type="button" onClick={onToggle} aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[9px] bg-[#143A57] text-white">
            <Bot size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold text-[#102033]">{agent.name || '—'}</span>
              <AgentTypeBadge type={agent.agent_type} />
              {agent.strategy && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[0.68rem] font-bold text-indigo-600">
                  <Workflow size={11} /> {agent.strategy}
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-xs text-[#6b7c8f]">
              {agent.description || agent.display_name || 'No description'}
            </span>
          </span>
          <ChevronDown size={18} className={cn('flex-shrink-0 text-[#8aa0b3] transition-transform', open && 'rotate-180')} />
        </button>
        <button type="button" onClick={onChat}
          className="inline-flex flex-shrink-0 items-center gap-2 rounded-md border border-[#cfe0ea] bg-white px-3 py-2 text-xs font-bold text-[#0f5f8c] transition-colors hover:border-[#0f5f8c] hover:bg-[#f5f9fb]">
          <MessageSquare size={14} /> Chat
        </button>
      </div>

      {open && (
        <div className="space-y-5 border-t border-[#eef3f7] px-4 py-4">
          {agent.role && (
            <DetailSection icon={<UserRound size={14} />} title="Role">
              <p className="break-words rounded-lg border-l-[3px] border-[#0f5f8c] bg-[#f5f9fb] px-3.5 py-3 text-sm leading-[1.6] text-[#40566b]">{agent.role}</p>
            </DetailSection>
          )}
          {agent.description && (
            <DetailSection icon={<Sparkles size={14} />} title="Description">
              <p className="break-words text-sm leading-[1.6] text-[#40566b]">{agent.description}</p>
            </DetailSection>
          )}
          {proficiency.length > 0 && (
            <DetailSection icon={<Check size={14} />} title="Proficiency">
              {proficiency.length > 1 ? (
                <ul className="space-y-2">
                  {proficiency.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-[1.55] text-[#40566b]">
                      <Check size={15} className="mt-0.5 flex-shrink-0 text-[#12805c]" />
                      <span className="min-w-0 break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm leading-[1.6] text-[#40566b]">{proficiency[0]}</p>}
            </DetailSection>
          )}
          {steps.length > 0 && (
            <DetailSection icon={<ListOrdered size={14} />} title="Instructions">
              {steps.length > 1 ? (
                <ol className="space-y-2.5">
                  {steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-[1.55] text-[#40566b]">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#143A57] text-[11px] font-bold text-white">{i + 1}</span>
                      <span className="min-w-0 break-words">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm leading-[1.6] text-[#40566b]">{steps[0]}</p>}
            </DetailSection>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-[#f8fbfc] px-4 py-3 max-[640px]:grid-cols-1">
            <MetaItem icon={<Fingerprint size={14} />} label="Display name" value={agent.display_name} mono />
            <MetaItem icon={<Workflow size={14} />} label="Strategy" value={agent.strategy} />
            <MetaItem icon={<Filter size={14} />} label="Condition" value={agent.condition} />
            <MetaItem icon={<Bot size={14} />} label="Agent type" value={agent.agent_type} />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chat drawer
// ---------------------------------------------------------------------------

type ChatMessage = { id: string; role: 'user' | 'agent' | 'error' | 'pending'; text: string; timestamp: string }
type ChatSession = { messages: ChatMessage[]; contextId?: string | null; taskId?: string | null; state?: string | null; pending?: boolean }

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const POLL_INTERVAL = 2000
const POLL_TIMEOUT = 60_000
const PENDING_STATES = new Set(['accepted', 'submitted', 'working', 'running', 'pending'])
const sleep = (ms: number) => new Promise<void>((res) => window.setTimeout(res, ms))

function isPending(r: ExecuteAgentResponse) {
  const status = r.status?.toLowerCase()
  const state = r.state?.toLowerCase()
  return status === 'pending' || Boolean(state && PENDING_STATES.has(state)) || (!r.output && status !== 'completed' && status !== 'error')
}

function replaceMsg(msgs: ChatMessage[], id: string, next: ChatMessage) {
  return msgs.map((m) => (m.id === id ? next : m))
}

function AgentChatDrawer({ agent, session, onClose, onSessionChange }: {
  agent: SnowAISystem | null; session?: ChatSession; onClose: () => void
  onSessionChange: (id: string, sess: ChatSession) => void
}) {
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)
  const open = Boolean(agent)
  const active = session ?? { messages: [] }
  const pending = Boolean(active.pending)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [active.messages.length, pending])

  if (!agent) return null

  const update = (next: ChatSession) => onSessionChange(agent.sys_id, next)
  const canSend = input.trim().length > 0 && !pending

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSend) return
    const text = input.trim()
    const now = new Date().toISOString()
    const userMsg: ChatMessage = { id: newId(), role: 'user', text, timestamp: now }
    const pendingMsg: ChatMessage = { id: newId(), role: 'pending', text: 'Waiting for ServiceNow callback...', timestamp: now }
    const optimistic: ChatSession = { ...active, messages: [...active.messages, userMsg, pendingMsg], pending: true }
    setInput('')
    update(optimistic)

    try {
      const res = await executeAgent(agent.sys_id, text, active.contextId, active.taskId)
      let next: ChatSession = { ...optimistic, contextId: res.context_id ?? optimistic.contextId, taskId: res.task_id ?? optimistic.taskId, state: res.state ?? optimistic.state }
      let latest = res

      if (res.request_id && isPending(res)) {
        const deadline = Date.now() + POLL_TIMEOUT
        while (Date.now() < deadline) {
          await sleep(POLL_INTERVAL)
          latest = await fetchAgentExecution(res.request_id)
          next = { ...next, contextId: latest.context_id ?? next.contextId, taskId: latest.task_id ?? next.taskId, state: latest.state ?? next.state }
          if (!isPending(latest)) break
        }
      }

      if (isPending(latest)) {
        update({ ...next, messages: replaceMsg(optimistic.messages, pendingMsg.id, { id: pendingMsg.id, role: 'error', text: 'Timed out. Try again in a moment.', timestamp: new Date().toISOString() }), pending: false })
        return
      }
      if (latest.status === 'error' || latest.error) {
        update({ ...next, messages: replaceMsg(optimistic.messages, pendingMsg.id, { id: pendingMsg.id, role: 'error', text: latest.error || latest.output || 'ServiceNow returned an error.', timestamp: new Date().toISOString() }), pending: false })
        return
      }
      update({ ...next, messages: replaceMsg(optimistic.messages, pendingMsg.id, { id: pendingMsg.id, role: 'agent', text: latest.output || 'Agent executed successfully.', timestamp: new Date().toISOString() }), contextId: latest.context_id ?? next.contextId, taskId: latest.task_id ?? next.taskId, state: latest.state ?? next.state, pending: false })
    } catch (err) {
      update({ ...optimistic, messages: replaceMsg(optimistic.messages, pendingMsg.id, { id: pendingMsg.id, role: 'error', text: err instanceof Error ? err.message : 'Failed to run the agent.', timestamp: new Date().toISOString() }), pending: false })
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#102033]/35" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col bg-white shadow-[-16px_0_42px_rgba(16,32,51,0.16)] max-[640px]:max-w-none">
        <header className="border-b border-[#e5eef3] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[9px] bg-[#143A57] text-white">
              <Bot size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-bold text-[#102033]">{agent.name || 'AI Agent'}</h2>
                <AgentTypeBadge type={agent.agent_type} />
              </div>
              <p className="mt-1 max-h-[42px] overflow-hidden text-sm leading-[1.45] text-[#53687b]">
                {agent.description || agent.display_name || 'No description'}
              </p>
            </div>
            <button type="button" onClick={onClose}
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md border border-[#dbe6ee] text-[#53687b] hover:bg-[#f5f9fb]">
              <X size={17} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs max-[640px]:grid-cols-1">
            <MetaPill label="Strategy" value={agent.strategy || '—'} />
            <MetaPill label="State" value={active.state || 'new'} />
            <MetaPill label="Context" value={active.contextId || 'not started'} mono />
            <MetaPill label="Task" value={active.taskId || 'not started'} mono />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fbfc] px-5 py-5">
          {active.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="max-w-[320px]">
                <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-[10px] bg-[#e7f3f8] text-[#0f5f8c]">
                  <MessageSquare size={20} />
                </div>
                <p className="text-sm leading-[1.6] text-[#53687b]">Start a conversation with this ServiceNow AI agent.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {active.messages.map((m) => <ChatBubble key={m.id} message={m} />)}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-[#e5eef3] bg-white px-5 py-4">
          <div className="flex items-end gap-2">
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${agent.name || 'this agent'}…`} rows={2}
              className="min-h-[46px] flex-1 resize-none rounded-lg border border-[#dbe6ee] px-3.5 py-2.5 text-sm leading-[1.45] text-[#40566b] outline-none placeholder:text-[#9fb0c0] focus:border-[#0f5f8c] focus:ring-2 focus:ring-[#0f5f8c]/15"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
            />
            <button type="submit" disabled={!canSend}
              className={cn('grid h-[46px] w-[46px] flex-shrink-0 place-items-center rounded-lg bg-[#143A57] text-white transition-opacity', !canSend ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90')}>
              {pending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'
  const isPendingMsg = message.role === 'pending'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[82%] whitespace-pre-wrap break-words rounded-lg px-3.5 py-2.5 text-sm leading-[1.55] shadow-sm',
        isUser && 'bg-[#143A57] text-white',
        !isUser && !isError && 'bg-white text-[#40566b]',
        isError && 'border border-red-200 bg-red-50 text-red-700',
        isPendingMsg && 'inline-flex items-center gap-2 text-[#53687b]',
      )}>
        {isPendingMsg && <Loader2 size={14} className="flex-shrink-0 animate-spin" />}
        {message.text}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function MetaPill({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-md bg-[#f5f9fb] px-3 py-2">
      <div className="text-[0.62rem] font-bold uppercase tracking-[0.05em] text-[#8aa0b3]">{label}</div>
      <div className={cn('truncate text-xs text-[#40566b]', mono && 'font-mono')}>{value}</div>
    </div>
  )
}

function DetailSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.06em] text-[#6b7c8f]">
        <span className="text-[#0f5f8c]">{icon}</span>{title}
      </div>
      {children}
    </div>
  )
}

function MetaItem({ icon, label, value, mono }: { icon: ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 flex-shrink-0 text-[#8aa0b3]">{icon}</span>
      <div className="min-w-0">
        <div className="text-[0.66rem] font-bold uppercase tracking-[0.05em] text-[#8aa0b3]">{label}</div>
        <div className={cn('text-sm text-[#40566b] [overflow-wrap:anywhere]', mono && 'font-mono text-[0.8rem]')}>
          {value || '—'}
        </div>
      </div>
    </div>
  )
}

function AgentTypeBadge({ type }: { type: string }) {
  const n = type.toLowerCase()
  const styles = n === 'internal' ? 'bg-[#e7f3f8] text-[#0f5f8c]'
    : n === 'external' ? 'bg-purple-100 text-purple-700'
    : 'bg-slate-100 text-slate-600'
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide', styles)}>
      {type || 'unknown'}
    </span>
  )
}

function parseBullets(text: string): string[] {
  return text.split(/\s*[-•]\s+/).map((s) => s.trim()).filter(Boolean)
}

function parseSteps(text: string): string[] {
  return text.split(/\s*\d+\.\s+/).map((s) => s.trim()).filter(Boolean)
}
