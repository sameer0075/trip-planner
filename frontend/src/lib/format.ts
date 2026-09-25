const MINUTES_PER_DAY = 24 * 60

/** Human duration: "45m", "5h 46m", "2d 3h" (or "51h" when `largestUnit` is "hour"). */
export function formatDuration(minutes: number, largestUnit: 'day' | 'hour' = 'day'): string {
  const total = Math.max(0, Math.round(minutes))
  const days = largestUnit === 'day' ? Math.floor(total / MINUTES_PER_DAY) : 0
  const hours = Math.floor((total - days * MINUTES_PER_DAY) / 60)
  const mins = total % 60

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  return `${mins}m`
}

/** Clock-style hours for log totals: 346 -> "5:46", 1440 -> "24:00". */
export function formatHoursMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Decimal hours: 498 -> "8.3". */
export function formatHours(minutes: number, fractionDigits = 1): string {
  return (minutes / 60).toFixed(fractionDigits).replace(/\.0+$/, '')
}

const milesFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const shortMilesFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

export function formatMiles(miles: number): string {
  return `${(miles < 10 ? shortMilesFormat : milesFormat).format(miles)} mi`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
