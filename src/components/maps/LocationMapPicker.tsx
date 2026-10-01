'use client'

import { useCallback, useMemo, useState } from 'react'
import { Marker } from '@react-google-maps/api'
import { MapContainer } from './MapContainer'
import { DEFAULT_CAMPUS } from '@/lib/constants'
import { loadGoogleMaps } from '@/lib/google-maps-loader'

interface LocationMapPickerProps {
  /** Current location text (for display only) */
  locationText?: string
  /** Current coordinates to show marker and center map */
  latitude?: number
  longitude?: number
  /** Called when user selects a point on the map (address from reverse geocode, lat, lng) */
  onLocationChange: (locationText: string, lat: number, lng: number) => void
  /** Optional label or hint above the map */
  hint?: string
  className?: string
}

export function LocationMapPicker({
  latitude,
  longitude,
  onLocationChange,
  hint = 'Click on the map to set the location',
  className = 'w-full h-64 overflow-hidden rounded-lg border border-border',
}: LocationMapPickerProps) {
  const [isGeocoding, setIsGeocoding] = useState(false)

  const center = useMemo(() => {
    if (latitude != null && longitude != null) {
      return { lat: latitude, lng: longitude }
    }
    return { lat: DEFAULT_CAMPUS.latitude, lng: DEFAULT_CAMPUS.longitude }
  }, [latitude, longitude])

  const hasMarker = latitude != null && longitude != null
  const markerPosition = hasMarker ? { lat: latitude, lng: longitude } : undefined

  const handleMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      const latLng = e.latLng
      if (!latLng) return

      const lat = latLng.lat()
      const lng = latLng.lng()
      setIsGeocoding(true)

      const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      try {
        await loadGoogleMaps('geocoding')
        const { results } = await new google.maps.Geocoder().geocode({ location: { lat, lng } })
        onLocationChange(results[0]?.formatted_address ?? fallback, lat, lng)
      } catch {
        onLocationChange(fallback, lat, lng)
      } finally {
        setIsGeocoding(false)
      }
    },
    [onLocationChange]
  )

  return (
    <div className="space-y-2">
      {hint && (
        <p className="text-sm text-muted-foreground">{hint}</p>
      )}
      <div className="relative">
        <MapContainer
          center={center}
          zoom={hasMarker ? 17 : DEFAULT_CAMPUS.zoom}
          className={className}
          onClick={handleMapClick}
        >
          {markerPosition && <Marker position={markerPosition} />}
        </MapContainer>
        {isGeocoding && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/10">
            <span className="rounded bg-bg-elevated/90 px-3 py-1.5 text-sm font-medium text-text-primary shadow-sm">
              Getting address...
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
