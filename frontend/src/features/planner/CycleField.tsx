import clsx from 'clsx'
import { Gauge } from 'lucide-react'

import { Field, Input } from '@/components/ui/Field'

import { MAX_CYCLE_HOURS } from './formModel'

interface CycleFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function CycleField({ value, onChange, error }: CycleFieldProps) {
  const hours = Math.min(Math.max(Number(value) || 0, 0), MAX_CYCLE_HOURS)
  const remaining = MAX_CYCLE_HOURS - hours
  const usedPercent = (hours / MAX_CYCLE_HOURS) * 100

  return (
    <Field
      label="Current cycle used"
      htmlFor="cycle-used"
      error={error}
      hint={`${remaining.toLocaleString('en-US', { maximumFractionDigits: 2 })} of ${MAX_CYCLE_HOURS} hours available (70-hour / 8-day rule)`}
    >
      <div className="flex items-center gap-3">
        <div className="w-28 shrink-0">
          <Input
            id="cycle-used"
            icon={Gauge}
            type="number"
            inputMode="decimal"
            min={0}
            max={MAX_CYCLE_HOURS}
            step={0.25}
            value={value}
            invalid={Boolean(error)}
            aria-describedby={error ? 'cycle-used-error' : 'cycle-used-hint'}
            onChange={(event) => onChange(event.target.value)}
            trailing={<span className="text-xs text-ink-subtle">hrs</span>}
          />
        </div>
        <input
          type="range"
          min={0}
          max={MAX_CYCLE_HOURS}
          step={0.5}
          value={hours}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Current cycle used, hours"
          className={clsx(
            'h-2 flex-1 cursor-pointer appearance-none rounded-full',
            '[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow',
            '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-primary',
          )}
          style={{
            background: `linear-gradient(to right, var(--color-primary) ${usedPercent}%, var(--color-line) ${usedPercent}%)`,
          }}
        />
      </div>
    </Field>
  )
}
