import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { flagReviewSchema } from '@/lib/validations/admin'
import { REPUTATION_POINTS } from '@/lib/constants'
import { createReputationEvent } from '@/lib/supabase/reputation'

/**
 * GET /api/flags/[id]
 * Get single flag with full details (admin-only)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    await requireAdmin()

    const { id } = await params
    const supabase = await createClient()

    // Get flag with reporter info
    const { data: flag, error } = await supabase
      .from('flags')
      .select(`
        *,
        reporter:users!reporter_id(
          id,
          display_name,
          email,
          avatar_url,
          reputation_score
        ),
        reviewer:users!reviewed_by(
          id,
          display_name,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (error || !flag) {
      return NextResponse.json(
        { success: false, error: 'Flag not found' },
        { status: 404 }
      )
    }

    // Cast flag to any to avoid type issues
    const flagData = flag as any

    // Get flagged content details
    let content = null
    if (flagData.flaggable_type === 'item') {
      const { data: item } = await supabase
        .from('items')
        .select(`
          id, type, title, description, category, image_url, image_metadata,
          location_text, pickup_method, date_lost_found, status, posted_by,
          created_at, updated_at, expires_at,
          poster:users!posted_by(
            id,
            display_name,
            email,
            avatar_url,
            reputation_score,
            is_banned
          )
        `)
        .eq('id', flagData.flaggable_id)
        .single()
      
      content = item
    }

    return NextResponse.json({
      success: true,
      flag: {
        ...(flag as Record<string, unknown>),
        content,
      },
    })
  } catch (error) {
    console.error('Admin flag detail API error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * PATCH /api/flags/[id]
 * Update flag status and add review notes (admin-only)
 * Can also remove the flagged item if action_taken is 'item_removed'
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const admin = await requireAdmin()

    const { id } = await params
    const body = await request.json()

    // Validate with Zod schema
    const validationResult = flagReviewSchema.safeParse({
      flagId: id,
      status: body.status,
      reviewNotes: body.review_notes,
      actionTaken: body.action_taken,
    })

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { status, reviewNotes, actionTaken } = validationResult.data

    const supabase = await createClient()

    // Get the flag to know what content is being flagged
    const { data: existingFlag, error: flagFetchError } = await supabase
      .from('flags')
      .select('*')
      .eq('id', id)
      .single()

    if (flagFetchError || !existingFlag) {
      return NextResponse.json(
        { success: false, error: 'Flag not found' },
        { status: 404 }
      )
    }

    // Build update object for flag
    const flagUpdates: any = {
      status,
      action_taken: actionTaken || 'none',
    }

    if (status === 'reviewed' || status === 'dismissed') {
      flagUpdates.reviewed_by = admin.id
      flagUpdates.reviewed_at = new Date().toISOString()
    }

    if (reviewNotes !== undefined) {
      flagUpdates.review_notes = reviewNotes
    }

    // Start a transaction-like approach by updating flag first
    const { data: flag, error: flagError } = await supabase
      .from('flags')
      // @ts-ignore - Supabase type inference issue
      .update(flagUpdates)
      .eq('id', id)
      .select()
      .single()

    if (flagError) {
      console.error('Error updating flag:', flagError)
      return NextResponse.json(
        { success: false, error: 'Failed to update flag' },
        { status: 500 }
      )
    }

    // Cast existingFlag to any to avoid type issues
    const existingFlagData = existingFlag as any

    // If action is to remove item, update the item status
    if (actionTaken === 'item_removed' && existingFlagData.flaggable_type === 'item') {
      // Get the item to find the poster
      const { data: item, error: itemFetchError } = await supabase
        .from('items')
        .select('id, posted_by')
        .eq('id', existingFlagData.flaggable_id)
        .single()

      if (itemFetchError || !item) {
        console.error('Error fetching item for reputation penalty:', itemFetchError)
      } else {
        // Update item status
        const { error: itemError } = await supabase
          .from('items')
          // @ts-ignore - Supabase type inference issue
          .update({
            status: 'removed',
            removed_by: admin.id,
            removed_at: new Date().toISOString(),
            removed_flag_id: id,
            removed_reason: existingFlagData.reason,
            // is_flagged will be set automatically by trigger
          })
          .eq('id', existingFlagData.flaggable_id)

        if (itemError) {
          console.error('Error removing item:', itemError)
          // Item removal failed, but flag was updated - log warning
          console.warn(`Flag ${id} marked as reviewed with item_removed action, but item removal failed`)
        } else {
          // Create reputation event for validated flag (penalty to content creator)
          try {
            const typedItem = item as any
            await createReputationEvent({
              userId: typedItem.posted_by,
              eventType: 'item_flagged_valid',
              pointsChange: REPUTATION_POINTS.item_flagged_valid,
              relatedItemId: typedItem.id,
              notes: `Flag validated by admin: ${existingFlagData.reason}. Item removed.`,
            })
          } catch (reputationError) {
            // Log error but don't fail the flag review
            console.error('Error creating reputation event for flagged item:', reputationError)
          }
        }
      }
    }

    // TODO: Handle other action types (user_warned, user_banned) in future

    return NextResponse.json({
      success: true,
      flag,
      itemRemoved: actionTaken === 'item_removed',
    })
  } catch (error) {
    console.error('Admin flag update API error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
