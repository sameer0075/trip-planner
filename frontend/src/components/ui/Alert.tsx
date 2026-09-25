import clsx from 'clsx'
import { Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

type Tone = 'error' | 'info'

const TONES: Record<Tone, { icon: typeof Info; className: string }> = {
  error: { icon: TriangleAlert, className: 'border-danger/30 bg-danger-soft text-danger' },
  info: { icon: Info, className: 'border-primary/25 bg-primary-soft text-primary' },
}

interface AlertProps {
  tone?: Tone
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
}

export function Alert({ tone = 'info', title, children, action }: AlertProps) {
  const { icon: Icon, className } = TONES[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx('flex gap-3 rounded-xl border p-4', className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {children && <div className="text-sm text-ink-muted">{children}</div>}
      </div>
      {action}
    </div>
  )
}
