import type { LogRemark } from '@/api/types'
import type { LogDetails } from '@/domain/logDetails'

import { GRID, GRID_BOTTOM, GRID_RIGHT, REMARKS, SHEET, minuteToX, spreadLabels } from '../geometry'
import { FONT, PAPER } from './paper'
import { TextLines } from './SvgText'
import { truncate, wrapText } from './text'

const LABEL_TOP = GRID_BOTTOM + REMARKS.leaderLength
/** Characters that fit along a vertical label between LABEL_TOP and the bottom of the section. */
const LABEL_CHARS = Math.floor((REMARKS.bottom - LABEL_TOP - 8) / 5.6)

interface RemarksSectionProps {
  remarks: readonly LogRemark[]
  details: LogDetails
}

export function RemarksSection({ remarks, details }: RemarksSectionProps) {
  const anchors = remarks.map((remark) => minuteToX(remark.minute))
  const positions = spreadLabels(anchors, REMARKS.labelGap, GRID.left + 4, GRID_RIGHT - 4)

  return (
    <g>
      <text x={SHEET.margin} y={REMARKS.top} fontSize={16} fontWeight={700} fill={PAPER.ink}>
        Remarks
      </text>
      <line
        x1={SHEET.margin}
        x2={SHEET.margin}
        y1={REMARKS.top + 12}
        y2={REMARKS.bottom}
        stroke={PAPER.ink}
        strokeWidth={3}
      />
      <line
        x1={SHEET.margin}
        x2={GRID_RIGHT + GRID.totalsWidth}
        y1={REMARKS.bottom}
        y2={REMARKS.bottom}
        stroke={PAPER.ink}
        strokeWidth={2}
      />

      {remarks.map((remark, index) => (
        <RemarkLabel
          key={index}
          remark={remark}
          anchorX={anchors[index]}
          labelX={positions[index]}
        />
      ))}

      <ShippingDocuments details={details} />

      <TextLines
        x={SHEET.width / 2}
        y={REMARKS.bottom + 20}
        lines={[
          'Enter name of place you reported and where released from work and when and where each change of duty occurred.',
          'Use time standard of home terminal.',
        ]}
        lineHeight={15}
        textAnchor="middle"
        fontSize={FONT.caption + 1}
        fill={PAPER.ink}
      />
    </g>
  )
}

function RemarkLabel({
  remark,
  anchorX,
  labelX,
}: {
  remark: LogRemark
  anchorX: number
  labelX: number
}) {
  // The place is what the regulations require; the activity gets whatever space is left.
  const location = truncate(remark.location, LABEL_CHARS)
  const room = LABEL_CHARS - location.length - 3
  const activity = room >= 6 ? truncate(remark.label, room) : ''
  return (
    <g>
      <polyline
        points={`${anchorX},${GRID_BOTTOM} ${anchorX},${GRID_BOTTOM + 8} ${labelX},${LABEL_TOP - 6}`}
        fill="none"
        stroke={PAPER.penStroke}
        strokeWidth={1}
      />
      <text
        transform={`rotate(90 ${labelX} ${LABEL_TOP})`}
        x={labelX}
        y={LABEL_TOP}
        dominantBaseline="central"
        fontSize={FONT.caption}
        fill={PAPER.pen}
      >
        <tspan fontWeight={700}>{location}</tspan>
        {activity && <tspan fill={PAPER.muted}>{` · ${activity}`}</tspan>}
      </text>
    </g>
  )
}

function ShippingDocuments({ details }: { details: LogDetails }) {
  const x = SHEET.margin + 12
  const width = GRID.left - x - 16
  const chars = Math.floor(width / 6)
  return (
    <g>
      <TextLines
        x={x}
        y={REMARKS.bottom - 150}
        lines={['Shipping', 'Documents:']}
        lineHeight={15}
        fontSize={FONT.label + 1}
        fontWeight={700}
        fill={PAPER.ink}
      />
      <ShippingField
        x={x}
        y={REMARKS.bottom - 88}
        width={width}
        lines={wrapText(details.shippingDocument, chars, 2)}
      >
        DVL or Manifest No.
      </ShippingField>
      <ShippingField
        x={x}
        y={REMARKS.bottom - 28}
        width={width}
        lines={wrapText(details.shipperCommodity, chars, 2)}
      >
        Shipper &amp; Commodity
      </ShippingField>
    </g>
  )
}

interface ShippingFieldProps {
  x: number
  y: number
  width: number
  lines: string[]
  children: string
}

function ShippingField({ x, y, width, lines, children }: ShippingFieldProps) {
  return (
    <g>
      <TextLines
        x={x}
        y={y - 6 - (lines.length - 1) * 12}
        lines={lines}
        fontSize={FONT.caption}
        fontWeight={600}
        fill={PAPER.pen}
      />
      <line x1={x} x2={x + width} y1={y} y2={y} stroke={PAPER.ink} />
      <text x={x} y={y + 13} fontSize={FONT.caption} fontWeight={600} fill={PAPER.ink}>
        {children}
      </text>
    </g>
  )
}
