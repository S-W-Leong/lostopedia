'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api'
import { MapContainer } from './MapContainer'
import type { MapBounds, MapMarker } from '@/lib/map-items'
import { MapItemPopup } from './MapItemPopup'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface ItemsMapProps {
  items: MapMarker[]
  center?: { lat: number; lng: number }
  zoom?: number
  className?: string
  onMapLoad?: (map: google.maps.Map) => void
  onBoundsChange?: (bounds: MapBounds) => void
}

interface MarkerData {
  item: MapMarker
  position: { lat: number; lng: number }
}

const FALLBACK_THEME_COLORS = {
  lost: '#B93846',
  found: '#0F7A57',
  accent: '#2457D6',
  accentForeground: '#F8FBFF',
}

function readThemeColors() {
  if (typeof window === 'undefined') return FALLBACK_THEME_COLORS

  const styles = getComputedStyle(document.documentElement)
  return {
    lost: styles.getPropertyValue('--color-lost').trim() || FALLBACK_THEME_COLORS.lost,
    found: styles.getPropertyValue('--color-found').trim() || FALLBACK_THEME_COLORS.found,
    accent: styles.getPropertyValue('--accent-primary').trim() || FALLBACK_THEME_COLORS.accent,
    accentForeground:
      styles.getPropertyValue('--accent-foreground').trim() || FALLBACK_THEME_COLORS.accentForeground,
  }
}

export function ItemsMap({
  items,
  center,
  zoom,
  className,
  onMapLoad,
  onBoundsChange,
}: ItemsMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedItem = items.find(item => item.id === selectedId) ?? null
  const mapRef = useRef<google.maps.Map | null>(null)
  const [themeColors, setThemeColors] = useState(FALLBACK_THEME_COLORS)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncThemeColors = () => setThemeColors(readThemeColors())
    syncThemeColors()

    const observer = new MutationObserver(syncThemeColors)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    })

    return () => observer.disconnect()
  }, [])

  // Prepare markers data from items with geo locations
  const markersData = useMemo<MarkerData[]>(() => {
    return items
      .filter((item) => Number.isFinite(item.geoLocation?.latitude) && Number.isFinite(item.geoLocation?.longitude))
      .map((item) => ({
        item,
        position: {
          lat: item.geoLocation!.latitude,
          lng: item.geoLocation!.longitude,
        },
      }))
  }, [items])

  // Custom marker icon based on item type
  const getMarkerIcon = useCallback((type: 'lost' | 'found'): google.maps.Symbol => {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: type === 'lost' ? themeColors.lost : themeColors.found,
      fillOpacity: 0.9,
      strokeColor: themeColors.accentForeground,
      strokeWeight: 2,
    }
  }, [themeColors])

  // Cluster options
  const clusterOptions = useMemo(() => {
    return {
      minimumClusterSize: 2,
      maxZoom: 16,
      averageCenter: true,
      zoomOnClick: true,
      styles: [
        {
          textColor: 'white',
          textSize: 14,
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">
              <circle cx="25" cy="25" r="22" fill="${themeColors.accent}" opacity="0.9" stroke="${themeColors.accentForeground}" stroke-width="3"/>
            </svg>
          `),
          height: 50,
          width: 50,
        },
      ],
    }
  }, [themeColors])

  const handleBoundsChanged = useCallback(() => {
    const bounds = mapRef.current?.getBounds()
    if (bounds) onBoundsChange?.(bounds.toJSON())
  }, [onBoundsChange])

  const handleMapLoad = useCallback((mapInstance: google.maps.Map) => {
    mapRef.current = mapInstance
    onMapLoad?.(mapInstance)
    const bounds = mapInstance.getBounds()
    if (bounds) onBoundsChange?.(bounds.toJSON())
  }, [onMapLoad, onBoundsChange])

  const handleMarkerClick = useCallback((markerData: MarkerData) => {
    setSelectedId(markerData.item.id)
  }, [])

  const handleInfoWindowClose = useCallback(() => {
    setSelectedId(null)
  }, [])

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      onLoad={handleMapLoad}
      onBoundsChanged={handleBoundsChanged}
    >
      {/* Marker Clustering */}
      <MarkerClusterer options={clusterOptions}>
        {(clusterer) => (
          <>
            {markersData.map(({ item, position }) => (
              <Marker
                key={item.id}
                position={position}
                icon={getMarkerIcon(item.type)}
                onClick={() => handleMarkerClick({ item, position })}
                clusterer={clusterer}
                title={item.title}
              />
            ))}
          </>
        )}
      </MarkerClusterer>

      {/* Info Window for selected item */}
      {selectedItem && (
        <InfoWindow
          position={{
            lat: selectedItem.geoLocation!.latitude,
            lng: selectedItem.geoLocation!.longitude,
          }}
          onCloseClick={handleInfoWindowClose}
        >
          <div className="p-2 max-w-xs">
            {/* Badge */}
            <div className="mb-2">
              <Badge
                variant={selectedItem.type === 'lost' ? 'destructive' : 'default'}
                className={
                  selectedItem.type === 'found'
                    ? 'border-found/20 bg-found text-found-foreground hover:bg-found/90'
                    : ''
                }
              >
                {selectedItem.type === 'lost' ? 'Lost' : 'Found'}
              </Badge>
            </div>

            {/* Title */}
            <h3 className="font-semibold text-base mb-1 line-clamp-2">
              {selectedItem.title}
            </h3>

            <MapItemPopup key={selectedItem.id} item={selectedItem} />

            {/* View Details Button */}
            <Link href={`/item/${selectedItem.id}`}>
              <Button size="sm" className="w-full">
                <ExternalLink className="h-3 w-3 mr-1" />
                View Details
              </Button>
            </Link>
          </div>
        </InfoWindow>
      )}
    </MapContainer>
  )
}
