import clsx from 'clsx'
import { CircleCheck, MapPin, type LucideIcon } from 'lucide-react'
import { useState, type KeyboardEvent, type ReactNode } from 'react'

import type { LocationInput, PlaceSuggestion } from '@/api/types'
import { Field, Input } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'

import { hasCoordinates } from './formModel'
import { usePlaceSearch } from './usePlaceSearch'

interface LocationFieldProps {
  id: string
  label: string
  placeholder: string
  icon: LucideIcon
  value: LocationInput
  onChange: (value: LocationInput) => void
  error?: string
  aside?: ReactNode
}

/** Location autocomplete following the WAI-ARIA combobox pattern. */
export function LocationField({
  id,
  label,
  placeholder,
  icon,
  value,
  onChange,
  error,
  aside,
}: LocationFieldProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const selected = hasCoordinates(value)
  const search = usePlaceSearch(value.label, open && !selected)
  const suggestions = open && !selected ? (search.data ?? []) : []
  const listboxId = `${id}-listbox`
  const showNoMatches =
    open && !selected && search.isFetched && !search.isFetching && suggestions.length === 0

  function select(suggestion: PlaceSuggestion) {
    onChange({ label: suggestion.label, lat: suggestion.lat, lng: suggestion.lng })
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!suggestions.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((index) => (index + step + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      select(suggestions[activeIndex])
    }
  }

  const trailing = search.isFetching ? (
    <Spinner className="size-4 text-ink-subtle" />
  ) : selected ? (
    <CircleCheck className="size-4 text-success" aria-label="Location confirmed" />
  ) : null

  return (
    <Field label={label} htmlFor={id} error={error} aside={aside}>
      <div className="relative">
        <Input
          id={id}
          icon={icon}
          value={value.label}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          invalid={Boolean(error)}
          trailing={trailing}
          onChange={(event) => {
            onChange({ label: event.target.value })
            setOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
        />

        {(suggestions.length > 0 || showNoMatches) && (
          <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
            <ul id={listboxId} role="listbox" aria-label={`${label} suggestions`}>
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.label}-${suggestion.lat}`}
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  // Keep focus in the input so the click lands before blur closes the list.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(suggestion)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={clsx(
                    'flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm',
                    index === activeIndex && 'bg-primary-soft',
                  )}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{suggestion.name}</span>
                    {suggestion.context && (
                      <span className="block truncate text-xs text-ink-muted">
                        {suggestion.context}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {showNoMatches && (
              <p className="px-3 py-2.5 text-sm text-ink-muted">
                No matches yet. Try a city and state, like “Tulsa, OK”.
              </p>
            )}
          </div>
        )}
      </div>
    </Field>
  )
}
