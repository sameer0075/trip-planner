import { ChevronDown, CornerDownRight } from 'lucide-react'

import type { RouteLeg } from '@/api/types'
import { formatDuration, formatMiles } from '@/lib/format'

export function Directions({ legs }: { legs: readonly RouteLeg[] }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        Turn-by-turn directions from OpenStreetMap routing. Driving times on the logs follow these
        estimates; stops for breaks, rest and fuel are added by the HOS schedule.
      </p>
      {legs.map((leg, index) => (
        <details
          key={`${leg.origin}-${leg.destination}`}
          open={index === 0}
          className="group overflow-hidden rounded-xl border border-line"
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 bg-surface-muted px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {leg.origin} → {leg.destination}
              </span>
              <span className="text-xs text-ink-muted tabular-nums">
                {formatMiles(leg.distance_miles)} · {formatDuration(leg.duration_minutes)} ·{' '}
                {leg.steps.length} steps
              </span>
            </span>
            <ChevronDown
              className="size-4 text-ink-subtle transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          {leg.distance_miles === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-muted">
              Pickup is at the current location, so no driving is needed.
            </p>
          ) : (
            <ol className="max-h-[28rem] divide-y divide-line overflow-y-auto">
              {leg.steps.map((step, stepIndex) => (
                <li key={stepIndex} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <CornerDownRight className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
                  <span className="flex-1 text-ink">{step.instruction}</span>
                  {step.distance_miles > 0 && (
                    <span className="shrink-0 text-xs text-ink-muted tabular-nums">
                      {formatMiles(step.distance_miles)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </details>
      ))}
    </div>
  )
}
