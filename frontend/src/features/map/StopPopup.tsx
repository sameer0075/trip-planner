import { ACTIVITY_META } from '@/domain/activities'
import { formatDuration } from '@/lib/format'
import { formatDateTime } from '@/lib/time'

import { STOP_KIND_META, type Stop } from './stops'

export function StopPopup({ stop }: { stop: Stop }) {
  const meta = STOP_KIND_META[stop.kind]
  return (
    <div className="min-w-52 space-y-2">
      <div>
        <p
          className="text-[11px] font-semibold tracking-wide uppercase"
          style={{ color: meta.color }}
        >
          {meta.label}
        </p>
        <p className="text-sm font-semibold text-ink">{stop.name}</p>
      </div>
      {stop.events.length > 0 && (
        <ul className="space-y-1.5 border-t border-line pt-2">
          {stop.events.map((event) => (
            <li key={event.start} className="flex items-baseline justify-between gap-4">
              <span className="text-ink">{ACTIVITY_META[event.activity].label}</span>
              <span className="text-right text-xs whitespace-nowrap text-ink-muted tabular-nums">
                {formatDateTime(event.start)} · {formatDuration(event.duration_minutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
