import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessageSchema } from '@/lib/validations/message'
import { createNotification } from '@/lib/supabase/notifications'
import type { Conversation, Message } from '@/types'
import { APP_CONFIG } from '@/lib/constants'
import { rateLimiters } from '@/lib/ratelimit'
import { createApiErrorResponse } from '@/lib/utils/errors'
import { sanitizeDisplayName, sanitizeItemTitle } from '@/lib/utils/sanitize'
import { effectiveItemStatus } from '@/lib/utils/item-status'

/**
 * POST /api/messages - Send a new message
 */
export async function POST(request: NextRequest) {
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

    // Check rate limit for messaging
    const rateLimit = await rateLimiters.messaging(user.id)
    if (!rateLimit.success) {
      const resetDate = new Date(rateLimit.reset).toLocaleTimeString()
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. You can send more messages after ${resetDate}.`,
        },
        { status: 429, headers: { 'X-RateLimit-Reset': String(rateLimit.reset) } }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = sendMessageSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { itemId, recipientId, content } = validationResult.data

    // Verify recipient is not the sender
    if (recipientId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot send message to yourself' },
        { status: 400 }
      )
    }

    // Verify recipient exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recipient, error: recipientError } = await (supabase as any)
      .from('users')
      .select('id')
      .eq('id', recipientId)
      .is('deleted_at', null)
      .single() as { data: { id: string } | null; error: any }

    if (recipientError || !recipient) {
      return NextResponse.json(
        { success: false, error: 'Recipient not found' },
        { status: 404 }
      )
    }

    // Verify item exists and is active, and fetch title for notification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: item, error: itemError } = await (supabase as any)
      .from('items')
      .select('id, status, title, expires_at')
      .eq('id', itemId)
      .is('deleted_at', null)
      .single() as {
        data: { id: string; status: string; title: string; expires_at: string | null } | null
        error: any
      }

    if (itemError || !item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    // Allow messaging for active (not past expiry) and completed items
    const effective = effectiveItemStatus(item.status, item.expires_at)
    if (effective !== 'active' && item.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Item is not available for messaging' },
        { status: 400 }
      )
    }

    // Fetch sender's display name for notification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sender, error: senderError } = await (supabase as any)
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single() as { data: { display_name: string } | null; error: any }

    if (senderError || !sender) {
      console.error('Error fetching sender:', senderError)
      // Don't fail the message send, just log the error
    }

    // Insert message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: message, error: insertError } = await (supabase as any)
      .from('messages')
      .insert({
        item_id: itemId,
        sender_id: user.id,
        recipient_id: recipientId,
        content: content.trim(),
        is_read: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting message:', insertError)
      return NextResponse.json(
        createApiErrorResponse(insertError, 'Failed to send message'),
        { status: 500 }
      )
    }

    // Create notification for recipient
    try {
      // Sanitize user-controlled content to prevent XSS in notification contexts
      const senderName = sanitizeDisplayName(sender?.display_name)
      const itemTitle = sanitizeItemTitle(item.title)

      await createNotification({
        userId: recipientId,
        type: 'new_message',
        title: 'New message',
        message: `${senderName} sent you a message about "${itemTitle}"`,
        relatedItemId: itemId,
        relatedMessageId: message.id,
        actionUrl: `/messages/thread?itemId=${itemId}&userId=${user.id}`,
      })
    } catch (notificationError) {
      // Don't fail the message send if notification creation fails
      // Just log the error
      console.error('Error creating notification:', notificationError)
    }

    // Map to response format
    const response: Message = {
      id: message.id,
      itemId: message.item_id,
      senderId: message.sender_id,
      recipientId: message.recipient_id,
      content: message.content,
      isRead: message.is_read,
      readAt: message.read_at,
      isFlagged: message.is_flagged,
      flaggedBy: message.flagged_by,
      flaggedReason: message.flagged_reason,
      createdAt: message.created_at,
    }

    return NextResponse.json({
      success: true,
      message: response,
    })
  } catch (error) {
    console.error('POST /api/messages error:', error)
    return NextResponse.json(
      createApiErrorResponse(error, 'Internal server error'),
      { status: 500 }
    )
  }
}

/**
 * GET /api/messages - List conversations (inbox view)
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
    const limit = parseInt(searchParams.get('limit') || String(APP_CONFIG.itemsPerPage), 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Use optimized database function for conversation aggregation
    // This replaces the inefficient JavaScript-based grouping
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conversations, error: rpcError } = await (supabase as any).rpc(
      'get_user_conversations',
      {
        p_user_id: user.id,
        p_limit: limit,
        p_offset: offset,
        p_unread_only: unreadOnly,
      }
    )

    if (rpcError) {
      console.error('Error fetching conversations:', rpcError)
      return NextResponse.json(
        createApiErrorResponse(rpcError, 'Failed to fetch messages'),
        { status: 500 }
      )
    }

    if (!conversations || conversations.length === 0) {
      // Get total count from first result if available, otherwise 0
      const total = conversations?.[0]?.total_count || 0
      return NextResponse.json({
        success: true,
        conversations: [],
        total: Number(total),
      })
    }

    // Transform RPC results to Conversation format
    // The total_count is the same for all rows, so we get it from the first one
    const total = Number(conversations[0]?.total_count || 0)
    
    const transformedConversations: Conversation[] = conversations.map((conv: any) => ({
      itemId: conv.item_id,
      item: {
        id: conv.item_id,
        title: conv.item_title,
        imageUrl: conv.item_image_url,
        type: conv.item_type,
      },
      otherUser: {
        id: conv.other_user_id,
        displayName: conv.other_user_name,
        avatarUrl: conv.other_user_avatar,
        reputationScore: Number(conv.other_user_reputation) || 0,
      },
      lastMessage: {
        id: conv.last_message_id,
        content: conv.last_message_content,
        createdAt: conv.last_message_at,
        isRead: conv.last_message_is_read,
        senderId: conv.last_message_sender_id,
      },
      unreadCount: Number(conv.unread_count) || 0,
    }))

    return NextResponse.json({
      success: true,
      conversations: transformedConversations,
      total,
    })
  } catch (error) {
    console.error('GET /api/messages error:', error)
    return NextResponse.json(
      createApiErrorResponse(error, 'Internal server error'),
      { status: 500 }
    )
  }
}

