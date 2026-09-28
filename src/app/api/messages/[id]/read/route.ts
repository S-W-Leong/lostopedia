import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH /api/messages/[id]/read - Mark a message as read
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
    const messageId = id

    // Verify message exists and user is the recipient
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, recipient_id, is_read')
      .eq('id', messageId)
      .is('deleted_at', null)
      .single()

    if (messageError || !message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      )
    }

    const messageData = message as any
    
    if (messageData.recipient_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - you are not the recipient' },
        { status: 403 }
      )
    }

    // If already read, return success
    if (messageData.is_read) {
      return NextResponse.json({
        success: true,
        message: {
          id: messageData.id,
          isRead: true,
          readAt: new Date().toISOString(),
        },
      })
    }

    // Update message as read
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      // @ts-ignore - Supabase type inference issue
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select('id, is_read, read_at')
      .single()

    if (updateError) {
      console.error('Error updating message:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to mark message as read', details: updateError.message },
        { status: 500 }
      )
    }

    const updatedMessageData = updatedMessage as any
    
    return NextResponse.json({
      success: true,
      message: {
        id: updatedMessageData.id,
        isRead: updatedMessageData.is_read,
        readAt: updatedMessageData.read_at,
      },
    })
  } catch (error) {
    console.error('PATCH /api/messages/[id]/read error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

