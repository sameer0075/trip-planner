import { latLngBounds, type LatLngTuple } from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'

import { MapLegend } from './MapLegend'
import { stopPinIcon } from './stopPinIcon'
import { StopPopup } from './StopPopup'
import type { Stop } from './stops'

const CONTIGUOUS_US_CENTER: LatLngTuple = [39.5, -98.35]
// Free, keyless OpenStreetMap tiles; dark mode restyles them with a CSS filter (index.css).
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

interface RouteMapProps {
  /** The driving route as [lat, lng] pairs; omitted before a trip is planned. */
  route?: LatLngTuple[]
  stops: readonly Stop[]
}

export function RouteMap({ route, stops }: RouteMapProps) {
  return (
    <div className="relative isolate h-full w-full">
      <MapContainer
        center={CONTIGUOUS_US_CENTER}
        zoom={4}
        minZoom={3}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
        {route && (
          <>
            <Polyline
              positions={route}
              pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.85 }}
            />
            <Polyline positions={route} pathOptions={{ color: '#2563eb', weight: 5 }} />
          </>
        )}
        {stops.map((stop) => (
          <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={stopPinIcon(stop.kind)}>
            <Popup>
              <StopPopup stop={stop} />
            </Popup>
          </Marker>
        ))}
        <FitToContent route={route} stops={stops} />
      </MapContainer>
      {stops.length > 0 && <MapLegend kinds={stops.map((stop) => stop.kind)} />}
    </div>
  )
}

/** Frames the route (or the selected locations) whenever it changes. */
function FitToContent({ route, stops }: RouteMapProps) {
  const map = useMap()

  useEffect(() => {
    const points: LatLngTuple[] = route?.length ? route : stops.map((stop) => [stop.lat, stop.lng])
    if (points.length === 0) return
    if (points.length === 1) map.setView(points[0], 9)
    else map.fitBounds(latLngBounds(points), { padding: [48, 48], maxZoom: 12 })
  }, [map, route, stops])

  return null
}
