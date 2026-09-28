import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { bumpItemsVersion } from '@/lib/cache/query-cache'

/**
 * GET /api/admin/items
 * List items with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // lost/found
    const status = searchParams.get('status') // active/completed/expired/removed
    const flagged = searchParams.get('flagged') // true/false
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('items')
      .select(`
        id,
        type,
        title,
        description,
        category,
        image_url,
        image_metadata,
        location_text,
        location_precision,
        geo_location,
        pickup_method,
        date_lost_found,
        status,
        is_flagged,
        flag_count,
        admin_notes,
        campus_id,
        posted_by,
        reviewed_by,
        reviewed_at,
        removed_by,
        removed_at,
        removed_reason,
        removed_flag_id,
        completed_at,
        ai_processed_at,
        ai_version,
        created_at,
        updated_at,
        deleted_at,
        expires_at,
        poster:users!posted_by(
          id,
          display_name,
          email,
          avatar_url,
          reputation_score
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (type && (type === 'lost' || type === 'found')) {
      query = query.eq('type', type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (flagged === 'true') {
      query = query.eq('is_flagged', true)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data: items, error, count } = await query

    if (error) {
      console.error('Error fetching items:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch items' },
        { status: 500 }
      )
    }

    // Get flag counts for each item
    const itemsWithFlags = await Promise.all(
      (items || []).map(async (item: any) => {
        const { count: flagsCount } = await supabase
          .from('flags')
          .select('*', { count: 'exact', head: true })
          .eq('flaggable_type', 'item')
          .eq('flaggable_id', item.id)

        return {
          ...item,
          flagsCount: flagsCount || 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      items: itemsWithFlags,
      total: count || 0,
    })
  } catch (error) {
    console.error('Admin items API error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * PATCH /api/admin/items
 * Bulk actions on items (remove/restore)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await requireAdmin()

    const body = await request.json()
    const { itemIds, action } = body

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid item IDs' },
        { status: 400 }
      )
    }

    if (!['remove', 'restore'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Build update object
    const updates: any = {}

    if (action === 'remove') {
      updates.status = 'removed'
      updates.removed_by = admin.id
      updates.removed_at = new Date().toISOString()
    } else if (action === 'restore') {
      updates.status = 'active'
      updates.removed_by = null
      updates.removed_at = null
    }

    // Update items
    const { error } = await supabase
      .from('items')
      // @ts-ignore - Supabase generated types may not include admin-only fields
      .update(updates)
      .in('id', itemIds)

    if (error) {
      console.error('Error updating items:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update items' },
        { status: 500 }
      )
    }

    await bumpItemsVersion()

    return NextResponse.json({
      success: true,
      message: `${itemIds.length} item(s) ${action === 'remove' ? 'removed' : 'restored'} successfully`,
    })
  } catch (error) {
    console.error('Admin items bulk action error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
