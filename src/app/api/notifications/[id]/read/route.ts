import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH /api/notifications/[id]/read - Mark a single notification as read
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const notificationId = id

    // Verify notification exists and belongs to the authenticated user
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('id, user_id, is_read')
      .eq('id', notificationId)
      .single()

    if (notificationError || !notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      )
    }

    if (notification.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - notification does not belong to you' },
        { status: 403 }
      )
    }

    // If already read, return success
    if (notification.is_read) {
      return NextResponse.json({
        success: true,
      })
    }

    // Update notification as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)

    if (updateError) {
      console.error('Error updating notification:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to mark notification as read', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('PATCH /api/notifications/[id]/read error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

