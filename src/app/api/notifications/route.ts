import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/types'

/**
 * GET /api/notifications - Fetch user's notifications
 * Query params: unreadOnly (boolean), limit (number, default 50), offset (number, default 0)
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validate limit and offset
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 100' },
        { status: 400 }
      )
    }

    if (offset < 0) {
      return NextResponse.json(
        { success: false, error: 'Offset must be non-negative' },
        { status: 400 }
      )
    }

    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Filter by read status if requested
    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: notifications, error: notificationsError, count } = await query

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch notifications', details: notificationsError.message },
        { status: 500 }
      )
    }

    // Get unread count separately
    const { count: unreadCount, error: unreadCountError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (unreadCountError) {
      console.error('Error fetching unread count:', unreadCountError)
      // Don't fail the request, just log the error
    }

    // Map database fields to domain types
    const mappedNotifications: Notification[] = (notifications || []).map((n) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type as Notification['type'],
      title: n.title,
      message: n.message,
      relatedItemId: n.related_item_id,
      relatedMessageId: n.related_message_id,
      actionUrl: n.action_url,
      isRead: n.is_read ?? false,
      readAt: n.read_at,
      createdAt: n.created_at ?? new Date().toISOString(),
    }))

    return NextResponse.json({
      success: true,
      notifications: mappedNotifications,
      total: count ?? 0,
      unreadCount: unreadCount ?? 0,
    })
  } catch (error) {
    console.error('GET /api/notifications error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

