import { FileText, MapPinned, ShieldCheck, type LucideIcon } from 'lucide-react'

const FEATURES: readonly { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: MapPinned,
    title: 'Route & stops',
    text: 'Fuel every 1,000 miles, 30-minute breaks, 10-hour rests and 34-hour restarts, placed on the map.',
  },
  {
    icon: ShieldCheck,
    title: 'HOS compliant',
    text: 'Property-carrying rules: 11-hour driving, 14-hour window and the 70-hour / 8-day cycle.',
  },
  {
    icon: FileText,
    title: 'Daily log sheets',
    text: 'A filled-in Record of Duty Status for every day of the trip, ready to print.',
  },
]

export function EmptyState() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {FEATURES.map(({ icon: Icon, title, text }) => (
        <div key={title} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm text-ink-muted">{text}</p>
        </div>
      ))}
    </div>
  )
}
