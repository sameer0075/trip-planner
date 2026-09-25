import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { searchPlaces } from '@/api/trips'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

/** Debounced location autocomplete; stale requests are cancelled as the user keeps typing. */
export function usePlaceSearch(query: string, enabled: boolean) {
  const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS)
  const active = enabled && debounced.length >= MIN_QUERY_LENGTH

  return useQuery({
    queryKey: ['places', debounced.toLowerCase()],
    queryFn: ({ signal }) => searchPlaces(debounced, signal),
    enabled: active,
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: false,
  })
}
