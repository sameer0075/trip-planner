import { useMutation } from '@tanstack/react-query'
import { RotateCcw, Route } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'

import { ApiError, describeFieldErrors } from '@/api/client'
import { planTrip } from '@/api/trips'
import { AppHeader } from '@/components/layout/AppHeader'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EMPTY_LOG_DETAILS } from '@/domain/logDetails'
import { PrintableLogs } from '@/features/logs/PrintableLogs'
import { stopsFromEvents, stopsFromLocations } from '@/features/map/stops'
import {
  initialTripForm,
  toTripPlanRequest,
  type TripFormValues,
} from '@/features/planner/formModel'
import { TripForm } from '@/features/planner/TripForm'
import { EmptyState } from '@/features/results/EmptyState'
import { ResultsSkeleton } from '@/features/results/ResultsSkeleton'
import { TripResults } from '@/features/results/TripResults'
import { useLocalStorage } from '@/hooks/useLocalStorage'

// Leaflet is the largest dependency; load it in parallel with the rest of the page.
const RouteMap = lazy(() =>
  import('@/features/map/RouteMap').then(({ RouteMap }) => ({ default: RouteMap })),
)

export function App() {
  const [form, setForm] = useState<TripFormValues>(initialTripForm)
  const [logDetails, setLogDetails] = useLocalStorage(
    'eld-trip-planner:log-details',
    EMPTY_LOG_DETAILS,
  )
  const plan = useMutation({ mutationFn: planTrip })

  const stops = useMemo(
    () =>
      plan.data
        ? stopsFromEvents(plan.data.events)
        : stopsFromLocations([
            ['start', form.current],
            ['pickup', form.pickup],
            ['dropoff', form.dropoff],
          ]),
    [plan.data, form],
  )

  return (
    <>
      <div className="min-h-svh print:hidden">
        <AppHeader />
        <main className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card className="p-5">
              <CardHeader
                icon={Route}
                title="Plan a trip"
                description="We'll route it and fill out the logs."
                className="mb-5"
              />
              <TripForm
                values={form}
                onChange={setForm}
                logDetails={logDetails}
                onLogDetailsChange={setLogDetails}
                onSubmit={(values) => plan.mutate(toTripPlanRequest(values))}
                isPlanning={plan.isPending}
              />
            </Card>
          </aside>

          <div className="min-w-0 space-y-5">
            {plan.isError && (
              <PlanError error={plan.error} onRetry={() => plan.mutate(plan.variables)} />
            )}
            <Card className="overflow-hidden">
              <div className="h-[320px] sm:h-[420px] xl:h-[460px]">
                <Suspense fallback={<Skeleton className="h-full rounded-none" />}>
                  <RouteMap route={plan.data?.route.geometry} stops={stops} />
                </Suspense>
              </div>
            </Card>
            {plan.isPending ? (
              <ResultsSkeleton />
            ) : plan.data ? (
              // Remount on every new plan so tabs and the selected day start fresh.
              <TripResults key={plan.submittedAt} plan={plan.data} logDetails={logDetails} />
            ) : (
              <EmptyState />
            )}
          </div>
        </main>
      </div>
      {plan.data && <PrintableLogs logs={plan.data.logs} details={logDetails} />}
    </>
  )
}

function PlanError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const apiError = error instanceof ApiError ? error : undefined
  const retryable = !apiError || apiError.status === 0 || apiError.status >= 500
  const fieldErrors = describeFieldErrors(apiError?.details)

  return (
    <Alert
      tone="error"
      title={apiError?.message ?? 'Something went wrong while planning the trip.'}
      action={
        retryable && (
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {fieldErrors.length > 0 && (
        <ul className="list-disc pl-4">
          {fieldErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </Alert>
  )
}
