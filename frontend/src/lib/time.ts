/**
 * Trip times are ISO-8601 strings carrying the home terminal's UTC offset. They are displayed
 * by their wall-clock fields, never converted into the viewer's time zone, because logs must use
 * the home terminal's time standard.
 */

export interface WallClock {
  /** YYYY-MM-DD */
  date: string
  hour: number
  minute: number
}

const ISO_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/

export function wallClock(iso: string): WallClock {
  const match = ISO_PATTERN.exec(iso)
  if (!match) throw new Error(`Not an ISO-8601 date-time: ${iso}`)
  return { date: match[1], hour: Number(match[2]), minute: Number(match[3]) }
}

/** 0-1440 minutes after midnight as "8:05 AM". */
export function formatMinuteOfDay(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60) % 24
  const minute = minuteOfDay % 60
  const suffix = hour < 12 ? 'AM' : 'PM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`
}

export function formatClock(iso: string): string {
  const { hour, minute } = wallClock(iso)
  return formatMinuteOfDay(hour * 60 + minute)
}

const DAY_FORMATS = {
  short: { weekday: 'short', month: 'short', day: 'numeric' },
  long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
} satisfies Record<string, Intl.DateTimeFormatOptions>

/** "2026-09-25" as "Fri, Sep 25" (short) or "Friday, September 25, 2026" (long). */
export function formatDay(date: string, style: keyof typeof DAY_FORMATS = 'short'): string {
  const [year, month, day] = date.split('-').map(Number)
  // Format a UTC instant in UTC so the calendar date can never shift.
  return new Intl.DateTimeFormat('en-US', { ...DAY_FORMATS[style], timeZone: 'UTC' }).format(
    Date.UTC(year, month - 1, day),
  )
}

export function formatDateTime(iso: string): string {
  return `${formatDay(wallClock(iso).date)} · ${formatClock(iso)}`
}

/** The UTC offset of an ISO string as "UTC−05:00". */
export function formatUtcOffset(iso: string): string {
  const offset = /([+-]\d{2}:\d{2}|Z)$/.exec(iso)?.[1] ?? 'Z'
  return offset === 'Z' ? 'UTC' : `UTC${offset.replace('-', '−')}`
}

/** Value for an <input type="datetime-local">: `now` rounded up to the next quarter hour. */
export function nextQuarterHour(now: Date = new Date()): string {
  const rounded = new Date(now)
  rounded.setSeconds(0, 0)
  rounded.setMinutes(Math.ceil((rounded.getMinutes() + 1) / 15) * 15)
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${rounded.getFullYear()}-${pad(rounded.getMonth() + 1)}-${pad(rounded.getDate())}` +
    `T${pad(rounded.getHours())}:${pad(rounded.getMinutes())}`
  )
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}
