import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-white shadow-sm hover:bg-primary-strong disabled:bg-primary/60 dark:text-white',
  secondary:
    'border border-line-strong bg-surface text-ink shadow-sm hover:bg-surface-muted disabled:text-ink-subtle',
  ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink disabled:text-ink-subtle',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-xs',
  md: 'h-10 gap-2 rounded-lg px-3.5 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-5 text-[15px]',
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : Icon && <Icon className="size-4" aria-hidden />}
      {children}
    </button>
  )
}
