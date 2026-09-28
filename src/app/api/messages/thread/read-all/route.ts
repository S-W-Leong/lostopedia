import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH /api/messages/thread/read-all - Mark all messages in a thread as read
 */
export async function PATCH(request: NextRequest) {
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
    const itemId = searchParams.get('itemId')
    const userId = searchParams.get('userId')

    if (!itemId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: itemId and userId' },
        { status: 400 }
      )
    }

    // Verify user is part of the conversation
    const { data: conversationCheck, error: checkError } = await supabase
      .from('messages')
      .select('sender_id, recipient_id')
      .eq('item_id', itemId)
      .is('deleted_at', null)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .limit(1)
      .single()

    if (checkError || !conversationCheck) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found or access denied' },
        { status: 404 }
      )
    }

    // Update all unread messages in the conversation where user is recipient
    const { data: updatedMessages, error: updateError } = await supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('item_id', itemId)
      .eq('recipient_id', user.id)
      .is('deleted_at', null)
      .eq('is_read', false)
      .select('id')

    if (updateError) {
      console.error('Error updating messages:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to mark messages as read', details: updateError.message },
        { status: 500 }
      )
    }

    const updatedCount = updatedMessages?.length || 0

    // Mark related notifications as read
    let notificationsUpdatedCount = 0
    if (updatedMessages && updatedMessages.length > 0) {
      const messageIds = updatedMessages.map((msg) => msg.id)
      
      const { data: updatedNotifications, error: notificationError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('type', 'new_message')
        .in('related_message_id', messageIds)
        .eq('is_read', false)
        .select('id')

      if (notificationError) {
        // Log error but don't fail the request - messages are already marked as read
        console.error('Error updating notifications:', notificationError)
      } else {
        notificationsUpdatedCount = updatedNotifications?.length || 0
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      notificationsUpdatedCount,
    })
  } catch (error) {
    console.error('PATCH /api/messages/thread/read-all error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

