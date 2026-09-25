import { Truck } from 'lucide-react'

const RULES = ['Property-carrying', '70 hr / 8 days', 'No adverse conditions']

export function AppHeader() {
  return (
    <header className="bg-brand text-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-brand">
            <Truck className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight">ELD Trip Planner</p>
            <p className="text-xs text-white/60">Hours-of-service routes & daily logs</p>
          </div>
        </div>
        <ul className="ml-auto hidden gap-2 md:flex" aria-label="Assumed rules">
          {RULES.map((rule) => (
            <li
              key={rule}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75"
            >
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}
