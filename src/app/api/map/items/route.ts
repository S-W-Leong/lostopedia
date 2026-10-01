import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/api-auth'
import { ITEM_TYPES, ITEM_CATEGORIES } from '@/lib/constants'
import { MAP_MARKER_CAP, type MapMarker } from '@/lib/map-items'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireApiUser()
    if (authResponse) return authResponse

    const params = request.nextUrl.searchParams
    const bounds = ['south', 'north', 'west', 'east'].map(key => {
      const value = params.get(key)
      return value?.trim() ? Number(value) : NaN
    })
    const [south, north, west, east] = bounds
    if (!bounds.every(Number.isFinite) || south < -90 || north > 90 || south >= north ||
      west < -180 || west > 180 || east < -180 || east > 180 || west === east) {
      return NextResponse.json({ success: false, error: 'Invalid map bounds' }, { status: 400 })
    }
    const type = params.get('type')
    const category = params.get('category')
    if ((type !== null && !ITEM_TYPES.some(value => value === type)) ||
      (category !== null && !ITEM_CATEGORIES.some(value => value === category))) {
      return NextResponse.json({ success: false, error: 'Invalid map filters' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('map_items_in_bounds', {
      p_south: south, p_north: north, p_west: west, p_east: east,
      p_type: type, p_category: category,
    })
    if (error) {
      return NextResponse.json({ success: false, error: 'Unable to load map items' }, { status: 500 })
    }
    const rows = (data ?? []) as Database['public']['Functions']['map_items_in_bounds']['Returns']
    const items: MapMarker[] = rows.slice(0, MAP_MARKER_CAP).map(row => ({
      id: row.id, type: row.type as MapMarker['type'], title: row.title,
      geoLocation: { latitude: row.latitude, longitude: row.longitude },
    }))
    return NextResponse.json({ success: true, items, hasMore: rows.length > MAP_MARKER_CAP }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to load map items' }, { status: 500 })
  }
}
