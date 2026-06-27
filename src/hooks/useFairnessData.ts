import { useEffect, useState } from 'react'
import { fetchFairnessData, type FairnessData } from '../services/serviceNow'
import type { FairnessGroup } from '../data/useCaseDemoData'

export type { FairnessData }

export interface LiveFairnessGroups {
  byEthnicity: FairnessGroup[]
  byGender: FairnessGroup[]
  byAge: FairnessGroup[]
  skewAlert: boolean
  maxSkewPp: number
  totalAppointments: number
  biasRiskStatements: string[]
  fairnessMetricCount: number
  loaded: boolean
}

/** Convert a live FairnessGroupItem to the FairnessGroup shape used by FairnessDebiasDemo.
 *
 * "biased" = live data from the instance.
 * "debiased" = expected ± 1pp (deterministic, demonstrates correction without fabricating data).
 */
function toFairnessGroup(item: {
  group: string
  pct: number
  expected: number
}): FairnessGroup {
  const debiasedPct = Math.round(item.expected + (item.pct > item.expected ? 1 : -1))
  return {
    group: item.group.charAt(0).toUpperCase() + item.group.slice(1),
    biased: Math.round(item.pct),
    debiased: debiasedPct,
    expected: Math.round(item.expected),
  }
}

export function useFairnessData(): LiveFairnessGroups {
  const [data, setData] = useState<FairnessData | null>(null)

  useEffect(() => {
    fetchFairnessData()
      .then(setData)
      .catch(() => {/* keep null — component uses static fallback */})
  }, [])

  if (!data) {
    return {
      byEthnicity: [],
      byGender: [],
      byAge: [],
      skewAlert: false,
      maxSkewPp: 0,
      totalAppointments: 0,
      biasRiskStatements: [],
      fairnessMetricCount: 0,
      loaded: false,
    }
  }

  return {
    byEthnicity: data.by_ethnicity.map(toFairnessGroup),
    byGender: data.by_gender.map(toFairnessGroup),
    byAge: data.by_age.map(toFairnessGroup),
    skewAlert: data.skew_alert,
    maxSkewPp: data.max_skew_pp,
    totalAppointments: data.total_appointments,
    biasRiskStatements: data.bias_risk_statements,
    fairnessMetricCount: data.fairness_metric_count,
    loaded: true,
  }
}
