import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { IMAGE_COMPRESSION_UNAVAILABLE, uploadItemImages } from '@/lib/supabase/storage'
import { itemFormSchema } from '@/lib/validations/item'
import { APP_CONFIG, ITEM_CATEGORIES, ITEM_TYPES, ITEM_STATUSES, REPUTATION_POINTS } from '@/lib/constants'
import type { ItemCategory, ItemType, ItemStatus } from '@/lib/constants'
import { generateEmbeddingInBackground } from '@/lib/ai'
import { rateLimiters, getClientIp } from '@/lib/ratelimit'
import { createApiErrorResponse } from '@/lib/utils/errors'
import { createReputationEvent } from '@/lib/supabase/reputation'
import { isAdmin } from '@/lib/supabase/admin'
import { requireApiUser } from '@/lib/auth/api-auth'
import { assertDefaultLocation, DefaultLocationError } from '@/lib/organization/location'
import {
  getCachedJson,
  setCachedJson,
  currentItemsVersion,
  buildItemsCacheKey,
  bumpItemsVersion,
} from '@/lib/cache/query-cache'

/**
 * GET /api/items
 * List items with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit search queries by IP
    const clientIp = getClientIp(request.headers)
    const rateLimit = await rateLimiters.search(clientIp)
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: { 'X-RateLimit-Reset': String(rateLimit.reset) } }
      )
    }

    const { supabase, response: authResponse } = await requireApiUser()
    if (authResponse) return authResponse

    const { searchParams } = new URL(request.url)

    // Build a cache key from the normalized query params + current namespace version.
    const cacheParams = {
      type: searchParams.get('type'),
      category: searchParams.get('category'),
      status: searchParams.get('status'),
      q: searchParams.get('q') || searchParams.get('query'),
      campusId: searchParams.get('campusId'),
      postedBy: searchParams.get('postedBy'),
      sortBy: searchParams.get('sortBy') || 'newest',
      limit: searchParams.get('limit') || '20',
      offset: searchParams.get('offset') || '0',
    }
    const version = await currentItemsVersion()
    const cacheKey = buildItemsCacheKey(version, 'list', cacheParams)

    const cached = await getCachedJson<Record<string, unknown>>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Parse query parameters
    const type = searchParams.get('type') as ItemType | null
    const category = searchParams.get('category') as ItemCategory | null
    const status = searchParams.get('status') as ItemStatus | null
    const query = searchParams.get('q') || searchParams.get('query')
    const campusId = searchParams.get('campusId')
    const postedBy = searchParams.get('postedBy')
    const sortBy = searchParams.get('sortBy') || 'newest'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const nowIso = new Date().toISOString()

    // Build query
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

    // Apply filters
    if (type && ITEM_TYPES.includes(type)) {
      dbQuery = dbQuery.eq('type', type)
    }

    if (category && ITEM_CATEGORIES.includes(category)) {
      dbQuery = dbQuery.eq('category', category)
    }

    if (status && ITEM_STATUSES.includes(status)) {
      dbQuery = dbQuery.eq('status', status)
      if (status === 'active') {
        dbQuery = dbQuery.gt('expires_at', nowIso)
      }
    } else {
      // Default to active items only (must not be past expires_at)
      dbQuery = dbQuery.eq('status', 'active').gt('expires_at', nowIso)
    }

    if (campusId) {
      dbQuery = dbQuery.eq('campus_id', campusId)
    }

    if (postedBy) {
      dbQuery = dbQuery.eq('posted_by', postedBy)
    }

    // Full-text search using PostgreSQL search_vector column (GIN index)
    // This is much more efficient than ILIKE with wildcards
    if (query) {
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
      case 'newest':
      default:
        dbQuery = dbQuery.order('created_at', { ascending: false })
        break
    }

    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1)

    const { data, error, count } = await dbQuery

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        createApiErrorResponse(error, 'Failed to fetch items'),
        { status: 500 }
      )
    }

    // Transform to API response format
    const items = (data || []).map((item: any) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      category: item.category,
      imageUrl: item.image_url,
      locationText: item.location_text,
      status: item.status,
      createdAt: item.created_at,
      expiresAt: item.expires_at,
      poster: item.poster ? {
        id: item.poster.id,
        displayName: item.poster.display_name,
        avatarUrl: item.poster.avatar_url,
        reputationScore: item.poster.reputation_score,
      } : null,
    }))

    const payload = {
      success: true,
      items,
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    }

    await setCachedJson(cacheKey, payload, 60)

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/items
 * Create a new item
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'You must be logged in to create an item' },
        { status: 401 }
      )
    }

    const admin = await isAdmin(user.id)
    const limit = admin ? 60 : 10
    const rateLimit = admin
      ? await rateLimiters.itemCreationAdmin(user.id)
      : await rateLimiters.itemCreation(user.id)

    if (!rateLimit.success) {
      const resetDate = new Date(rateLimit.reset).toLocaleTimeString()
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. You can create more items after ${resetDate}.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      )
    }

    // Parse request body
    const contentType = request.headers.get('content-type') || ''
    let body: any

    if (contentType.includes('multipart/form-data')) {
      // Handle form data with files
      const formData = await request.formData()
      body = {
        type: formData.get('type'),
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        locationText: formData.get('locationText'),
        latitude: formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : undefined,
        longitude: formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : undefined,
        dateLostFound: formData.get('dateLostFound') || undefined,
        campusId: formData.get('campusId'),
        pickupMethod: formData.get('pickupMethod') || undefined,
        images: formData.getAll('images') as File[],
      }
    } else {
      // Handle JSON body
      body = await request.json()
    }

    // Validate input (without images for JSON requests)
    const validationResult = itemFormSchema.safeParse({
      ...body,
      images: body.images || [],
    })

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Guard: only admins can post with office pickup
    if (validationResult.data.pickupMethod === 'office' && !admin) {
      return NextResponse.json(
        { success: false, error: 'Only admins can use the office pickup method' },
        { status: 403 }
      )
    }

    let canonicalLocationId: string
    try {
      canonicalLocationId = await assertDefaultLocation(supabase, body.campusId)
    } catch (error) {
      if (error instanceof DefaultLocationError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.code === 'setup' ? 503 : 400 }
        )
      }
      throw error
    }

    // Calculate expiration date (90 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + APP_CONFIG.itemExpirationDays)

    // Prepare geo_location if coordinates are provided
    const geoLocation =
      body.latitude && body.longitude
        ? `POINT(${body.longitude} ${body.latitude})`
        : null

    // Insert item WITHOUT embedding first (embedding will be generated in background)
    // This allows item creation to return immediately without waiting for HuggingFace API
    const { data: item, error: insertError } = await supabase
      .from('items')
      .insert({
        type: body.type,
        title: body.title,
        description: body.description,
        category: body.category,
        location_text: body.locationText,
        geo_location: geoLocation,
        date_lost_found: body.dateLostFound || null,
        posted_by: user.id,
        campus_id: canonicalLocationId,
        pickup_method: body.type === 'found' ? body.pickupMethod : null,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        location_precision: body.latitude && body.longitude ? 'approximate' : 'hidden',
        // AI fields will be populated asynchronously in background
        ai_text_embedding: null,
        ai_processed_at: null,
        ai_version: null,
      })
      .select('id')
      .single()

    if (insertError || !item) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        createApiErrorResponse(insertError, 'Failed to create item'),
        { status: 500 }
      )
    }

    const typedItem = item as any

    // Fire-and-forget background embedding generation
    // Don't await - let it run in background, return immediately to user
    generateEmbeddingInBackground(
      supabase,
      typedItem.id,
      body.title,
      body.description
    ).catch((err) => {
      console.error('[Item Creation] Background embedding generation failed:', err)
      // Error is logged but doesn't affect the response
    })

    // Upload images if provided
    let imageUrls: string[] = []
    const images = body.images || []
    if (images.length > 0 && (typeof File !== 'undefined' ? images[0] instanceof File : true)) {
      const uploadResult = await uploadItemImages(user.id, typedItem.id, images, supabase as any)

      if ('error' in uploadResult) {
        // Rollback: delete the item since image upload failed
        await supabase.from('items').delete().eq('id', typedItem.id)

        return NextResponse.json(
          { success: false, error: uploadResult.error },
          { status: uploadResult.error === IMAGE_COMPRESSION_UNAVAILABLE ? 503 : 500 }
        )
      }

      imageUrls = uploadResult.urls
    }

    // Update item with image URLs
    if (imageUrls.length > 0) {
      await supabase
        .from('items')
        .update({
          image_url: imageUrls[0],
          image_metadata: { urls: imageUrls },
        })
        .eq('id', typedItem.id)
    }

    console.log('[Item Creation] Item created successfully:', typedItem.id)

    // Update user's item count (if RPC exists)
    try {
      await supabase.rpc('increment_user_items_posted', { user_id: user.id } as any)
    } catch {
      // Ignore if RPC doesn't exist
    }

    // Add reputation event (with rate limiting check)
    try {
      console.log('[Reputation] Starting reputation event creation for user:', user.id)

      // Check if user has already posted 10 items today (rate limit)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      console.log('[Reputation] Checking daily post count...')
      const { count: todayPosts, error: countError } = await supabase
        .from('reputation_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('event_type', 'item_posted')
        .gte('created_at', today.toISOString())

      if (countError) {
        console.error('[Reputation] Error counting today posts:', countError)
      }

      console.log('[Reputation] Today posts count:', todayPosts)

      // Only create reputation event if under daily limit (10 per day)
      if ((todayPosts || 0) < 10) {
        console.log('[Reputation] Creating reputation event...')
        const result = await createReputationEvent({
          userId: user.id,
          eventType: 'item_posted',
          pointsChange: REPUTATION_POINTS.item_posted,
          relatedItemId: typedItem.id,
        })
        console.log('[Reputation] Create result:', result)
      } else {
        console.log('Skipped item_posted reputation event - daily limit reached:', {
          user_id: user.id,
          todayPosts: todayPosts || 0,
        })
      }
    } catch (error) {
      // Log error but don't fail item creation
      console.error('[Reputation] Exception creating reputation event:', error)
    }

    // Invalidate cached item lists so the new item appears immediately.
    await bumpItemsVersion()

    return NextResponse.json({
      success: true,
      itemId: typedItem.id,
      message: 'Item created successfully',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
