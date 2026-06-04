import { useEffect, useState } from 'react'
import {
  fetchUnmanagedAIStewardSystems,
  type SnowAISystem,
} from '../services/serviceNow'

export type FetchState = 'loading' | 'error' | 'empty' | 'ok'

export function useUnmanagedAISystems() {
  const [systems, setSystems] = useState<SnowAISystem[]>([])
  const [state, setState] = useState<FetchState>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setState('loading')

    fetchUnmanagedAIStewardSystems()
      .then((data) => {
        if (cancelled) return
        setSystems(data)
        setState(data.length === 0 ? 'empty' : 'ok')
      })
      .catch((e: Error) => {
        if (cancelled) return
        setErrorMsg(e.message)
        setState('error')
      })

    return () => { cancelled = true }
  }, [])

  return { systems, state, errorMsg }
}
