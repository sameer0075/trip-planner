import { Navigation, type LucideIcon } from 'lucide-react'

import type { DutyEvent, LocationInput } from '@/api/types'
import { ACTIVITY_META } from '@/domain/activities'

export type StopKind = 'start' | 'pickup' | 'dropoff' | 'fuel' | 'break' | 'rest' | 'restart'

export interface Stop {
  id: string
  kind: StopKind
  name: string
  lat: number
  lng: number
  /** The non-driving duty events spent at this stop, in order (empty for previews). */
  events: DutyEvent[]
}

export const STOP_KIND_META: Record<StopKind, { label: string; icon: LucideIcon; color: string }> =
  {
    start: { label: 'Start', icon: Navigation, color: '#0891b2' },
    pickup: ACTIVITY_META.pickup,
    dropoff: ACTIVITY_META.dropoff,
    fuel: ACTIVITY_META.fuel,
    break: ACTIVITY_META.break,
    rest: ACTIVITY_META.rest,
    restart: ACTIVITY_META.restart,
  }

/** Marker pin dimensions, in CSS pixels. */
export const PIN_SIZE = { width: 34, height: 44 } as const

/** When several activities happen at one stop, the marker shows the most significant. */
const KIND_PRIORITY: readonly Exclude<StopKind, 'start'>[] = [
  'dropoff',
  'pickup',
  'restart',
  'rest',
  'fuel',
  'break',
]

/**
 * Groups each run of consecutive non-driving events into one stop on the map, e.g. a 10-hour
 * rest followed by the next morning's pre-trip inspection.
 */
export function stopsFromEvents(events: readonly DutyEvent[]): Stop[] {
  const groups: DutyEvent[][] = []
  let current: DutyEvent[] = []
  for (const event of events) {
    if (event.status === 'driving') {
      if (current.length) groups.push(current)
      current = []
    } else {
      current.push(event)
    }
  }
  if (current.length) groups.push(current)

  return groups.map((group) => {
    const { location, start } = group[0]
    const activities = new Set(group.map((event) => event.activity))
    return {
      id: start,
      kind: KIND_PRIORITY.find((kind) => activities.has(kind)) ?? 'start',
      name: location.name,
      lat: location.lat,
      lng: location.lng,
      events: group,
    }
  })
}

/** Markers for locations picked in the form, shown before a trip is planned. */
export function stopsFromLocations(
  entries: readonly (readonly [StopKind, LocationInput])[],
): Stop[] {
  return entries.flatMap(([kind, { label, lat, lng }]) =>
    lat === undefined || lng === undefined
      ? []
      : [{ id: `preview-${kind}`, kind, name: label, lat, lng, events: [] }],
  )
}
