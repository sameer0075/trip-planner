/**
 * Layout of the Record of Duty Status sheet, in SVG user units. Pure functions only, so the
 * drawing logic is unit-testable without rendering.
 */
import type { DutyStatus, LogSegment } from '@/api/types'
import { DUTY_ROW_INDEX } from '@/domain/duty'

export const MINUTES_PER_DAY = 24 * 60

export const SHEET = { width: 1100, height: 860, margin: 40 } as const

export const GRID = {
  left: 190,
  top: 300,
  width: 816, // 34 units per hour
  headerHeight: 28,
  rowHeight: 36,
  rows: 4,
  totalsWidth: 64,
} as const

export const GRID_BODY_TOP = GRID.top + GRID.headerHeight
export const GRID_BOTTOM = GRID_BODY_TOP + GRID.rows * GRID.rowHeight
export const GRID_RIGHT = GRID.left + GRID.width

export const REMARKS = {
  top: GRID_BOTTOM + 22,
  bottom: 700,
  /** Distance between the tick at the true time and the start of its label. */
  leaderLength: 30,
  /** Minimum horizontal distance between two label baselines (≈ font size + spacing). */
  labelGap: 12,
} as const

export function minuteToX(minute: number): number {
  return GRID.left + (minute / MINUTES_PER_DAY) * GRID.width
}

export function rowTopY(row: number): number {
  return GRID_BODY_TOP + row * GRID.rowHeight
}

export function statusY(status: DutyStatus): number {
  return rowTopY(DUTY_ROW_INDEX[status]) + GRID.rowHeight / 2
}

/**
 * The continuous duty line: horizontal runs on each status row joined by vertical risers at
 * every change of status, exactly as drawn by hand on a paper log.
 */
export function buildDutyPath(segments: readonly LogSegment[]): string {
  const commands: string[] = []
  let currentY: number | undefined
  for (const segment of segments) {
    const y = statusY(segment.status)
    if (currentY === undefined) commands.push(`M${fmt(minuteToX(segment.start_minute))} ${fmt(y)}`)
    else if (y !== currentY) commands.push(`V${fmt(y)}`)
    commands.push(`H${fmt(minuteToX(segment.end_minute))}`)
    currentY = y
  }
  return commands.join(' ')
}

export type TickKind = 'hour' | 'half' | 'quarter'

export interface Tick {
  x: number
  kind: TickKind
}

/** Every quarter-hour mark across the day, including both midnights. */
export function quarterHourTicks(): Tick[] {
  return Array.from({ length: 24 * 4 + 1 }, (_, index) => ({
    x: minuteToX(index * 15),
    kind: index % 4 === 0 ? 'hour' : index % 2 === 0 ? 'half' : 'quarter',
  }))
}

/** Label above each hour line: "Midnight", "1" ... "11", "Noon", "1" ... "11", "Midnight". */
export function hourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return 'Midnight'
  if (hour === 12) return 'Noon'
  return String(hour % 12)
}

/**
 * Spread label positions so neighbours stay at least `gap` apart while keeping each as close to
 * its anchor as possible and inside [min, max]. `anchors` must be sorted ascending.
 */
export function spreadLabels(anchors: readonly number[], gap: number, min: number, max: number) {
  const positions = anchors.map((anchor) => Math.min(Math.max(anchor, min), max))
  for (let i = 1; i < positions.length; i++) {
    positions[i] = Math.max(positions[i], positions[i - 1] + gap)
  }
  // Labels pushed past the right edge are pulled back, pushing their neighbours left.
  for (let i = positions.length - 1; i >= 0; i--) {
    const limit = i === positions.length - 1 ? max : positions[i + 1] - gap
    positions[i] = Math.min(positions[i], limit)
  }
  return positions
}

function fmt(value: number): string {
  return Number(value.toFixed(2)).toString()
}
