import type { DailyLog } from '@/api/types'
import { DUTY_STATUSES } from '@/domain/duty'
import { formatHoursMinutes } from '@/lib/format'

import {
  GRID,
  GRID_BODY_TOP,
  GRID_BOTTOM,
  GRID_RIGHT,
  SHEET,
  buildDutyPath,
  hourLabel,
  minuteToX,
  quarterHourTicks,
  rowTopY,
} from '../geometry'
import { FONT, PAPER } from './paper'
import { TextLines } from './SvgText'

const TICK_LENGTH = { quarter: 0.28, half: 0.5 } as const
const BAND_LEFT = GRID.left - 30
const TOTALS_CENTER = GRID_RIGHT + GRID.totalsWidth / 2
const HOURS = Array.from({ length: 25 }, (_, hour) => hour)

export function DutyGrid({ log }: { log: DailyLog }) {
  const ticks = quarterHourTicks()
  const totalMinutes = Object.values(log.totals_minutes).reduce((sum, value) => sum + value, 0)

  return (
    <g>
      {/* Header band with hour labels */}
      <rect
        x={BAND_LEFT}
        y={GRID.top}
        width={GRID_RIGHT + GRID.totalsWidth - BAND_LEFT}
        height={GRID.headerHeight}
        fill={PAPER.band}
      />
      {HOURS.map((hour) => {
        const label = hourLabel(hour)
        const x = minuteToX(hour * 60)
        return label === 'Midnight' ? (
          <TextLines
            key={hour}
            x={x}
            y={GRID.top + 12}
            lines={['Mid-', 'night']}
            lineHeight={10}
            textAnchor="middle"
            fontSize={9}
            fontWeight={600}
            fill="#fff"
          />
        ) : (
          <text
            key={hour}
            x={x}
            y={GRID.top + 18}
            textAnchor="middle"
            fontSize={FONT.caption + 1}
            fontWeight={600}
            fill="#fff"
          >
            {label}
          </text>
        )
      })}
      <TextLines
        x={TOTALS_CENTER}
        y={GRID.top + 12}
        lines={['Total', 'Hours']}
        lineHeight={10}
        textAnchor="middle"
        fontSize={9}
        fontWeight={600}
        fill="#fff"
      />

      {/* Rows, labels and totals */}
      {DUTY_STATUSES.map(({ status, gridLabel }, row) => {
        const top = rowTopY(row)
        return (
          <g key={status}>
            <rect
              x={GRID.left}
              y={top}
              width={GRID.width}
              height={GRID.rowHeight}
              fill={row % 2 ? '#f8fafc' : PAPER.background}
              stroke={PAPER.rule}
            />
            <TextLines
              x={SHEET.margin}
              y={top + (gridLabel.length > 1 ? 15 : 22)}
              lines={gridLabel}
              fontSize={FONT.label}
              fontWeight={600}
              fill={PAPER.ink}
            />
            <text
              x={TOTALS_CENTER}
              y={top + GRID.rowHeight / 2 + 5}
              textAnchor="middle"
              fontSize={FONT.value}
              fontWeight={600}
              fill={PAPER.pen}
            >
              {formatHoursMinutes(log.totals_minutes[status])}
            </text>
            <line
              x1={GRID_RIGHT + 10}
              x2={GRID_RIGHT + GRID.totalsWidth - 6}
              y1={top + GRID.rowHeight - 6}
              y2={top + GRID.rowHeight - 6}
              stroke={PAPER.ink}
            />
          </g>
        )
      })}

      {/* Quarter-hour ticks hang from the top of every row; hour lines span the grid */}
      {ticks.map(({ x, kind }, index) =>
        kind === 'hour' ? (
          <line
            key={index}
            x1={x}
            x2={x}
            y1={GRID_BODY_TOP}
            y2={GRID_BOTTOM}
            stroke={PAPER.rule}
            strokeWidth={0.8}
          />
        ) : (
          DUTY_STATUSES.map((_, row) => (
            <line
              key={`${index}-${row}`}
              x1={x}
              x2={x}
              y1={rowTopY(row)}
              y2={rowTopY(row) + GRID.rowHeight * TICK_LENGTH[kind]}
              stroke={PAPER.faint}
              strokeWidth={0.8}
            />
          ))
        ),
      )}

      {/* The duty status line */}
      <path
        d={buildDutyPath(log.segments)}
        fill="none"
        stroke={PAPER.penStroke}
        strokeWidth={3}
        strokeLinecap="square"
      />

      {/* Grand total, which must always be 24 hours */}
      <text
        x={TOTALS_CENTER}
        y={GRID_BOTTOM + 22}
        textAnchor="middle"
        fontSize={FONT.value}
        fontWeight={700}
        fill={PAPER.pen}
      >
        {formatHoursMinutes(totalMinutes)}
      </text>
      {[GRID_BOTTOM + 28, GRID_BOTTOM + 31].map((y) => (
        <line
          key={y}
          x1={GRID_RIGHT + 10}
          x2={GRID_RIGHT + GRID.totalsWidth - 6}
          y1={y}
          y2={y}
          stroke={PAPER.ink}
        />
      ))}
    </g>
  )
}
