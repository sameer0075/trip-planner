import { describe, expect, it } from 'vitest'

import type { LogSegment } from '@/api/types'

import {
  GRID,
  GRID_RIGHT,
  buildDutyPath,
  hourLabel,
  minuteToX,
  quarterHourTicks,
  spreadLabels,
  statusY,
} from './geometry'

const segment = (
  status: LogSegment['status'],
  start_minute: number,
  end_minute: number,
): LogSegment => ({ status, activity: 'driving', start_minute, end_minute })

describe('minuteToX', () => {
  it('maps the day onto the grid width', () => {
    expect(minuteToX(0)).toBe(GRID.left)
    expect(minuteToX(12 * 60)).toBe(GRID.left + GRID.width / 2)
    expect(minuteToX(24 * 60)).toBe(GRID_RIGHT)
  })
})

describe('buildDutyPath', () => {
  it('draws horizontal runs joined by vertical risers', () => {
    const path = buildDutyPath([
      segment('off_duty', 0, 480),
      segment('on_duty', 480, 495),
      segment('driving', 495, 1440),
    ])

    expect(path).toBe(
      [
        `M${GRID.left} ${statusY('off_duty')}`,
        `H${minuteToX(480)}`,
        `V${statusY('on_duty')}`,
        `H${minuteToX(495)}`,
        `V${statusY('driving')}`,
        `H${GRID_RIGHT}`,
      ].join(' '),
    )
  })

  it('does not add risers between segments on the same row', () => {
    const path = buildDutyPath([segment('on_duty', 0, 15), segment('on_duty', 15, 75)])

    expect(path).not.toContain('V')
  })

  it('returns an empty path without segments', () => {
    expect(buildDutyPath([])).toBe('')
  })
})

describe('quarterHourTicks', () => {
  it('marks every quarter hour with its kind', () => {
    const ticks = quarterHourTicks()

    expect(ticks).toHaveLength(97)
    expect(ticks.slice(0, 5).map((tick) => tick.kind)).toEqual([
      'hour',
      'quarter',
      'half',
      'quarter',
      'hour',
    ])
    expect(ticks.at(-1)?.x).toBe(GRID_RIGHT)
  })
})

describe('hourLabel', () => {
  it.each([
    [0, 'Midnight'],
    [1, '1'],
    [12, 'Noon'],
    [13, '1'],
    [23, '11'],
    [24, 'Midnight'],
  ])('labels hour %i as %s', (hour, label) => {
    expect(hourLabel(hour)).toBe(label)
  })
})

describe('spreadLabels', () => {
  it('keeps labels that already fit at their anchors', () => {
    expect(spreadLabels([10, 40, 80], 12, 0, 100)).toEqual([10, 40, 80])
  })

  it('pushes crowded labels apart to the right', () => {
    expect(spreadLabels([10, 12, 14], 12, 0, 100)).toEqual([10, 22, 34])
  })

  it('pulls labels back inside the right edge', () => {
    expect(spreadLabels([90, 95, 98], 12, 0, 100)).toEqual([76, 88, 100])
  })

  it('clamps anchors into range', () => {
    expect(spreadLabels([-5, 120], 12, 0, 100)).toEqual([0, 100])
  })
})
