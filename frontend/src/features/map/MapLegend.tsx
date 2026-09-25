import { STOP_KIND_META, type StopKind } from './stops'

const ORDER = Object.keys(STOP_KIND_META) as StopKind[]

export function MapLegend({ kinds }: { kinds: readonly StopKind[] }) {
  const present = new Set(kinds)
  return (
    <ul className="absolute bottom-3 left-3 z-[500] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-x-3 gap-y-1 rounded-xl border border-line bg-surface/95 px-3 py-2 text-xs text-ink-muted shadow-card backdrop-blur">
      {ORDER.filter((kind) => present.has(kind)).map((kind) => {
        const { label, color } = STOP_KIND_META[kind]
        return (
          <li key={kind} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />
            {label}
          </li>
        )
      })}
    </ul>
  )
}
