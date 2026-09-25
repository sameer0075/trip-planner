import {
  CalendarClock,
  Flag,
  LocateFixed,
  Navigation,
  Package,
  Route,
  Sparkles,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import type { LogDetails } from '@/domain/logDetails'

import { CycleField } from './CycleField'
import {
  LOCATION_FIELDS,
  sampleTripForm,
  validateTripForm,
  type TripFormErrors,
  type TripFormValues,
} from './formModel'
import { LocationField } from './LocationField'
import { LogDetailsFields } from './LogDetailsFields'
import { useCurrentLocation } from './useCurrentLocation'

const LOCATION_ICONS = { current: Navigation, pickup: Package, dropoff: Flag } as const

interface TripFormProps {
  values: TripFormValues
  onChange: (values: TripFormValues) => void
  logDetails: LogDetails
  onLogDetailsChange: (details: LogDetails) => void
  onSubmit: (values: TripFormValues) => void
  isPlanning: boolean
}

export function TripForm({
  values,
  onChange,
  logDetails,
  onLogDetailsChange,
  onSubmit,
  isPlanning,
}: TripFormProps) {
  // Errors appear after the first submit attempt, then update as the user fixes them.
  const [showErrors, setShowErrors] = useState(false)
  const errors: TripFormErrors = showErrors ? validateTripForm(values) : {}
  const locate = useCurrentLocation((current) => onChange({ ...values, current }))

  function update<K extends keyof TripFormValues>(key: K, value: TripFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setShowErrors(true)
    if (Object.keys(validateTripForm(values)).length === 0) onSubmit(values)
  }

  const locateButton = (
    <button
      type="button"
      onClick={() => locate.mutate()}
      disabled={locate.isPending}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-60"
    >
      <LocateFixed className="size-3.5" aria-hidden />
      {locate.isPending ? 'Locating…' : 'Use my location'}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="space-y-4">
        {LOCATION_FIELDS.map(({ key, label, placeholder }) => (
          <LocationField
            key={key}
            id={`location-${key}`}
            label={label}
            placeholder={placeholder}
            icon={LOCATION_ICONS[key]}
            value={values[key]}
            onChange={(location) => update(key, location)}
            error={
              errors[key] ??
              (key === 'current' && locate.isError ? 'Could not get your location.' : undefined)
            }
            aside={key === 'current' ? locateButton : undefined}
          />
        ))}
      </div>

      <CycleField
        value={values.cycleUsed}
        onChange={(cycleUsed) => update('cycleUsed', cycleUsed)}
        error={errors.cycleUsed}
      />

      <Field
        label="Trip start"
        htmlFor="start-time"
        error={errors.startTime}
        hint="Logs use this device's time zone as the home terminal time."
      >
        <Input
          id="start-time"
          type="datetime-local"
          icon={CalendarClock}
          value={values.startTime}
          invalid={Boolean(errors.startTime)}
          onChange={(event) => update('startTime', event.target.value)}
        />
      </Field>

      <LogDetailsFields value={logDetails} onChange={onLogDetailsChange} />

      <div className="space-y-2.5 pt-1">
        <Button type="submit" size="lg" icon={Route} loading={isPlanning} className="w-full">
          {isPlanning ? 'Planning trip…' : 'Plan trip'}
        </Button>
        <Button
          variant="ghost"
          icon={Sparkles}
          className="w-full"
          disabled={isPlanning}
          onClick={() => {
            setShowErrors(false)
            onChange(sampleTripForm())
          }}
        >
          Fill in a sample trip
        </Button>
      </div>
    </form>
  )
}
