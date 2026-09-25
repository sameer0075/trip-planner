import { apiRequest } from './client'
import type { Place, PlaceSuggestion, TripPlan, TripPlanRequest } from './types'

export function planTrip(request: TripPlanRequest): Promise<TripPlan> {
  return apiRequest<TripPlan>('/trips/plan/', { method: 'POST', body: request })
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const { results } = await apiRequest<{ results: PlaceSuggestion[] }>('/places/search/', {
    query: { q: query },
    signal,
  })
  return results
}

export function reverseGeocode(lat: number, lng: number): Promise<Place> {
  return apiRequest<Place>('/places/reverse/', { query: { lat, lng } })
}
