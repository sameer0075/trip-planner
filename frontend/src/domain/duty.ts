import type { DutyStatus } from '@/api/types'

export interface DutyStatusMeta {
  status: DutyStatus
  /** Row label on the paper log grid, one entry per printed line. */
  gridLabel: readonly string[]
  label: string
  /** CSS color token, shared by the log grid, itinerary and map. */
  color: string
}

/** The four graph-grid lines, in the order they appear on a Record of Duty Status. */
export const DUTY_STATUSES: readonly DutyStatusMeta[] = [
  {
    status: 'off_duty',
    gridLabel: ['1. Off Duty'],
    label: 'Off duty',
    color: 'var(--color-duty-off)',
  },
  {
    status: 'sleeper_berth',
    gridLabel: ['2. Sleeper', 'Berth'],
    label: 'Sleeper berth',
    color: 'var(--color-duty-sleeper)',
  },
  {
    status: 'driving',
    gridLabel: ['3. Driving'],
    label: 'Driving',
    color: 'var(--color-duty-driving)',
  },
  {
    status: 'on_duty',
    gridLabel: ['4. On Duty', '(not driving)'],
    label: 'On duty',
    color: 'var(--color-duty-on)',
  },
]

export const DUTY_STATUS_META = Object.fromEntries(
  DUTY_STATUSES.map((meta) => [meta.status, meta]),
) as Record<DutyStatus, DutyStatusMeta>

export const DUTY_ROW_INDEX = Object.fromEntries(
  DUTY_STATUSES.map((meta, index) => [meta.status, index]),
) as Record<DutyStatus, number>
