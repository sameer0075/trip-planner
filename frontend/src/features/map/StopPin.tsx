import { PIN_SIZE, STOP_KIND_META, type StopKind } from './stops'

export function StopPin({ kind }: { kind: StopKind }) {
  const { icon: Icon, color } = STOP_KIND_META[kind]
  return (
    <svg width={PIN_SIZE.width} height={PIN_SIZE.height} viewBox="0 0 34 44" aria-hidden>
      <path
        d="M17 43c-1-1.6-15-15.4-15-26a15 15 0 0 1 30 0c0 10.6-14 24.4-15 26z"
        style={{ fill: color }}
        stroke="#fff"
        strokeWidth={2}
      />
      <Icon x={8} y={8} width={18} height={18} color="#fff" strokeWidth={2.25} />
    </svg>
  )
}
