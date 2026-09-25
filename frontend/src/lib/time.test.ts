import { describe, expect, it } from 'vitest'

import {
  formatClock,
  formatDay,
  formatMinuteOfDay,
  formatUtcOffset,
  nextQuarterHour,
  wallClock,
} from './time'

describe('wallClock', () => {
  it('reads the home-terminal wall clock regardless of the viewer time zone', () => {
    expect(wallClock('2026-09-25T23:45:00-05:00')).toEqual({
      date: '2026-09-25',
      hour: 23,
      minute: 45,
    })
  })

  it('rejects malformed input', () => {
    expect(() => wallClock('yesterday')).toThrow('Not an ISO-8601')
  })
})

describe('formatting', () => {
  it.each([
    [0, '12:00 AM'],
    [8 * 60 + 5, '8:05 AM'],
    [12 * 60, '12:00 PM'],
    [23 * 60 + 59, '11:59 PM'],
    [24 * 60, '12:00 AM'],
  ])('formats minute %i as %s', (minute, expected) => {
    expect(formatMinuteOfDay(minute)).toBe(expected)
  })

  it('formats times and days from ISO strings', () => {
    expect(formatClock('2026-09-25T14:30:00-05:00')).toBe('2:30 PM')
    expect(formatDay('2026-09-25')).toBe('Fri, Sep 25')
    expect(formatDay('2026-09-25', 'long')).toBe('Friday, September 25, 2026')
  })

  it('labels UTC offsets', () => {
    expect(formatUtcOffset('2026-09-25T08:00:00-05:00')).toBe('UTC−05:00')
    expect(formatUtcOffset('2026-09-25T08:00:00+00:00')).toBe('UTC+00:00')
    expect(formatUtcOffset('2026-09-25T08:00:00Z')).toBe('UTC')
  })
})

describe('nextQuarterHour', () => {
  it.each([
    ['2026-09-25T08:00:30', '2026-09-25T08:15'],
    ['2026-09-25T08:14:00', '2026-09-25T08:15'],
    ['2026-09-25T23:50:00', '2026-09-26T00:00'],
  ])('rounds %s up to %s', (now, expected) => {
    expect(nextQuarterHour(new Date(now))).toBe(expected)
  })
})
