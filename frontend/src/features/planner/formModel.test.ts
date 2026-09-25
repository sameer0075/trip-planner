import { describe, expect, it } from 'vitest'

import {
  sampleTripForm,
  toTripPlanRequest,
  validateTripForm,
  type TripFormValues,
} from './formModel'

const valid = (): TripFormValues => ({ ...sampleTripForm(), startTime: '2026-09-25T08:00' })

describe('validateTripForm', () => {
  it('accepts a complete form', () => {
    expect(validateTripForm(valid())).toEqual({})
  })

  it('requires every location', () => {
    const errors = validateTripForm({ ...valid(), pickup: { label: '  ' } })

    expect(errors).toEqual({ pickup: 'Pickup location is required.' })
  })

  it.each([
    ['', 'Enter the hours already used in the current cycle.'],
    ['abc', 'Enter the hours already used in the current cycle.'],
    ['-1', 'Must be between 0 and 70 hours.'],
    ['70.5', 'Must be between 0 and 70 hours.'],
  ])('rejects cycle hours %j', (cycleUsed, message) => {
    expect(validateTripForm({ ...valid(), cycleUsed }).cycleUsed).toBe(message)
  })
})

describe('toTripPlanRequest', () => {
  it('sends coordinates for picked places and text for typed ones', () => {
    const request = toTripPlanRequest(
      { ...valid(), dropoff: { label: ' Dallas, TX ' }, cycleUsed: '12.5' },
      'America/Chicago',
    )

    expect(request).toEqual({
      current_location: { label: 'Chicago, IL', lat: 41.8755616, lng: -87.6244212 },
      pickup_location: { label: 'St. Louis, MO', lat: 38.6280278, lng: -90.1910154 },
      dropoff_location: { label: 'Dallas, TX' },
      current_cycle_used: 12.5,
      start_time: '2026-09-25T08:00',
      timezone: 'America/Chicago',
    })
  })
})
