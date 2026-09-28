import { NextRequest, NextResponse } from 'next/server'
import { ITEM_CATEGORIES, ITEM_TYPES, ITEM_STATUSES, APP_CONFIG } from '@/lib/constants'
import type { ItemCategory, ItemType, ItemStatus } from '@/lib/constants'
import type { PaginatedResponse, ItemCard } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createdAtUtcBounds, parseSearchDateRange } from '@/lib/search-date-params'
import { requireApiUser } from '@/lib/auth/api-auth'
import {
  getCachedJson,
  setCachedJson,
  currentItemsVersion,
  buildItemsCacheKey,
} from '@/lib/cache/query-cache'

// Helper type for search parameters
interface SearchParams {
  query: string
  type: ItemType | null
  category: ItemCategory | null
  status: ItemStatus | null
  campusId: string | null
  dateFrom: string | null
  dateTo: string | null
  limit: number
  offset: number
  cacheKey: string
}

/**
 * Search with relevance ranking using the database search_items RPC function
 * This provides proper ts_rank-based scoring for text search
 */
async function searchWithRelevance(
  supabase: SupabaseClient,
  params: SearchParams
): Promise<NextResponse> {
  const { query, type, category, status, campusId, dateFrom, dateTo, limit, offset } = params
  const nowIso = new Date().toISOString()
  const { gte: createdGte, lte: createdLte } = createdAtUtcBounds(dateFrom, dateTo)

  // Build a count query with the same filters to get accurate total
  let countQuery = supabase
    .from('items')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .textSearch('search_vector', query, {
      type: 'plain',
      config: 'english',
    })

  // Apply the same filters as the RPC function
  if (status) {
    countQuery = countQuery.eq('status', status)
    if (status === 'active') {
      countQuery = countQuery.gt('expires_at', nowIso)
    }
  } else {
    countQuery = countQuery.eq('status', 'active').gt('expires_at', nowIso)
  }

  if (type) {
    countQuery = countQuery.eq('type', type)
  }

  if (category) {
    countQuery = countQuery.eq('category', category)
  }

  if (campusId) {
    countQuery = countQuery.eq('campus_id', campusId)
  }

  if (createdGte) {
    countQuery = countQuery.gte('created_at', createdGte)
  }
  if (createdLte) {
    countQuery = countQuery.lte('created_at', createdLte)
  }

  // Execute both queries in parallel
  const [countResult, searchResult] = await Promise.all([
    countQuery,
    supabase.rpc('search_items', {
      p_query: query,
      p_type: type,
      p_category: category,
      p_status: status || 'active',
      p_campus_id: campusId,
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_limit: limit + 1, // Request one extra to check hasMore
      p_offset: offset,
    }),
  ])

  if (searchResult.error) {
    console.error('RPC search error:', searchResult.error)
    return NextResponse.json(
      { success: false, error: 'Failed to search items' },
      { status: 500 }
    )
  }

  if (countResult.error) {
    console.error('Count query error:', countResult.error)
    // Continue with approximate count if count query fails
  }

  const results = searchResult.data || []
  const hasMore = results.length > limit
  const items = hasMore ? results.slice(0, limit) : results
  const total = countResult.count ?? (offset + items.length + (hasMore ? 1 : 0))

  // Transform RPC results to ItemCard format
  const transformedItems: ItemCard[] = items.map((item: any) => ({
    id: item.item_id,
    type: item.item_type,
    title: item.title,
    description: item.description,
    category: item.category,
    imageUrl: item.image_url,
    locationText: item.location_text,
    pickupMethod:
      item.pickup_method === 'office' || item.pickup_method === 'meetup'
        ? item.pickup_method
        : null,
    status: item.status,
    createdAt: item.created_at,
    expiresAt: item.expires_at,
    poster: {
      id: item.poster_id,
      displayName: item.poster_name,
      avatarUrl: item.poster_avatar,
      reputationScore: item.poster_reputation || 0,
    },
  }))

  const response: PaginatedResponse<ItemCard> = {
    success: true,
    items: transformedItems,
    total,
    limit,
    offset,
    hasMore,
  }

  await setCachedJson(params.cacheKey, response, 60)
  return NextResponse.json(response)
}

/**
 * GET /api/search
 * Search items with full-text search and filters
 * 
 * Query Parameters:
 * - q: Search query (text)
 * - type: lost | found
 * - category: ItemCategory
 * - status: ItemStatus (defaults to 'active')
 * - sortBy: newest | oldest | relevance
 * - limit: number (max 100, default 20)
 * - offset: number (default 0)
 * - campusId: string
 * - dateFrom: YYYY-MM-DD (optional, UTC calendar day; filters listing created_at)
 * - dateTo: YYYY-MM-DD (optional, inclusive end)
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireApiUser()
    if (authResponse) return authResponse
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const query = (searchParams.get('q') || searchParams.get('query') || '').trim()
    const type = searchParams.get('type') as ItemType | null
    const category = searchParams.get('category') as ItemCategory | null
    const status = searchParams.get('status') as ItemStatus | null
    const campusId = searchParams.get('campusId')
    const sortBy = searchParams.get('sortBy') || 'newest'
    const limit = Math.min(parseInt(searchParams.get('limit') || String(APP_CONFIG.itemsPerPage)), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const nowIso = new Date().toISOString()

    const dateRange = parseSearchDateRange(
      searchParams.get('dateFrom'),
      searchParams.get('dateTo')
    )
    if (!dateRange.ok) {
      return NextResponse.json({ success: false, error: dateRange.error }, { status: 400 })
    }
    const { dateFrom, dateTo } = dateRange
    const { gte: createdGte, lte: createdLte } = createdAtUtcBounds(dateFrom, dateTo)

    // Validate filters
    if (type && !ITEM_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${ITEM_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (category && !ITEM_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${ITEM_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    if (status && !ITEM_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${ITEM_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    if (!['newest', 'oldest', 'relevance'].includes(sortBy)) {
      return NextResponse.json(
        { success: false, error: 'Invalid sortBy. Must be one of: newest, oldest, relevance' },
        { status: 400 }
      )
    }

    const version = await currentItemsVersion()
    const cacheKey = buildItemsCacheKey(version, 'search', {
      q: query,
      type,
      category,
      status,
      campusId,
      sortBy,
      dateFrom,
      dateTo,
      limit: String(limit),
      offset: String(offset),
    })
    const cached = await getCachedJson<Record<string, unknown>>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Special case: Use RPC function for full-text search with relevance ranking
    if (query && sortBy === 'relevance') {
      return await searchWithRelevance(supabase, {
        query,
        type,
        category,
        status,
        campusId,
        dateFrom,
        dateTo,
        limit,
        offset,
        cacheKey,
      })
    }

    // Build base query with poster info
    // Using computed columns to get coordinates from PostGIS geometry
    let dbQuery = supabase
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
        coordinates:get_item_coordinates,
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
      `, { count: 'exact' })

    // Apply status filter (default to active only)
    if (status) {
      dbQuery = dbQuery.eq('status', status)
      if (status === 'active') {
        dbQuery = dbQuery.gt('expires_at', nowIso)
      }
    } else {
      dbQuery = dbQuery.eq('status', 'active').gt('expires_at', nowIso)
    }

    // Apply type filter
    if (type) {
      dbQuery = dbQuery.eq('type', type)
    }

    // Apply category filter
    if (category) {
      dbQuery = dbQuery.eq('category', category)
    }

    // Apply campus filter
    if (campusId) {
      dbQuery = dbQuery.eq('campus_id', campusId)
    }

    if (createdGte) {
      dbQuery = dbQuery.gte('created_at', createdGte)
    }
    if (createdLte) {
      dbQuery = dbQuery.lte('created_at', createdLte)
    }

    // Apply full-text search if query is provided
    if (query.trim()) {
      // Use PostgreSQL full-text search with search_vector column
      // The search_vector is a generated tsvector column from title + description + location_text
      // We use textSearch which translates to: search_vector @@ plainto_tsquery('english', query)
      dbQuery = dbQuery.textSearch('search_vector', query, {
        type: 'plain',
        config: 'english',
      })
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        dbQuery = dbQuery.order('created_at', { ascending: true })
        break
      case 'relevance':
        if (query.trim()) {
          // For relevance sort with full-text search, we need to use the database function
          // that includes ts_rank scoring. The client-side query builder doesn't support ts_rank.
          // We'll fall back to created_at for now, or use the RPC function in future enhancement.
          // TODO: Use search_items() RPC function for true relevance ranking with ts_rank
          dbQuery = dbQuery.order('created_at', { ascending: false })
        } else {
          // No query, so relevance doesn't make sense - use newest
          dbQuery = dbQuery.order('created_at', { ascending: false })
        }
        break
      case 'newest':
      default:
        dbQuery = dbQuery.order('created_at', { ascending: false })
        break
    }

    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1)

    // Execute query
    const { data, error, count } = await dbQuery

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to search items' },
        { status: 500 }
      )
    }

    // Transform to ItemCard format
    const items: ItemCard[] = (data || []).map((item: any) => ({
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
      geoLocation: item.coordinates || null,
      status: item.status,
      createdAt: item.created_at,
      expiresAt: item.expires_at,
      poster: item.poster ? {
        id: item.poster.id,
        displayName: item.poster.display_name,
        avatarUrl: item.poster.avatar_url,
        reputationScore: item.poster.reputation_score || 0,
      } : {
        id: item.posted_by,
        displayName: 'Unknown User',
        avatarUrl: null,
        reputationScore: 0,
      },
    }))

    // Build paginated response
    const response: PaginatedResponse<ItemCard> = {
      success: true,
      items,
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    }

    await setCachedJson(cacheKey, response, 60)
    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in search API:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
