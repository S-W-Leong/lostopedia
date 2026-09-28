import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  deleteItemImages,
  deleteItemImage,
  uploadItemImages,
  getItemImageUrls,
  getItemImageMaxIndex,
} from '@/lib/supabase/storage'
import { itemEditSchema } from '@/lib/validations/item'
import { generateItemEmbedding } from '@/lib/ai'
import { effectiveItemStatus, isStaleActiveItem } from '@/lib/utils/item-status'
import { isAdmin } from '@/lib/supabase/admin'
import { bumpItemsVersion } from '@/lib/cache/query-cache'
import { requireApiUser } from '@/lib/auth/api-auth'
import { getAuthorizedClaimant } from '@/lib/supabase/claimant'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/items/[id]
 * Get a single item by ID
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { supabase, response: authResponse } = await requireApiUser()
    if (authResponse) return authResponse

    const { data, error } = await supabase
      .from('items')
      .select(`
        id, type, title, description, category, image_url, image_metadata,
        location_text, pickup_method, geo_location, location_precision,
        date_lost_found, created_at, updated_at, status, completed_at,
        expires_at, posted_by, campus_id, is_flagged, flag_count,
        poster:users!posted_by (
          id,
          display_name,
          avatar_url,
          reputation_score
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Item not found' },
          { status: 404 }
        )
      }
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch item' },
        { status: 500 }
      )
    }

    const typedData = data as any
    const claimant = await getAuthorizedClaimant(id)

    // Parse geo_location using the helper function result
    let geoLocation = null
    if (typedData.geo_location) {
      try {
        // Call the helper function to convert geography to GeoJSON
        const { data: geoJson } = await supabase
          // @ts-ignore - Supabase type inference issue
          .rpc('get_item_geo_json', { item_geo: typedData.geo_location })
        
        if (geoJson && (geoJson as any).coordinates && Array.isArray((geoJson as any).coordinates)) {
          geoLocation = {
            latitude: (geoJson as any).coordinates[1],
            longitude: (geoJson as any).coordinates[0],
          }
        }
      } catch (err) {
        console.error('Error parsing geo_location:', err)
      }
    }

    // Transform to API response format
    const item = {
      id: typedData.id,
      type: typedData.type,
      title: typedData.title,
      description: typedData.description,
      category: typedData.category,
      imageUrl: typedData.image_url,
      imageMetadata: typedData.image_metadata,
      locationText: typedData.location_text,
      pickupMethod: typedData.pickup_method,
      geoLocation,
      locationPrecision: typedData.location_precision,
      dateLostFound: typedData.date_lost_found,
      createdAt: typedData.created_at,
      updatedAt: typedData.updated_at,
      status: effectiveItemStatus(typedData.status, typedData.expires_at),
      completedAt: typedData.completed_at,
      expiresAt: typedData.expires_at,
      postedBy: typedData.posted_by,
      campusId: typedData.campus_id,
      isFlagged: typedData.is_flagged,
      flagCount: typedData.flag_count,
      ...claimant,
      poster: typedData.poster ? {
        id: typedData.poster.id,
        displayName: typedData.poster.display_name,
        avatarUrl: typedData.poster.avatar_url,
        reputationScore: typedData.poster.reputation_score,
      } : null,
    }

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/items/[id]
 * Update an item (supports both JSON and FormData with images)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'You must be logged in to update an item' },
        { status: 401 }
      )
    }

    // Verify ownership and fetch current data
    const { data: existingItem, error: fetchError } = await supabase
      .from('items')
      .select('id, posted_by, status, title, description, ai_text_embedding, expires_at')
      .eq('id', id)
      .single()

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    const typedItem = existingItem as any

    if (typedItem.posted_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to update this item' },
        { status: 403 }
      )
    }

    if (typedItem.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Cannot update a non-active item' },
        { status: 400 }
      )
    }

    if (isStaleActiveItem(typedItem.status, typedItem.expires_at)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This listing has expired. Extend it from the item page before editing.',
        },
        { status: 400 }
      )
    }

    // Parse request body (JSON or FormData)
    const contentType = request.headers.get('content-type') || ''
    let body: any
    let images: File[] = []
    let removeImageIndices: number[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      body = {
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        locationText: formData.get('locationText'),
        pickupMethod: formData.get('pickupMethod') || undefined,
        latitude: formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : undefined,
        longitude: formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : undefined,
        dateLostFound: formData.get('dateLostFound') || undefined,
      }
      images = formData.getAll('images') as File[]

      const removeIndices = formData.get('removeImageIndices')
      if (removeIndices) {
        removeImageIndices = JSON.parse(removeIndices as string)
      }
    } else {
      body = await request.json()
      removeImageIndices = body.removeImageIndices || []
    }

    // Validate input
    const validationResult = itemEditSchema.safeParse({
      ...body,
      images: images.length > 0 ? images : undefined,
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

    // Guard: only admins can set office pickup
    if (validationResult.data.pickupMethod === 'office') {
      const userIsAdmin = await isAdmin(user.id)
      if (!userIsAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only admins can use the office pickup method' },
          { status: 403 }
        )
      }
    }

    // Check if title or description changed
    const titleChanged = body.title !== typedItem.title
    const descriptionChanged = body.description !== typedItem.description
    const shouldRegenerateEmbedding = titleChanged || descriptionChanged

    let embedding: number[] | null = null
    if (shouldRegenerateEmbedding) {
      console.log('[Item Update] Title or description changed, regenerating embedding...')
      embedding = await generateItemEmbedding(body.title, body.description)

      if (embedding) {
        console.log('[Item Update] Embedding regenerated successfully')
      } else {
        console.warn('[Item Update] Failed to regenerate embedding')
      }
    }

    // Handle image removals first
    if (removeImageIndices.length > 0) {
      for (const zeroBasedIndex of removeImageIndices) {
        await deleteItemImage(user.id, id, zeroBasedIndex + 1, supabase as any)
      }
    }

    // Handle new image uploads
    if (images.length > 0) {
      const maxIndex = await getItemImageMaxIndex(user.id, id, supabase as any)
      const uploadResult = await uploadItemImages(
        user.id,
        id,
        images,
        supabase as any,
        maxIndex + 1
      )

      if ('error' in uploadResult) {
        return NextResponse.json(
          { success: false, error: uploadResult.error },
          { status: 500 }
        )
      }
    }

    // Prepare update object
    const updateData: any = {
      title: body.title,
      description: body.description,
      category: body.category,
      location_text: body.locationText,
      updated_at: new Date().toISOString(),
    }
    
    if (body.pickupMethod !== undefined) {
      updateData.pickup_method = body.pickupMethod
    }

    // Update geo_location if provided
    if (body.latitude != null && body.longitude != null) {
      updateData.geo_location = `POINT(${body.longitude} ${body.latitude})`
      updateData.location_precision = 'approximate'
    }

    // Add AI fields if embedding was regenerated
    if (shouldRegenerateEmbedding && embedding) {
      updateData.ai_text_embedding = embedding
      updateData.ai_processed_at = new Date().toISOString()
      updateData.ai_version = 'v1'
    }

    // Update image_metadata if images were added/removed
    if (removeImageIndices.length > 0 || images.length > 0) {
      const remaining = await getItemImageUrls(user.id, id, supabase as any)

      if ('error' in remaining) {
        return NextResponse.json(
          { success: false, error: remaining.error },
          { status: 500 }
        )
      }

      const urls = remaining.urls
      updateData.image_url = urls.length > 0 ? urls[0] : null
      updateData.image_metadata = urls.length > 0 ? { urls } : null
    }

    // Update item
    const { error: updateError } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update item' },
        { status: 500 }
      )
    }

    await bumpItemsVersion()

    return NextResponse.json({
      success: true,
      message: 'Item updated successfully',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/items/[id]
 * Soft delete an item
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'You must be logged in to delete an item' },
        { status: 401 }
      )
    }

    // Verify ownership
    const { data: existingItem, error: fetchError } = await supabase
      .from('items')
      .select('id, posted_by')
      .eq('id', id)
      .single()

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    const typedItem = existingItem as any

    if (typedItem.posted_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this item' },
        { status: 403 }
      )
    }

    // Soft delete: update status
    const { error: deleteError } = await supabase
      .from('items')
      .update({
        status: 'removed',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete item' },
        { status: 500 }
      )
    }

    // Delete images from storage
    await deleteItemImages(user.id, id, supabase as any)

    await bumpItemsVersion()

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
