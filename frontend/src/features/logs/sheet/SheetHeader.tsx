import type { DailyLog } from '@/api/types'
import type { LogDetails } from '@/domain/logDetails'
import { formatMiles } from '@/lib/format'

import { SHEET } from '../geometry'
import { FONT, PAPER } from './paper'
import { FilledLine, TextLines } from './SvgText'
import { truncate, wrapText } from './text'

const LEFT = SHEET.margin
const RIGHT = SHEET.width - SHEET.margin
const RIGHT_COLUMN = 470

interface SheetHeaderProps {
  log: DailyLog
  details: LogDetails
}

export function SheetHeader({ log, details }: SheetHeaderProps) {
  const [year, month, day] = log.date.split('-')
  const miles = formatMiles(log.miles_driven)

  return (
    <g>
      <text x={LEFT} y={62} fontSize={28} fontWeight={700} fill={PAPER.ink}>
        Drivers Daily Log
      </text>
      <text x={LEFT + 60} y={80} fontSize={FONT.caption} fill={PAPER.muted}>
        (24 hours)
      </text>

      <FilledLine x={340} y={62} width={70} value={month} caption="(month)" />
      <text x={418} y={60} fontSize={18} fill={PAPER.ink}>
        /
      </text>
      <FilledLine x={432} y={62} width={70} value={day} caption="(day)" />
      <text x={510} y={60} fontSize={18} fill={PAPER.ink}>
        /
      </text>
      <FilledLine x={524} y={62} width={90} value={year} caption="(year)" />

      <TextLines
        x={660}
        y={50}
        lines={[
          'Original - File at home terminal.',
          'Duplicate - Driver retains in his/her possession for 8 days.',
        ]}
        lineHeight={15}
        fontSize={FONT.caption + 1}
        fill={PAPER.ink}
      />

      <HeaderLine label="From:" x={LEFT} width={410} value={log.from} />
      <HeaderLine
        label="To:"
        x={RIGHT_COLUMN + 60}
        width={RIGHT - RIGHT_COLUMN - 60}
        value={log.to}
      />

      <ValueBox x={LEFT} y={150} width={185} value={miles} caption="Total Miles Driving Today" />
      <ValueBox x={LEFT + 200} y={150} width={185} value={miles} caption="Total Mileage Today" />
      <ValueBox
        x={LEFT}
        y={210}
        width={385}
        value={details.vehicleNumbers}
        caption="Truck/Tractor and Trailer Numbers or"
        captionLine2="License Plate(s)/State (show each unit)"
      />

      <FilledLine
        x={RIGHT_COLUMN + 60}
        y={170}
        width={RIGHT - RIGHT_COLUMN - 60}
        value={truncate(details.carrierName, 60)}
        caption="Name of Carrier or Carriers"
      />
      <FilledLine
        x={RIGHT_COLUMN + 60}
        y={215}
        width={RIGHT - RIGHT_COLUMN - 60}
        value={truncate(details.mainOfficeAddress, 60)}
        caption="Main Office Address"
      />
      <FilledLine
        x={RIGHT_COLUMN + 60}
        y={260}
        width={RIGHT - RIGHT_COLUMN - 60}
        value={truncate(details.homeTerminalAddress, 60)}
        caption="Home Terminal Address"
      />
    </g>
  )
}

function HeaderLine({
  label,
  x,
  width,
  value,
}: {
  label: string
  x: number
  width: number
  value: string
}) {
  return (
    <g>
      <text x={x} y={118} fontSize={FONT.label + 1} fontWeight={600} fill={PAPER.ink}>
        {label}
      </text>
      <text x={x + 52} y={116} fontSize={FONT.value} fontWeight={600} fill={PAPER.pen}>
        {truncate(value, Math.floor(width / 8))}
      </text>
      <line x1={x + 46} x2={x + width} y1={122} y2={122} stroke={PAPER.ink} />
    </g>
  )
}

interface ValueBoxProps {
  x: number
  y: number
  width: number
  value: string
  caption: string
  captionLine2?: string
}

function ValueBox({ x, y, width, value, caption, captionLine2 }: ValueBoxProps) {
  const height = 40
  const lines = wrapText(value, Math.floor(width / 8), 2)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="none" stroke={PAPER.ink} />
      <TextLines
        x={x + width / 2}
        y={y + (lines.length > 1 ? 17 : 25)}
        lines={lines}
        lineHeight={15}
        textAnchor="middle"
        fontSize={FONT.value}
        fontWeight={600}
        fill={PAPER.pen}
      />
      <TextLines
        x={x + width / 2}
        y={y + height + 14}
        lines={captionLine2 ? [caption, captionLine2] : [caption]}
        textAnchor="middle"
        fontSize={FONT.caption}
        fill={PAPER.muted}
      />
    </g>
  )
}
