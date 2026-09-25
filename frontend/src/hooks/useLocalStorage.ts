import { useCallback, useState } from 'react'

/**
 * Object state persisted to localStorage. Stored values are merged over `initialValue`, so
 * fields added later get their defaults. Storage can be unavailable (private mode, blocked site
 * data), in which case the state silently lives in memory only.
 */
export function useLocalStorage<T extends object>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored === null ? initialValue : { ...initialValue, ...JSON.parse(stored) }
    } catch {
      return initialValue
    }
  })

  const update = useCallback(
    (next: T) => {
      setValue(next)
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Persisting is a convenience; the in-memory value is already updated.
      }
    },
    [key],
  )

  return [value, update] as const
}
