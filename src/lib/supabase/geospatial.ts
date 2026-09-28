import { createClient } from './client'
import type { ItemCard } from '@/types'
import { parsePostGISPoint } from '@/lib/utils/geo'
import { isStaleActiveItem } from '@/lib/utils/item-status'

export interface NearbySearchParams {
  latitude: number
  longitude: number
  radiusKm?: number
  type?: 'lost' | 'found'
  category?: string
  limit?: number
}

/**
 * Search for items near a specific location using PostGIS ST_DWithin
 * Returns items within the specified radius, sorted by distance
 */
export async function searchNearbyItems(
  params: NearbySearchParams
): Promise<{ items: ItemCard[]; error?: string }> {
  const {
    latitude,
    longitude,
    radiusKm = 5, // Default 5km radius
    type,
    category,
    limit = 50,
  } = params

  try {
    const supabase = createClient()

    // PostGIS uses meters, so convert km to meters
    const radiusMeters = radiusKm * 1000

    // Build the query (kept for potential fallback; RPC is used when available)
    let _query = supabase
      .from('items')
      .select(`
        id,
        type,
        title,
        description,
        category,
        image_url,
        location_text,
        pickup_method,
        geo_location,
        status,
        created_at,
        expires_at,
        posted_by,
        poster:users!posted_by (
          id,
          display_name,
          avatar_url,
          reputation_score
        )
      `)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .not('geo_location', 'is', null)

    if (type) {
      _query = _query.eq('type', type)
    }
    if (category) {
      _query = _query.eq('category', category)
    }

    // Use RPC function for spatial query with distance calculation
    const { data, error } = await supabase.rpc('items_within_radius', {
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_meters: radiusMeters,
      p_type: type || null,
      p_category: category || null,
      p_limit: limit,
    })

    if (error) {
      console.error('Geospatial query error:', error)
      // Fallback to fetching all items if RPC doesn't exist
      return await fallbackNearbySearch(params)
    }

    // Transform results (drop stale active rows if RPC does not filter by expires_at)
    const items: ItemCard[] = (data || [])
      .filter((item: any) => !isStaleActiveItem(item.status, item.expires_at))
      .map((item: any) => ({
      id: item.item_id || item.id,
      type: item.item_type || item.type,
      title: item.title,
      description: item.description,
      category: item.category,
      imageUrl: item.image_url,
      locationText: item.location_text,
      pickupMethod:
        item.pickup_method === 'office' || item.pickup_method === 'meetup'
          ? item.pickup_method
          : null,
      geoLocation: parsePostGISPoint(item.geo_location),
      status: item.status,
      createdAt: item.created_at,
      expiresAt: item.expires_at,
      poster: {
        id: item.poster_id || item.poster?.id,
        displayName: item.poster_name || item.poster?.display_name,
        avatarUrl: item.poster_avatar || item.poster?.avatar_url,
        reputationScore: item.poster_reputation || item.poster?.reputation_score || 0,
      },
    }))

    return { items }
  } catch (error) {
    console.error('Error in nearby search:', error)
    return { items: [], error: 'Failed to search nearby items' }
  }
}

/**
 * Fallback nearby search that filters client-side
 * Used when PostGIS RPC function is not available
 */
async function fallbackNearbySearch(
  params: NearbySearchParams
): Promise<{ items: ItemCard[]; error?: string }> {
  const { latitude, longitude, radiusKm = 5, type, category, limit = 50 } = params

  try {
    const supabase = createClient()

    // Fetch all active items with geo_location
    let query = supabase
      .from('items')
      .select(`
        id,
        type,
        title,
        description,
        category,
        image_url,
        location_text,
        pickup_method,
        geo_location,
        status,
        created_at,
        expires_at,
        posted_by,
        poster:users!posted_by (
          id,
          display_name,
          avatar_url,
          reputation_score
        )
      `)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .not('geo_location', 'is', null)
      .limit(500) // Get more items to filter client-side

    if (type) {
      query = query.eq('type', type)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Fallback query error:', error)
      return { items: [], error: 'Failed to fetch items' }
    }

    // Filter by distance client-side
    const { calculateDistance } = await import('@/lib/utils/geo')

    const itemsWithDistance = (data || [])
      .map((item: any) => {
        const geoLocation = parsePostGISPoint(item.geo_location)
        if (!geoLocation) return null

        const distance = calculateDistance(
          latitude,
          longitude,
          geoLocation.latitude,
          geoLocation.longitude
        )

        if (distance > radiusKm) return null

        return {
          id: item.id,
          type: item.type,
          title: item.title,
          description: item.description,
          category: item.category,
          imageUrl: item.image_url,
          locationText: item.location_text,
          pickupMethod:
            item.pickup_method === 'office' || item.pickup_method === 'meetup'
              ? item.pickup_method
              : null,
          geoLocation,
          status: item.status,
          createdAt: item.created_at,
          expiresAt: item.expires_at,
          poster: item.poster
            ? {
                id: item.poster.id,
                displayName: item.poster.display_name,
                avatarUrl: item.poster.avatar_url,
                reputationScore: item.poster.reputation_score || 0,
              }
            : {
                id: item.posted_by,
                displayName: 'Unknown User',
                avatarUrl: null,
                reputationScore: 0,
              },
          distance, // Include distance for sorting
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(({ distance: _distance, ...item }) => item) // Remove distance from final result

    return { items: itemsWithDistance }
  } catch (error) {
    console.error('Error in fallback nearby search:', error)
    return { items: [], error: 'Failed to search nearby items' }
  }
}

