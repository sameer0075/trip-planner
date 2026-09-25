import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'

import { tabId, tabPanelId } from './tabIds'

export interface TabItem<T extends string> {
  id: T
  label: string
  icon?: LucideIcon
  badge?: string | number
}

interface TabsProps<T extends string> {
  tabs: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  idPrefix: string
}

/** WAI-ARIA tabs with roving focus (arrow keys, Home, End). Panels are rendered by the caller. */
export function Tabs<T extends string>({ tabs, value, onChange, label, idPrefix }: TabsProps<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement>())

  function handleKeyDown(event: KeyboardEvent) {
    const index = tabs.findIndex((tab) => tab.id === value)
    const next = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    onChange(tabs[next].id)
    refs.current.get(tabs[next].id)?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="flex gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1 ring-1 ring-line"
    >
      {tabs.map(({ id, label: tabLabel, icon: Icon, badge }) => {
        const selected = id === value
        return (
          <button
            key={id}
            ref={(node) => {
              if (node) refs.current.set(id, node)
              else refs.current.delete(id)
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, id)}
            aria-selected={selected}
            aria-controls={tabPanelId(idPrefix, id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            className={clsx(
              'flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition',
              selected
                ? 'bg-surface text-ink shadow-sm ring-1 ring-line'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {tabLabel}
            {badge !== undefined && (
              <span
                className={clsx(
                  'rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                  selected ? 'bg-primary-soft text-primary' : 'bg-line text-ink-muted',
                )}
              >
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
