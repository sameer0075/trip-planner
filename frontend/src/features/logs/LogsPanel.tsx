import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { useState } from 'react'

import type { DailyLog } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { DUTY_STATUSES } from '@/domain/duty'
import type { LogDetails } from '@/domain/logDetails'
import { formatHoursMinutes, formatMiles } from '@/lib/format'
import { formatDay } from '@/lib/time'

import { LogSheet } from './LogSheet'

interface LogsPanelProps {
  logs: readonly DailyLog[]
  details: LogDetails
}

export function LogsPanel({ logs, details }: LogsPanelProps) {
  const [index, setIndex] = useState(0)
  const log = logs[Math.min(index, logs.length - 1)]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Log day">
          {logs.map((entry, entryIndex) => (
            <button
              key={entry.date}
              type="button"
              onClick={() => setIndex(entryIndex)}
              aria-pressed={entry === log}
              className={clsx(
                'shrink-0 rounded-lg border px-3 py-1.5 text-left transition',
                entry === log
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              <span className="block text-[11px] font-semibold uppercase">
                Day {entryIndex + 1}
              </span>
              <span className="block text-xs whitespace-nowrap">{formatDay(entry.date)}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            icon={ChevronLeft}
            aria-label="Previous day"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          />
          <Button
            variant="secondary"
            size="sm"
            icon={ChevronRight}
            aria-label="Next day"
            disabled={index >= logs.length - 1}
            onClick={() => setIndex(index + 1)}
          />
          <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-surface-muted px-4 py-3 text-xs">
        <div className="flex gap-1.5">
          <dt className="text-ink-muted">Route</dt>
          <dd className="font-medium text-ink">
            {log.from} → {log.to}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ink-muted">Driven</dt>
          <dd className="font-medium text-ink tabular-nums">{formatMiles(log.miles_driven)}</dd>
        </div>
        {DUTY_STATUSES.map(({ status, label, color }) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
            <dt className="text-ink-muted">{label}</dt>
            <dd className="font-medium text-ink tabular-nums">
              {formatHoursMinutes(log.totals_minutes[status])}
            </dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[760px]">
          <LogSheet log={log} details={details} />
        </div>
      </div>
    </div>
  )
}
