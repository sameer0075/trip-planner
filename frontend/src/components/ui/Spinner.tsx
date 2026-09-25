import clsx from 'clsx'
import { LoaderCircle } from 'lucide-react'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={clsx('animate-spin', className)} aria-hidden />
}
