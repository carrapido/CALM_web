import { useEffect, useEffectEvent, useState } from 'react'

type Query<T> = {
  // undefined while loading the current key.
  data: T | undefined
  // Why the current key failed to load; undefined while it has not failed.
  error: unknown
  reload: () => void
}

type Loaded<T> = {
  key: string
  data: T
}

type Failed = {
  key: string
  error: unknown
}

// Loads data for `key` and reloads it on demand, e.g. after a change. Each result keeps
// its key, so a slow answer for a key the view already left is never shown for the new one.
export function useQuery<T>(key: string, load: () => Promise<T>): Query<T> {
  const [loaded, setLoaded] = useState<Loaded<T>>()
  const [failed, setFailed] = useState<Failed>()
  const [revision, setRevision] = useState(0)
  // https://react.dev/reference/react/useEffectEvent: reads the latest `load` without
  // making the effect rerun every render, since `load` is a new closure each time.
  const loadLatest = useEffectEvent(load)

  useEffect(() => {
    let isCurrentKey = true
    loadLatest().then(
      (data) => {
        if (!isCurrentKey) return
        setLoaded({ key, data })
        setFailed(undefined)
      },
      (error: unknown) => {
        if (isCurrentKey) setFailed({ key, error })
      },
    )
    return () => {
      isCurrentKey = false
    }
  }, [key, revision])

  return {
    data: loaded?.key === key ? loaded.data : undefined,
    error: failed?.key === key ? failed.error : undefined,
    reload: () => {
      setFailed(undefined)
      setRevision((current) => current + 1)
    },
  }
}
