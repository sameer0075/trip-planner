import { describe, expect, it } from 'vitest'

import type { Activity, DutyEvent, DutyStatus } from '@/api/types'

import { stopsFromEvents } from './stops'

let clock = 0

function event(activity: Activity, status: DutyStatus, name: string): DutyEvent {
  clock += 1
  return {
    status,
    activity,
    label: activity,
    start: `2026-09-25T${String(clock).padStart(2, '0')}:00:00-05:00`,
    end: `2026-09-25T${String(clock + 1).padStart(2, '0')}:00:00-05:00`,
    duration_minutes: 60,
    start_mile: 0,
    end_mile: 0,
    location: { name, lat: 1, lng: 2 },
  }
}

describe('stopsFromEvents', () => {
  it('groups consecutive non-driving events and picks the most significant kind', () => {
    const stops = stopsFromEvents([
      event('pre_trip', 'on_duty', 'Chicago, IL'),
      event('driving', 'driving', 'Chicago, IL'),
      event('pickup', 'on_duty', 'St. Louis, MO'),
      event('driving', 'driving', 'St. Louis, MO'),
      event('rest', 'sleeper_berth', 'Tulsa, OK'),
      event('pre_trip', 'on_duty', 'Tulsa, OK'),
      event('driving', 'driving', 'Tulsa, OK'),
      event('dropoff', 'on_duty', 'Dallas, TX'),
      event('post_trip', 'on_duty', 'Dallas, TX'),
    ])

    expect(stops.map((stop) => [stop.kind, stop.name, stop.events.length])).toEqual([
      ['start', 'Chicago, IL', 1],
      ['pickup', 'St. Louis, MO', 1],
      ['rest', 'Tulsa, OK', 2],
      ['dropoff', 'Dallas, TX', 2],
    ])
  })

  it('treats pickup at the starting point as the pickup stop', () => {
    const stops = stopsFromEvents([
      event('pre_trip', 'on_duty', 'Joliet, IL'),
      event('pickup', 'on_duty', 'Joliet, IL'),
      event('driving', 'driving', 'Joliet, IL'),
    ])

    expect(stops.map((stop) => stop.kind)).toEqual(['pickup'])
  })

  it('returns no stops for no events', () => {
    expect(stopsFromEvents([])).toEqual([])
  })
})
