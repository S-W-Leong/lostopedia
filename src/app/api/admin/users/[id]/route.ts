import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { REPUTATION_POINTS } from '@/lib/constants'
import { requireAdmin, createAdminClient } from '@/lib/supabase/admin'
import { banUserSchema } from '@/lib/validations/admin'
import { createReputationEvent } from '@/lib/supabase/reputation'

const DELETE_CONFIRM_TEXT = 'DELETE'

/**
 * GET /api/admin/users/[id]
 * Get single user with full details
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

    // Get user profile
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user's items
    const { data: items } = await supabase
      .from('items')
      .select('id, title, type, status, created_at')
      .eq('posted_by', id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get reputation events
    const { data: reputationEvents } = await supabase
      .from('reputation_events')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get flags on user's content
    // First get the user's item IDs
    const { data: userItems } = await supabase
      .from('items')
      .select('id')
      .eq('posted_by', id)

    const itemIds = userItems?.map((item: any) => item.id) || []

    // Then count flags for those items (only if there are items)
    let flagsCount = 0
    if (itemIds.length > 0) {
      const { count } = await supabase
        .from('flags')
        .select('*', { count: 'exact', head: true })
        .eq('flaggable_type', 'item')
        .in('flaggable_id', itemIds)
      flagsCount = count || 0
    }

    return NextResponse.json({
      success: true,
      user: {
        ...(user as Record<string, unknown>),
        items: items || [],
        reputationEvents: reputationEvents || [],
        flagsCount: flagsCount || 0,
      },
    })
  } catch (error) {
    console.error('Admin user detail API error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user (ban/unban, adjust reputation, etc.)
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

    // Build update object
    const updates: any = {}

    // Validate ban operation if is_banned is provided
    if (typeof body.is_banned === 'boolean') {
      if (body.is_banned && body.banned_reason) {
        const banValidation = banUserSchema.safeParse({
          userId: id,
          reason: body.banned_reason,
        })

        if (!banValidation.success) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid ban data',
              details: banValidation.error.errors
            },
            { status: 400 }
          )
        }
      }

      updates.is_banned = body.is_banned
      if (body.is_banned) {
        updates.banned_at = new Date().toISOString()
        updates.banned_reason = body.banned_reason || 'No reason provided'
      } else {
        updates.banned_at = null
        updates.banned_reason = null
      }
    }

    // NOTE: Reputation adjustments should be done via /api/admin/reputation endpoint
    // This endpoint only handles user account status (ban/unban)

    // Update user
    const { data: user, error } = await supabase
      .from('users')
      // @ts-ignore - Supabase type inference issue
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      )
    }

    // If user was banned, create reputation event
    if (body.is_banned === true) {
      try {
        await createReputationEvent({
          userId: id,
          eventType: 'banned',
          pointsChange: REPUTATION_POINTS.banned,
          notes: `Banned by ${admin.display_name || admin.email}: ${body.banned_reason || 'No reason provided'}`,
        })
      } catch (reputationError) {
        console.error('Error creating ban reputation event:', reputationError)
        // Don't fail the ban operation if reputation event fails
      }
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('Admin user update API error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Permanently delete a user (including banned users). Admin only.
 * Body: { deleteItemsAndMessages: boolean, confirmText: string }
 * confirmText must be exactly "DELETE".
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const deleteItemsAndMessages = body.deleteItemsAndMessages === true
    const confirmText = typeof body.confirmText === 'string' ? body.confirmText.trim() : ''

    if (confirmText !== DELETE_CONFIRM_TEXT) {
      return NextResponse.json(
        { success: false, error: `You must type ${DELETE_CONFIRM_TEXT} to confirm.` },
        { status: 400 }
      )
    }
    const admin = createAdminClient()
    const systemUserId = process.env.LOSTOPEDIA_SYSTEM_USER_ID
    if (!deleteItemsAndMessages) {
      if (!systemUserId) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Keeping items and messages is not configured. Set LOSTOPEDIA_SYSTEM_USER_ID or choose to delete everything.',
          },
          { status: 400 }
        )
      }
      await (admin as any).from('items').update({ posted_by: systemUserId }).eq('posted_by', id)
      await (admin as any).from('messages').update({ sender_id: systemUserId }).eq('sender_id', id)
      await (admin as any).from('messages').update({ recipient_id: systemUserId }).eq('recipient_id', id)
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(id)

    if (deleteError) {
      if (deleteError.message?.toLowerCase().includes('user not found')) {
        return NextResponse.json({ success: true })
      }
      console.error('Admin delete user auth.admin.deleteUser error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete user. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/users/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}