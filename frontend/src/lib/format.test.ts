import { describe, expect, it } from 'vitest'

import { formatDuration, formatHours, formatHoursMinutes, formatMiles, pluralize } from './format'

describe('formatDuration', () => {
  it.each([
    [0, '0m'],
    [45, '45m'],
    [60, '1h'],
    [346, '5h 46m'],
    [24 * 60, '1d'],
    [3 * 24 * 60 + 5 * 60 + 12, '3d 5h'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected)
  })

  it('can stop at hours', () => {
    expect(formatDuration(2247, 'hour')).toBe('37h 27m')
  })
})

describe('formatHoursMinutes', () => {
  it('formats clock-style totals', () => {
    expect(formatHoursMinutes(346)).toBe('5:46')
    expect(formatHoursMinutes(1440)).toBe('24:00')
    expect(formatHoursMinutes(5)).toBe('0:05')
  })
})

describe('formatHours', () => {
  it('drops trailing zeros', () => {
    expect(formatHours(498)).toBe('8.3')
    expect(formatHours(600)).toBe('10')
  })
})

describe('formatMiles', () => {
  it('uses thousands separators and a decimal only for short distances', () => {
    expect(formatMiles(2128.3)).toBe('2,128 mi')
    expect(formatMiles(3.25)).toBe('3.3 mi')
  })
})

describe('pluralize', () => {
  it('picks the right form', () => {
    expect(pluralize(1, 'rest')).toBe('1 rest')
    expect(pluralize(3, 'rest')).toBe('3 rests')
  })
})
