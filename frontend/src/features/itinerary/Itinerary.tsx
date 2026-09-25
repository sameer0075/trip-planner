import type { DutyEvent } from '@/api/types'
import { ACTIVITY_META } from '@/domain/activities'
import { DUTY_STATUS_META } from '@/domain/duty'
import { formatDuration, formatMiles } from '@/lib/format'
import { formatClock, formatDay, wallClock } from '@/lib/time'

interface ItineraryDay {
  date: string
  entries: { event: DutyEvent; destination?: string }[]
}

/** Groups events by the calendar day they start on, pairing each drive with where it ends. */
function groupByDay(events: readonly DutyEvent[]): ItineraryDay[] {
  const days: ItineraryDay[] = []
  events.forEach((event, index) => {
    const date = wallClock(event.start).date
    let day = days.at(-1)
    if (day?.date !== date) {
      day = { date, entries: [] }
      days.push(day)
    }
    const destination = event.status === 'driving' ? events[index + 1]?.location.name : undefined
    day.entries.push({ event, destination })
  })
  return days
}

export function Itinerary({ events }: { events: readonly DutyEvent[] }) {
  return (
    <div className="space-y-6">
      {groupByDay(events).map((day, dayIndex) => (
        <section key={day.date} aria-labelledby={`itinerary-${day.date}`}>
          <h3
            id={`itinerary-${day.date}`}
            className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase"
          >
            Day {dayIndex + 1} · {formatDay(day.date)}
          </h3>
          <ol className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-[5.25rem] before:w-px before:bg-line">
            {day.entries.map(({ event, destination }) => (
              <ItineraryEntry key={event.start} event={event} destination={destination} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

function ItineraryEntry({ event, destination }: { event: DutyEvent; destination?: string }) {
  const { icon: Icon, label } = ACTIVITY_META[event.activity]
  const status = DUTY_STATUS_META[event.status]
  const isDriving = event.status === 'driving'

  return (
    <li className="relative flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-surface-muted">
      <time
        dateTime={event.start}
        className="w-[4.25rem] shrink-0 pt-1.5 text-right text-xs font-medium text-ink-muted tabular-nums"
      >
        {formatClock(event.start)}
      </time>
      <span
        className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-white ring-4 ring-surface"
        style={{ background: status.color }}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm font-semibold text-ink">
            {isDriving && destination ? `Drive to ${destination}` : label}
          </p>
          <p className="text-xs text-ink-muted tabular-nums">
            {formatDuration(event.duration_minutes)}
            {isDriving && ` · ${formatMiles(event.end_mile - event.start_mile)}`}
          </p>
        </div>
        <p className="truncate text-xs text-ink-muted">
          <span className="font-medium" style={{ color: status.color }}>
            {status.label}
          </span>
          {' · '}
          {isDriving ? `From ${event.location.name}` : event.location.name}
          {' · until '}
          {formatClock(event.end)}
        </p>
      </div>
    </li>
  )
}
