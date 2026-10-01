'use client'

import { useEffect, useState } from 'react'
import { Marker } from '@react-google-maps/api'
import { MapContainer } from './MapContainer'
import type { GeoLocation } from '@/types'

interface MiniMapProps {
  location: GeoLocation
  type?: 'lost' | 'found'
  className?: string
}

const FALLBACK_THEME_COLORS = {
  lost: '#B93846',
  found: '#0F7A57',
  accentForeground: '#F8FBFF',
}

export function MiniMap({ location, type = 'lost', className = 'w-full h-64' }: MiniMapProps) {
  const [themeColors, setThemeColors] = useState(FALLBACK_THEME_COLORS)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncThemeColors = () => {
      const styles = getComputedStyle(document.documentElement)
      setThemeColors({
        lost: styles.getPropertyValue('--color-lost').trim() || FALLBACK_THEME_COLORS.lost,
        found: styles.getPropertyValue('--color-found').trim() || FALLBACK_THEME_COLORS.found,
        accentForeground:
          styles.getPropertyValue('--accent-foreground').trim() || FALLBACK_THEME_COLORS.accentForeground,
      })
    }

    syncThemeColors()
    const observer = new MutationObserver(syncThemeColors)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    })

    return () => observer.disconnect()
  }, [])

  const center = {
    lat: location.latitude,
    lng: location.longitude,
  }

  const markerIcon: google.maps.Symbol | undefined = typeof google === 'undefined' ? undefined : {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 10,
    fillColor: type === 'lost' ? themeColors.lost : themeColors.found,
    fillOpacity: 0.9,
    strokeColor: themeColors.accentForeground,
    strokeWeight: 2,
  }

  return (
    <MapContainer center={center} zoom={16} className={className}>
      <Marker position={center} icon={markerIcon} />
    </MapContainer>
  )
}
