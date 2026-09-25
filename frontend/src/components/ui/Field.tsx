import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

interface FieldProps {
  label: ReactNode
  htmlFor: string
  hint?: ReactNode
  error?: string
  /** Extra content aligned with the label, e.g. a small action button. */
  aside?: ReactNode
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, aside, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="text-xs text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

interface InputProps extends ComponentProps<'input'> {
  icon?: LucideIcon
  invalid?: boolean
  /** Content rendered inside the right edge of the input (e.g. a status icon). */
  trailing?: ReactNode
}

export function Input({ icon: Icon, invalid, trailing, className, ...props }: InputProps) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
          aria-hidden
        />
      )}
      <input
        aria-invalid={invalid || undefined}
        className={clsx(
          'h-11 w-full rounded-xl border bg-surface text-sm text-ink shadow-xs transition outline-none placeholder:text-ink-subtle',
          'focus:border-primary focus:ring-4 focus:ring-primary/15',
          invalid ? 'border-danger' : 'border-line-strong',
          Icon ? 'pl-9' : 'pl-3',
          trailing ? 'pr-10' : 'pr-3',
          className,
        )}
        {...props}
      />
      {trailing && (
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
          {trailing}
        </div>
      )}
    </div>
  )
}
