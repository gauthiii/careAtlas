import { useState } from 'react'
import { Activity, ShieldCheck, Siren } from 'lucide-react'
import {
  FAIRNESS_BY_AGE,
  FAIRNESS_BY_ETHNICITY,
  FAIRNESS_BY_GENDER,
  maxSkew,
  type FairnessGroup,
} from '../../data/useCaseDemoData'
import { useFairnessData } from '../../hooks/useFairnessData'
import { DemoTag } from './DemoTag'
import { cn } from '../../lib/cn'

const ALERT_THRESHOLD = 5 // percentage points

type DimKey = 'ethnicity' | 'gender' | 'age'

interface Dimension {
  key: DimKey
  label: string
  staticGroups: FairnessGroup[]
}

const DIMENSIONS: Dimension[] = [
  { key: 'ethnicity', label: 'Ethnicity', staticGroups: FAIRNESS_BY_ETHNICITY },
  { key: 'gender', label: 'Gender', staticGroups: FAIRNESS_BY_GENDER },
  { key: 'age', label: 'Age band', staticGroups: FAIRNESS_BY_AGE },
]

/**
 * UC6 · Fairness — "before / after debiasing" view of appointment-outcome
 * allocation across demographic groups. Grouped aggregates only, no PII.
 *
 * "Before" = live data from the instance (u_appointment joined with u_patient demographics).
 * "After"  = deterministic debiased view (each group nudged to expected ± 1pp).
 * Falls back to static demo data if the API is unreachable.
 */
export function FairnessDebiasDemo() {
  const [dimKey, setDimKey] = useState<DimKey>('ethnicity')
  const [mode, setMode] = useState<'biased' | 'debiased'>('biased')

  const live = useFairnessData()

  const dim = DIMENSIONS.find((d) => d.key === dimKey)!

  // Use live groups if loaded and non-empty, else static fallback.
  const groups: FairnessGroup[] = (() => {
    if (!live.loaded) return dim.staticGroups
    if (dimKey === 'ethnicity' && live.byEthnicity.length > 0) return live.byEthnicity
    if (dimKey === 'gender' && live.byGender.length > 0) return live.byGender
    if (dimKey === 'age' && live.byAge.length > 0) return live.byAge
    return dim.staticGroups
  })()

  const skew = maxSkew(groups, mode)
  const tripped = skew >= ALERT_THRESHOLD

  return (
    <section className="rounded-xl border border-[#d7e5ec] bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e7f6f0] text-[#12805c]">
            <Activity size={18} />
          </span>
          <div>
            <h3 className="m-0 text-sm font-bold text-[#102033]">Before / after debiasing</h3>
            <p className="m-0 text-[11px] font-semibold text-[#53687b]">
              UC6 · Fairness · NIST AI RMF (Harmful Bias) — outcome allocation by group
              {live.loaded && ` · ${live.totalAppointments} appointments live`}
            </p>
          </div>
        </div>
        <DemoTag label={live.loaded ? 'Live · ven04690' : 'Simulated · demo'} />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-[#cbdde6] p-0.5">
          {DIMENSIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDimKey(d.key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-bold',
                d.key === dimKey ? 'bg-[#143A57] text-white' : 'text-[#53687b] hover:bg-slate-50',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-[#cbdde6] p-0.5">
          {(['biased', 'debiased'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-bold capitalize',
                m === mode ? 'bg-[#0397AE] text-white' : 'text-[#53687b] hover:bg-slate-50',
              )}
            >
              {m === 'biased' ? 'Before' : 'After'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {groups.map((g) => {
          const value = g[mode]
          const delta = value - g.expected
          const off = Math.abs(delta) >= ALERT_THRESHOLD
          return (
            <div key={g.group}>
              <div className="mb-1 flex justify-between text-xs font-semibold">
                <span className="text-[#102033]">{g.group}</span>
                <span className={off ? 'text-[#a22828]' : 'text-[#53687b]'}>
                  {value}% <span className="text-[10px]">(exp {g.expected}% · {delta > 0 ? '+' : ''}{delta})</span>
                </span>
              </div>
              <div className="h-3 rounded-full bg-[#eef3f7]">
                <div
                  className={cn('h-3 rounded-full', off ? 'bg-[#e07a5f]' : 'bg-[#0397AE]')}
                  style={{ width: `${Math.min(value * 1.8, 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {live.loaded && live.biasRiskStatements.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {live.biasRiskStatements.map((name) => (
            <span key={name} className="rounded-full bg-[#e7f0f8] px-2 py-0.5 text-[10px] font-semibold text-[#143A57]">
              {name}
            </span>
          ))}
          <span className="rounded-full bg-[#f0f4f8] px-2 py-0.5 text-[10px] font-semibold text-[#53687b]">
            {live.fairnessMetricCount} fairness metrics
          </span>
        </div>
      )}

      <div
        className={cn(
          'mt-4 flex items-center gap-2 rounded-lg border p-3 text-xs font-semibold',
          tripped
            ? 'border-[#f3a19c] bg-[#fff4f3] text-[#a22828]'
            : 'border-[#a7dfbf] bg-[#f0fbf5] text-[#0f6b4f]',
        )}
      >
        {tripped ? <Siren size={16} /> : <ShieldCheck size={16} />}
        {tripped ? (
          <span>
            Skew alert — {dim.label.toLowerCase()} outcomes deviate up to {skew}pp from expected (p &lt; 0.05). Fairness
            control fired.
          </span>
        ) : (
          <span>Within tolerance — max deviation {skew}pp. Outcomes balanced after debiasing.</span>
        )}
      </div>
    </section>
  )
}
