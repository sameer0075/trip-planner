import type { SVGProps } from 'react'

import { FONT, PAPER } from './paper'

interface TextLinesProps extends Omit<SVGProps<SVGTextElement>, 'x' | 'y'> {
  x: number
  y: number
  lines: readonly string[]
  lineHeight?: number
}

/** Multi-line SVG text; `y` is the baseline of the first line. */
export function TextLines({ x, y, lines, lineHeight = 12, ...props }: TextLinesProps) {
  return (
    <text x={x} y={y} {...props}>
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

interface FilledLineProps {
  x: number
  y: number
  width: number
  value?: string
  caption?: string
  align?: 'start' | 'middle'
}

/** A pre-printed rule with the filled-in value above it and its caption below. */
export function FilledLine({ x, y, width, value, caption, align = 'middle' }: FilledLineProps) {
  const textX = align === 'middle' ? x + width / 2 : x + 4
  return (
    <g>
      {value && (
        <text
          x={textX}
          y={y - 6}
          textAnchor={align}
          fontSize={FONT.value}
          fontWeight={600}
          fill={PAPER.pen}
        >
          {value}
        </text>
      )}
      <line x1={x} x2={x + width} y1={y} y2={y} stroke={PAPER.ink} strokeWidth={1} />
      {caption && (
        <text
          x={x + width / 2}
          y={y + 14}
          textAnchor="middle"
          fontSize={FONT.caption}
          fill={PAPER.muted}
        >
          {caption}
        </text>
      )}
    </g>
  )
}
