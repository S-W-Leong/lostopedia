'use client'

import { useCallback, useEffect, useState } from 'react'
import type { MapBounds, MapFilters, MapMarker, MapMarkerResponse } from '@/lib/map-items'

export function useMapMarkers(bounds: MapBounds | null, type: MapFilters['type'], category: MapFilters['category']) {
  const [state, setState] = useState({
    items: [] as MapMarker[], hasMore: false, loading: false,
    error: null as string | null, authRequired: false,
  })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt(value => value + 1), [])
  const south = bounds?.south
  const north = bounds?.north
  const west = bounds?.west
  const east = bounds?.east

  useEffect(() => {
    if (south === undefined || north === undefined || west === undefined || east === undefined) return
    const controller = new AbortController()
    let current = true
    // Clear old viewport/filter results immediately, including during the debounce.
    setState({ items: [], hasMore: false, loading: true, error: null, authRequired: false })
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({
        south: String(south), north: String(north), west: String(west), east: String(east),
      })
      if (type !== 'all') params.set('type', type)
      if (category !== 'all') params.set('category', category)
      try {
        const response = await fetch(`/api/map/items?${params}`, { signal: controller.signal })
        if (!current) return
        if (response.status === 401) {
          setState({ items: [], hasMore: false, loading: false, error: 'Sign in to see items on the map.', authRequired: true })
          return
        }
        if (!response.ok) throw new Error('Request failed')
        const data: MapMarkerResponse = await response.json()
        if (!data.success) throw new Error('Request failed')
        if (current) setState({ ...data, loading: false, error: null, authRequired: false })
      } catch {
        if (current) setState({ items: [], hasMore: false, loading: false, error: 'Unable to load map items. Please try again.', authRequired: false })
      }
    }, 300)
    return () => { current = false; clearTimeout(timer); controller.abort() }
  }, [south, north, west, east, type, category, attempt])

  return { ...state, retry }
}
