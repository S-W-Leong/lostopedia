import type { GeoLocation } from '@/types'

/**
 * Parse PostGIS POINT geometry to latitude/longitude
 * PostGIS stores as POINT(longitude latitude)
 * We return as {latitude, longitude}
 */
export function parsePostGISPoint(geoData: any): GeoLocation | null {
  if (!geoData) return null

  try {
    // PostGIS returns geometry in various formats depending on the client
    // Format 1: String
    if (typeof geoData === 'string') {
      // WKT format: POINT(lng lat)
      const wktMatch = geoData.match(/POINT\(([^ ]+) ([^ ]+)\)/)
      if (wktMatch) {
        const longitude = parseFloat(wktMatch[1])
        const latitude = parseFloat(wktMatch[2])
        if (!isNaN(longitude) && !isNaN(latitude)) {
          return { latitude, longitude }
        }
      }
      
      // WKB format: Hex string like "0101000020E6100000..."
      // Supabase often returns this for geometry columns
      // We can't easily parse WKB in JS, so we'll need to use ST_AsGeoJSON in the query
      // For now, return null and require proper JSON formatting from API
      return null
    }

    // Format 2: GeoJSON-like object
    if (typeof geoData === 'object' && geoData.type === 'Point') {
      const [longitude, latitude] = geoData.coordinates
      return { latitude, longitude }
    }

    // Format 3: Already parsed as {x, y} (PostGIS sometimes returns this)
    if (typeof geoData === 'object' && 'x' in geoData && 'y' in geoData) {
      return {
        longitude: geoData.x,
        latitude: geoData.y,
      }
    }

    return null
  } catch (error) {
    console.error('Error parsing PostGIS point:', error)
    return null
  }
}

/**
 * Format latitude/longitude as PostGIS POINT string
 * PostGIS expects POINT(longitude latitude)
 */
export function formatPostGISPoint(lat: number, lng: number): string {
  return `POINT(${lng} ${lat})`
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`
  }
  return `${distanceKm.toFixed(1)}km`
}

