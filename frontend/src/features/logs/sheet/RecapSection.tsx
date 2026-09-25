import type { LogRecap } from '@/api/types'
import { formatHoursMinutes } from '@/lib/format'

import { REMARKS, SHEET } from '../geometry'
import { FONT, PAPER } from './paper'
import { TextLines } from './SvgText'

const TOP = REMARKS.bottom + 62
const VALUE_Y = TOP + 22

const COLUMNS: readonly { key: keyof LogRecap; x: number; caption: string[] }[] = [
  { key: 'on_duty_today', x: 150, caption: ['On duty hours', 'today, Total', 'lines 3 & 4'] },
  {
    key: 'on_duty_last_7_days',
    x: 400,
    caption: ['A. Total hours', 'on duty last 7', 'days including today'],
  },
  {
    key: 'available_tomorrow',
    x: 560,
    caption: ['B. Total hours', 'available tomorrow', '70 hr. minus A*'],
  },
  {
    key: 'on_duty_last_5_days',
    x: 720,
    caption: ['C. Total hours', 'on duty last 5', 'days including today'],
  },
]

const COLUMN_WIDTH = 120

export function RecapSection({ recap }: { recap: LogRecap }) {
  return (
    <g>
      <line
        x1={SHEET.margin}
        x2={SHEET.width - SHEET.margin}
        y1={TOP - 22}
        y2={TOP - 22}
        stroke={PAPER.ink}
        strokeWidth={2}
      />
      <TextLines
        x={SHEET.margin}
        y={TOP}
        lines={['Recap:', 'Complete at', 'end of day']}
        lineHeight={13}
        fontSize={FONT.caption + 1}
        fontWeight={600}
        fill={PAPER.ink}
      />
      <TextLines
        x={290}
        y={TOP}
        lines={['70 Hour/', '8 Day', 'Drivers']}
        lineHeight={13}
        fontSize={FONT.caption + 1}
        fontWeight={600}
        fill={PAPER.ink}
      />

      {COLUMNS.map(({ key, x, caption }) => (
        <g key={key}>
          <text
            x={x + COLUMN_WIDTH / 2}
            y={VALUE_Y}
            textAnchor="middle"
            fontSize={FONT.value + 2}
            fontWeight={700}
            fill={PAPER.pen}
          >
            {formatHoursMinutes(recap[key])}
          </text>
          <line x1={x} x2={x + COLUMN_WIDTH} y1={VALUE_Y + 6} y2={VALUE_Y + 6} stroke={PAPER.ink} />
          <TextLines
            x={x}
            y={VALUE_Y + 20}
            lines={caption}
            fontSize={FONT.caption}
            fill={PAPER.muted}
          />
        </g>
      ))}

      <TextLines
        x={880}
        y={TOP}
        lines={[
          '*If you took 34',
          'consecutive hours off',
          'duty you have 60/70',
          'hours available',
        ]}
        lineHeight={13}
        fontSize={FONT.caption}
        fill={PAPER.muted}
      />
    </g>
  )
}
