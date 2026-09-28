import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH /api/notifications/read-all - Mark all user's notifications as read
 */
export async function PATCH(_request: NextRequest) {
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

    // Update all unread notifications for the user
    const { data: updatedNotifications, error: updateError } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .select('id')

    if (updateError) {
      console.error('Error updating notifications:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to mark notifications as read', details: updateError.message },
        { status: 500 }
      )
    }

    const count = updatedNotifications?.length || 0

    return NextResponse.json({
      success: true,
      count,
    })
  } catch (error) {
    console.error('PATCH /api/notifications/read-all error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

