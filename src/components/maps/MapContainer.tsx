'use client'

import { GoogleMap } from '@react-google-maps/api'
import { useGoogleMaps } from '@/contexts/GoogleMapsContext'
import { DEFAULT_CAMPUS } from '@/lib/constants'

interface MapContainerProps {
  children?: React.ReactNode
  center?: { lat: number; lng: number }
  zoom?: number
  className?: string
  onClick?: (e: google.maps.MapMouseEvent) => void
  onLoad?: (map: google.maps.Map) => void
}

const defaultMapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
}

export function MapContainer({
  children,
  center = {
    lat: DEFAULT_CAMPUS.latitude,
    lng: DEFAULT_CAMPUS.longitude,
  },
  zoom = DEFAULT_CAMPUS.zoom,
  className = 'w-full h-full',
  onClick,
  onLoad,
}: MapContainerProps) {
  const { isLoaded, loadError } = useGoogleMaps()

  if (loadError) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <div className="text-center p-4">
          <p className="text-destructive font-medium">Error loading maps</p>
          <p className="text-sm text-muted-foreground mt-1">
            Please check your Google Maps API key
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <div className="text-center p-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerClassName={className}
      center={center}
      zoom={zoom}
      options={defaultMapOptions}
      onClick={onClick}
      onLoad={onLoad}
    >
      {children}
    </GoogleMap>
  )
}

