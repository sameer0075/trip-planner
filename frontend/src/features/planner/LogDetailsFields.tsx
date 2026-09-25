import { ChevronDown, NotebookPen } from 'lucide-react'

import { Input } from '@/components/ui/Field'
import { LOG_DETAIL_FIELDS, type LogDetails } from '@/domain/logDetails'

interface LogDetailsFieldsProps {
  value: LogDetails
  onChange: (value: LogDetails) => void
}

/** Optional header fields printed on every log sheet; remembered on this device. */
export function LogDetailsFields({ value, onChange }: LogDetailsFieldsProps) {
  const filled = LOG_DETAIL_FIELDS.filter(({ key }) => value[key].trim()).length

  return (
    <details className="group rounded-xl border border-line bg-surface-muted">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3.5 py-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
        <NotebookPen className="size-4 text-ink-subtle" aria-hidden />
        <span className="flex-1">Log sheet details</span>
        <span className="text-xs font-normal text-ink-muted">
          {filled ? `${filled} of ${LOG_DETAIL_FIELDS.length} filled` : 'Optional'}
        </span>
        <ChevronDown
          className="size-4 text-ink-subtle transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="grid gap-3 border-t border-line px-3.5 pt-3 pb-4">
        {LOG_DETAIL_FIELDS.map(({ key, label, placeholder }) => (
          <label key={key} className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">{label}</span>
            <Input
              value={value[key]}
              placeholder={placeholder}
              maxLength={80}
              onChange={(event) => onChange({ ...value, [key]: event.target.value })}
              className="h-9"
            />
          </label>
        ))}
        <p className="text-xs text-ink-subtle">Saved in this browser for your next trip.</p>
      </div>
    </details>
  )
}
