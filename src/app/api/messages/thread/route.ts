import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { effectiveItemStatus } from '@/lib/utils/item-status'
import type { MessageWithUsers } from '@/types'

/**
 * GET /api/messages/thread - Get messages for a specific conversation
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
    const itemId = searchParams.get('itemId')
    const userId = searchParams.get('userId')

    if (!itemId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: itemId and userId' },
        { status: 400 }
      )
    }

    // Prevent users from messaging themselves
    if (userId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot message yourself' },
        { status: 400 }
      )
    }

    // Verify item exists and user has permission to message about it
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, title, image_url, type, status, expires_at, deleted_at, posted_by')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    // For new conversations, verify the item is active and the user is not the owner
    // (item owner can't message themselves, but they can view existing conversations)
    const isItemOwner = item.posted_by === user.id
    const isMessagingOwner = item.posted_by === userId

    // Check if conversation already exists
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('sender_id, recipient_id')
      .eq('item_id', itemId)
      .is('deleted_at', null)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .limit(1)

    const hasExistingConversation = existingMessages && existingMessages.length > 0

    // If conversation exists, verify the user is part of it and the other user matches
    if (hasExistingConversation) {
      const conversationCheck = existingMessages[0]
      const otherUserId = conversationCheck.sender_id === user.id 
        ? conversationCheck.recipient_id 
        : conversationCheck.sender_id

      if (otherUserId !== userId) {
        return NextResponse.json(
          { success: false, error: 'Invalid conversation' },
          { status: 400 }
        )
      }
    } else {
      // For new conversations, verify:
      // 1. Item is active (or completed - can still message about completed items)
      // 2. User is not the item owner (they can't start a conversation with themselves)
      // 3. If messaging the owner, that's allowed
      const effective = effectiveItemStatus(item.status, item.expires_at)
      if (effective !== 'active' && item.status !== 'completed') {
        return NextResponse.json(
          { success: false, error: 'Item is not available for messaging' },
          { status: 400 }
        )
      }

      if (isItemOwner && !isMessagingOwner) {
        // Item owner trying to message someone else - this is allowed
        // (e.g., owner responding to someone who messaged them)
      } else if (!isItemOwner && !isMessagingOwner) {
        // Non-owner trying to message another non-owner - not allowed
        // Users can only message the item owner
        return NextResponse.json(
          { success: false, error: 'You can only message the item owner' },
          { status: 403 }
        )
      }
      // isMessagingOwner case is allowed - user can message the item owner
    }

    // Fetch messages for this conversation
    // Messages where: (sender=user AND recipient=otherUser) OR (sender=otherUser AND recipient=user)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        item_id,
        sender_id,
        recipient_id,
        content,
        is_read,
        read_at,
        created_at,
        sender:users!messages_sender_id_fkey(
          id,
          display_name,
          avatar_url,
          reputation_score
        ),
        recipient:users!messages_recipient_id_fkey(
          id,
          display_name,
          avatar_url,
          reputation_score
        )
      `)
      .eq('item_id', itemId)
      .is('deleted_at', null)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    // Filter messages client-side to ensure they're between the two users
    const filteredMessages = (messages || []).filter((msg: any) => {
      const isFromUserToOther = msg.sender_id === user.id && msg.recipient_id === userId
      const isFromOtherToUser = msg.sender_id === userId && msg.recipient_id === user.id
      return isFromUserToOther || isFromOtherToUser
    })

    if (messagesError) {
      console.error('Error fetching thread messages:', messagesError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages', details: messagesError.message },
        { status: 500 }
      )
    }

    // Item was already fetched above, no need to fetch again

    // Map messages to response format first (before checking user)
    const mappedMessages: MessageWithUsers[] = filteredMessages.map((msg: any) => {
      const sender = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender
      const recipient = Array.isArray(msg.recipient) ? msg.recipient[0] : msg.recipient

      return {
        id: msg.id,
        itemId: msg.item_id,
        senderId: msg.sender_id,
        recipientId: msg.recipient_id,
        content: msg.content,
        isRead: msg.is_read,
        readAt: msg.read_at,
        isFlagged: false, // Not needed for thread view
        flaggedBy: null,
        flaggedReason: null,
        createdAt: msg.created_at,
        sender: {
          id: sender?.id || msg.sender_id,
          displayName: sender?.display_name || 'Unknown',
          avatarUrl: sender?.avatar_url || null,
          reputationScore: sender?.reputation_score || 0,
        },
        recipient: {
          id: recipient?.id || msg.recipient_id,
          displayName: recipient?.display_name || 'Unknown',
          avatarUrl: recipient?.avatar_url || null,
          reputationScore: recipient?.reputation_score || 0,
        },
      }
    })

    // Fetch other user details (allow deleted users to show conversation history)
    const { data: otherUser, error: userError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, reputation_score, deleted_at')
      .eq('id', userId)
      .single()

    // If user is deleted, return a placeholder user (still allow viewing history)
    let finalOtherUser
    if (userError || !otherUser) {
      // Return placeholder for deleted users to allow viewing history
      finalOtherUser = {
        id: userId,
        displayName: 'Deleted User',
        avatarUrl: null,
        reputationScore: 0,
      }
    } else {
      finalOtherUser = {
        id: otherUser.id,
        displayName: otherUser.display_name,
        avatarUrl: otherUser.avatar_url,
        reputationScore: otherUser.reputation_score || 0,
      }
    }

    return NextResponse.json({
      success: true,
      messages: mappedMessages,
      item: {
        id: item.id,
        title: item.title,
        imageUrl: item.image_url,
        type: item.type,
      },
      otherUser: finalOtherUser,
    })
  } catch (error) {
    console.error('GET /api/messages/thread error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

