import type { ItemCategory, ItemType } from '@/lib/constants'
import type { GeoLocation } from '@/types'

export const MAP_MARKER_CAP = 50

export interface MapBounds {
  south: number
  north: number
  west: number
  east: number
}

export interface MapMarker {
  id: string
  type: ItemType
  title: string
  geoLocation: GeoLocation
}

export interface MapMarkerResponse {
  success: boolean
  items: MapMarker[]
  hasMore: boolean
}

export interface MapPopupDetails {
  description: string
  imageUrl: string | null
  locationText: string
  createdAt: string
}

export type MapFilters = { type: ItemType | 'all'; category: ItemCategory | 'all' }
