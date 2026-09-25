/**
 * The log sheet is drawn as printed paper: it keeps these fixed colors in dark mode and in print.
 * Pre-printed form elements use ink; values filled in by the "driver" use pen blue.
 */
export const PAPER = {
  background: '#ffffff',
  ink: '#111827',
  muted: '#4b5563',
  faint: '#9ca3af',
  rule: '#6b7280',
  band: '#111827',
  pen: '#1d4ed8',
  penStroke: '#1e3a8a',
} as const

export const FONT = {
  caption: 10,
  label: 12,
  value: 14,
} as const
