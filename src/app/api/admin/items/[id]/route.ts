import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { itemModerationSchema } from '@/lib/validations/admin'
import { officeClaimantBodySchema } from '@/lib/validations/office-claimant'
import { getAuthorizedClaimant } from '@/lib/supabase/claimant'

/**
 * GET /api/admin/items/[id]
 * Get single item with full details
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

    // Get item with poster info
    const { data: item, error } = await supabase
      .from('items')
      .select(`
        id, type, title, description, category, image_url, image_metadata,
        location_text, pickup_method, geo_location, location_precision,
        date_lost_found, created_at, updated_at, status, completed_at,
        expires_at, posted_by, campus_id, is_flagged, flag_count,
        admin_notes, reviewed_by, reviewed_at, removed_by, removed_at,
        removed_reason, removed_flag_id, deleted_at,
        poster:users!posted_by(
          id,
          display_name,
          email,
          avatar_url,
          reputation_score,
          is_banned
        )
      `)
      .eq('id', id)
      .single()

    if (error || !item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    // Get flags on this item
    const { data: flags } = await supabase
      .from('flags')
      .select(`
        *,
        reporter:users!reporter_id(
          id,
          display_name,
          email,
          avatar_url
        )
      `)
      .eq('flaggable_type', 'item')
      .eq('flaggable_id', id)
      .order('created_at', { ascending: false })

    // Get messages count
    const { count: messagesCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', id)

    const claimant = await getAuthorizedClaimant(id)
    return NextResponse.json({
      success: true,
      item: {
        ...(item as Record<string, unknown>),
        claimant_name: claimant.claimantName,
        claimant_student_id: claimant.claimantStudentId,
        claimant_recorded_by: claimant.claimantRecordedBy,
        flags: flags || [],
        messagesCount: messagesCount || 0,
      },
    })
  } catch (error) {
    console.error('Admin item detail API error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * PATCH /api/admin/items/[id]
 * Update item (status, admin notes, etc.)
 * 
 * Supports:
 * - Restoring removed items to active status
 * - Direct removal by admin with reason and notes
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

    const supabase = await createClient()

    // Special handling: Allow direct removal by admin
    if (body.status === 'removed') {
      const removalReason = body.removal_reason
      const removalNotes = body.removal_notes

      if (!removalReason || !removalNotes) {
        return NextResponse.json(
          { success: false, error: 'Removal reason and notes are required' },
          { status: 400 }
        )
      }

      const { data: item, error } = await supabase
        .from('items')
        // @ts-ignore - Supabase generated types may not include admin-only fields  
        .update({
          status: 'removed',
          removed_by: admin.id,
          removed_at: new Date().toISOString(),
          removed_reason: removalReason,
          admin_notes: removalNotes,
        })
        .eq('id', id)
        .select('id, status')
        .single()

      if (error) {
        console.error('Error removing item:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to remove item' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        item,
        removed: true,
      })
    }

    // Special handling: Allow restoring removed items to active
    // This bypasses the schema validation which doesn't include 'removed'
    if (body.status === 'active') {
      // Check if item is currently removed
      const { data: currentItem } = await supabase
        .from('items')
        .select('status')
        .eq('id', id)
        .single()

      if ((currentItem as any)?.status === 'removed') {
        // Allow restoration from removed to active
        const updates: any = {
          status: 'active',
          removed_by: null,
          removed_at: null,
          removed_flag_id: null,
          removed_reason: null,
          // is_flagged will be set to false automatically by trigger
        }

        if (body.admin_notes !== undefined) {
          updates.admin_notes = body.admin_notes
        }

        const { data: item, error } = await supabase
          .from('items')
          // @ts-ignore - Supabase generated types may not include admin-only fields
          .update(updates)
          .eq('id', id)
          .select('id, status')
          .single()

        if (error) {
          console.error('Error restoring item:', error)
          return NextResponse.json(
            { success: false, error: 'Failed to restore item' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          item,
          restored: true,
        })
      }
    }

    // Validate with Zod schema for normal updates
    const validationResult = itemModerationSchema.safeParse({
      itemId: id,
      status: body.status,
      adminNotes: body.admin_notes,
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

    const { status, adminNotes } = validationResult.data

    // Build update object
    const updates: Record<string, unknown> = {}

    if (status) {
      updates.status = status

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()

        const { data: rowForPickup } = await supabase
          .from('items')
          .select('pickup_method, status')
          .eq('id', id)
          .single()

        const pickupMethod = (rowForPickup as { pickup_method?: string | null } | null)
          ?.pickup_method
        if (pickupMethod === 'office') {
          const claimantParsed = officeClaimantBodySchema.safeParse({
            claimantName: body.claimantName,
            claimantStudentId: body.claimantStudentId,
          })
          if (!claimantParsed.success) {
            const first = claimantParsed.error.errors[0]
            return NextResponse.json(
              {
                success: false,
                error:
                  first?.message ??
                  'Valid claimant details are required for office items',
              },
              { status: 400 }
            )
          }
          updates.claimant_name = claimantParsed.data.claimantName
          updates.claimant_student_id = claimantParsed.data.claimantStudentId
          updates.claimant_recorded_by = admin.id
        }
      }
    }

    if (adminNotes !== undefined) {
      updates.admin_notes = adminNotes
    }

    // Update item
    const { data: item, error } = await supabase
      .from('items')
      // @ts-ignore - Supabase generated types may not include admin-only fields
      .update(updates)
      .eq('id', id)
      .select('id, status')
      .single()

    if (error) {
      console.error('Error updating item:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item,
    })
  } catch (error) {
    console.error('Admin item update API error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * DELETE /api/admin/items/[id]
 * Permanent deletion is disabled to maintain audit trails and data integrity.
 * 
 * Items can only be soft-deleted (status='removed') via PATCH endpoint.
 * Use PATCH with status='active' to restore removed items.
 */
export async function DELETE(
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  // Permanent deletion is disabled
  return NextResponse.json(
    { 
      success: false, 
      error: 'Permanent deletion is not allowed',
      message: 'Items can only be soft-deleted to maintain audit trails. Use PATCH with status="removed" instead.',
      hint: 'To remove an item, use PATCH with { status: "removed", removal_reason: "...", removal_notes: "..." }'
    },
    { status: 403 }
  )
}
