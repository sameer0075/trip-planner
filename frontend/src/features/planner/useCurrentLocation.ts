import { useMutation } from '@tanstack/react-query'

import { reverseGeocode } from '@/api/trips'
import type { LocationInput } from '@/api/types'

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not available in this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 5 * 60 * 1000,
    })
  })
}

/** Resolves the browser's position to a named location for the "current location" field. */
export function useCurrentLocation(onLocated: (location: LocationInput) => void) {
  return useMutation({
    mutationFn: async (): Promise<LocationInput> => {
      const { coords } = await currentPosition()
      return reverseGeocode(coords.latitude, coords.longitude)
    },
    onSuccess: onLocated,
  })
}
