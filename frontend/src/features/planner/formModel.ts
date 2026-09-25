import type { LocationInput, TripPlanRequest } from '@/api/types'
import { browserTimeZone, nextQuarterHour } from '@/lib/time'

export const MAX_CYCLE_HOURS = 70

export type LocationKey = 'current' | 'pickup' | 'dropoff'

export interface TripFormValues {
  current: LocationInput
  pickup: LocationInput
  dropoff: LocationInput
  /** Kept as text so the field can be cleared while typing. */
  cycleUsed: string
  /** datetime-local value, e.g. "2026-09-25T08:00". */
  startTime: string
}

export type TripFormErrors = Partial<Record<keyof TripFormValues, string>>

const EMPTY_LOCATION: LocationInput = { label: '' }

export function initialTripForm(): TripFormValues {
  return {
    current: EMPTY_LOCATION,
    pickup: EMPTY_LOCATION,
    dropoff: EMPTY_LOCATION,
    cycleUsed: '0',
    startTime: nextQuarterHour(),
  }
}

export const LOCATION_FIELDS: readonly { key: LocationKey; label: string; placeholder: string }[] =
  [
    { key: 'current', label: 'Current location', placeholder: 'Where is the truck now?' },
    { key: 'pickup', label: 'Pickup location', placeholder: 'Shipper city or address' },
    { key: 'dropoff', label: 'Drop-off location', placeholder: 'Receiver city or address' },
  ]

export function hasCoordinates(location: LocationInput): boolean {
  return location.lat !== undefined && location.lng !== undefined
}

export function validateTripForm(values: TripFormValues): TripFormErrors {
  const errors: TripFormErrors = {}
  for (const { key, label } of LOCATION_FIELDS) {
    if (!values[key].label.trim()) errors[key] = `${label} is required.`
  }

  const cycle = Number(values.cycleUsed)
  if (values.cycleUsed.trim() === '' || Number.isNaN(cycle)) {
    errors.cycleUsed = 'Enter the hours already used in the current cycle.'
  } else if (cycle < 0 || cycle > MAX_CYCLE_HOURS) {
    errors.cycleUsed = `Must be between 0 and ${MAX_CYCLE_HOURS} hours.`
  }

  if (!values.startTime) errors.startTime = 'Choose when the trip starts.'
  return errors
}

export function toTripPlanRequest(
  values: TripFormValues,
  timezone: string = browserTimeZone(),
): TripPlanRequest {
  const location = ({ label, lat, lng }: LocationInput): LocationInput =>
    lat !== undefined && lng !== undefined
      ? { label: label.trim(), lat, lng }
      : { label: label.trim() }
  return {
    current_location: location(values.current),
    pickup_location: location(values.pickup),
    dropoff_location: location(values.dropoff),
    current_cycle_used: Number(values.cycleUsed),
    start_time: values.startTime,
    timezone,
  }
}

/** A realistic long-haul example so reviewers can try the planner with one click. */
export function sampleTripForm(): TripFormValues {
  return {
    current: { label: 'Chicago, IL', lat: 41.8755616, lng: -87.6244212 },
    pickup: { label: 'St. Louis, MO', lat: 38.6280278, lng: -90.1910154 },
    dropoff: { label: 'Los Angeles, CA', lat: 34.0536909, lng: -118.242766 },
    cycleUsed: '20',
    startTime: nextQuarterHour(),
  }
}
