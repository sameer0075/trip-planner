import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'

export function ResultsSkeleton() {
  return (
    <div className="space-y-5" aria-busy>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center gap-3 text-sm text-ink-muted" role="status">
          <Spinner className="size-4 text-primary" />
          Routing, scheduling rest stops and drawing your logs…
        </div>
        <Skeleton className="mt-5 h-10" />
        <Skeleton className="mt-4 aspect-[1100/860] w-full" />
      </div>
    </div>
  )
}
