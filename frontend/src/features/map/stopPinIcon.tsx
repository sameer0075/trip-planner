import { divIcon, type DivIcon } from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'

import { PIN_SIZE, type StopKind } from './stops'
import { StopPin } from './StopPin'

const cache = new Map<StopKind, DivIcon>()

/** Leaflet marker icons are plain HTML, so each pin is rendered to markup once and reused. */
export function stopPinIcon(kind: StopKind): DivIcon {
  let icon = cache.get(kind)
  if (!icon) {
    icon = divIcon({
      className: 'stop-pin',
      html: renderToStaticMarkup(<StopPin kind={kind} />),
      iconSize: [PIN_SIZE.width, PIN_SIZE.height],
      iconAnchor: [PIN_SIZE.width / 2, PIN_SIZE.height - 1],
      popupAnchor: [0, -PIN_SIZE.height + 6],
    })
    cache.set(kind, icon)
  }
  return icon
}
