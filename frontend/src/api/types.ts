/** Wire types for the Django API. Durations are minutes, distances are miles. */

export type DutyStatus = 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty'

export type Activity =
  | 'off_duty'
  | 'pre_trip'
  | 'driving'
  | 'pickup'
  | 'dropoff'
  | 'fuel'
  | 'break'
  | 'rest'
  | 'restart'
  | 'post_trip'

/** A location as entered: picked from search results (with coordinates) or typed free text. */
export interface LocationInput {
  label: string
  lat?: number
  lng?: number
}

export interface TripPlanRequest {
  current_location: LocationInput
  pickup_location: LocationInput
  dropoff_location: LocationInput
  current_cycle_used: number
  /** Wall-clock start, e.g. "2026-09-25T08:00", read in `timezone`. */
  start_time: string
  timezone: string
}

export interface Place {
  label: string
  lat: number
  lng: number
}

export interface PlaceSuggestion extends Place {
  name: string
  context: string
}

export interface Waypoint {
  name: string
  lat: number
  lng: number
}

export interface DutyEvent {
  status: DutyStatus
  activity: Activity
  label: string
  /** ISO-8601 with the trip's (home terminal) UTC offset. */
  start: string
  end: string
  duration_minutes: number
  start_mile: number
  end_mile: number
  location: Waypoint
}

export interface LogSegment {
  status: DutyStatus
  activity: Activity
  start_minute: number
  end_minute: number
}

export interface LogRemark {
  minute: number
  status: DutyStatus
  activity: Activity
  label: string
  location: string
}

export interface LogRecap {
  on_duty_today: number
  on_duty_last_7_days: number
  available_tomorrow: number
  on_duty_last_5_days: number
}

export interface DailyLog {
  date: string
  from: string
  to: string
  miles_driven: number
  segments: LogSegment[]
  remarks: LogRemark[]
  totals_minutes: Record<DutyStatus, number>
  recap: LogRecap
}

export interface RouteStep {
  instruction: string
  distance_miles: number
  duration_minutes: number
}

export interface RouteLeg {
  origin: string
  destination: string
  distance_miles: number
  duration_minutes: number
  steps: RouteStep[]
}

export interface TripSummary {
  start: string
  end: string
  total_minutes: number
  distance_miles: number
  driving_minutes: number
  on_duty_minutes: number
  off_duty_minutes: number
  fuel_stops: number
  breaks: number
  rests: number
  restarts: number
  log_days: number
  cycle_used_start_minutes: number
  cycle_available_end_minutes: number
}

export interface TripPlan {
  summary: TripSummary
  locations: { current: Place; pickup: Place; dropoff: Place }
  route: {
    distance_miles: number
    duration_minutes: number
    /** [lat, lng] pairs. */
    geometry: [number, number][]
    legs: RouteLeg[]
  }
  events: DutyEvent[]
  logs: DailyLog[]
}
