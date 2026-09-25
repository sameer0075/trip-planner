import {
  BedDouble,
  ClipboardCheck,
  Coffee,
  Flag,
  Fuel,
  MoonStar,
  Package,
  RotateCcw,
  Truck,
  type LucideIcon,
} from 'lucide-react'

import type { Activity } from '@/api/types'

export interface ActivityMeta {
  label: string
  icon: LucideIcon
  color: string
}

export const ACTIVITY_META: Record<Activity, ActivityMeta> = {
  off_duty: { label: 'Off duty', icon: MoonStar, color: 'var(--color-duty-off)' },
  pre_trip: { label: 'Pre-trip inspection', icon: ClipboardCheck, color: 'var(--color-duty-on)' },
  driving: { label: 'Driving', icon: Truck, color: 'var(--color-duty-driving)' },
  pickup: { label: 'Pickup', icon: Package, color: '#059669' },
  dropoff: { label: 'Drop-off', icon: Flag, color: '#e11d48' },
  fuel: { label: 'Fuel stop', icon: Fuel, color: '#d97706' },
  break: { label: '30-minute break', icon: Coffee, color: '#64748b' },
  rest: { label: '10-hour rest', icon: BedDouble, color: 'var(--color-duty-sleeper)' },
  restart: { label: '34-hour restart', icon: RotateCcw, color: '#db2777' },
  post_trip: { label: 'Post-trip inspection', icon: ClipboardCheck, color: 'var(--color-duty-on)' },
}
