import { CalendarDays, Clock, Gauge, MapPinned, Route, Truck, type LucideIcon } from 'lucide-react'

import type { TripSummary as Summary } from '@/api/types'
import { formatDuration, formatHours, formatMiles, pluralize } from '@/lib/format'
import { formatDateTime, formatUtcOffset } from '@/lib/time'

interface StatProps {
  icon: LucideIcon
  label: string
  value: string
  detail: string
}

function Stat({ icon: Icon, label, value, detail }: StatProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
        <Icon className="size-4 text-ink-subtle" aria-hidden />
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-xs text-ink-muted" title={detail}>
        {detail}
      </p>
    </div>
  )
}

export function TripSummary({ summary }: { summary: Summary }) {
  const stops = [
    pluralize(summary.fuel_stops, 'fuel stop'),
    pluralize(summary.breaks, 'break'),
    pluralize(summary.rests, 'rest'),
    ...(summary.restarts ? [pluralize(summary.restarts, 'restart')] : []),
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
      <Stat
        icon={Route}
        label="Distance"
        value={formatMiles(summary.distance_miles)}
        detail="Current → pickup → drop-off"
      />
      <Stat
        icon={Truck}
        label="Driving time"
        value={formatDuration(summary.driving_minutes, 'hour')}
        detail={`${formatDuration(summary.on_duty_minutes, 'hour')} on duty in total`}
      />
      <Stat
        icon={Clock}
        label="Trip duration"
        value={formatDuration(summary.total_minutes)}
        detail={`Arrive ${formatDateTime(summary.end)}`}
      />
      <Stat
        icon={MapPinned}
        label="Required stops"
        value={String(summary.fuel_stops + summary.breaks + summary.rests + summary.restarts)}
        detail={stops.join(' · ')}
      />
      <Stat
        icon={CalendarDays}
        label="Daily logs"
        value={pluralize(summary.log_days, 'sheet')}
        detail={`Times in ${formatUtcOffset(summary.start)}`}
      />
      <Stat
        icon={Gauge}
        label="Cycle left after trip"
        value={`${formatHours(summary.cycle_available_end_minutes)} h`}
        detail={`Started with ${formatHours(summary.cycle_used_start_minutes)} h used`}
      />
    </div>
  )
}
