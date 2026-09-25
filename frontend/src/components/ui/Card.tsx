import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={clsx('rounded-2xl border border-line bg-surface shadow-card', className)}
      {...props}
    />
  )
}

interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  className?: string
}

export function CardHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: CardHeaderProps) {
  return (
    <header className={clsx('flex flex-wrap items-center gap-3', className)}>
      {Icon && (
        <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-[18px]" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
