'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface UseRealtimeMessagesOptions {
  userId: string
  onNewMessage?: (message: Message) => void
  onMessageRead?: (messageId: string) => void
  enabled?: boolean
  onStatusChange?: (connected: boolean) => void
}

/**
 * Hook for subscribing to realtime message updates via Supabase Realtime
 * 
 * @param options - Configuration options
 * @param options.userId - Current user ID
 * @param options.onNewMessage - Callback when a new message is received
 * @param options.onMessageRead - Callback when a message is marked as read
 * @param options.enabled - Whether the subscription is enabled (default: true)
 * 
 * @example
 * ```tsx
 * useRealtimeMessages({
 *   userId: user.id,
 *   onNewMessage: (message) => {
 *     console.log('New message:', message)
 *     // Update UI, show notification, etc.
 *   },
 *   onMessageRead: (messageId) => {
 *     console.log('Message read:', messageId)
 *   },
 * })
 * ```
 */
export function useRealtimeMessages({
  userId,
  onNewMessage,
  onMessageRead,
  enabled = true,
  onStatusChange,
}: UseRealtimeMessagesOptions) {
  useEffect(() => {
    if (!enabled || !userId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.new && onNewMessage) {
            const msg = payload.new
            onNewMessage({
              id: msg.id,
              itemId: msg.item_id,
              senderId: msg.sender_id,
              recipientId: msg.recipient_id,
              content: msg.content,
              isRead: msg.is_read,
              readAt: msg.read_at,
              isFlagged: msg.is_flagged || false,
              flaggedBy: msg.flagged_by,
              flaggedReason: msg.flagged_reason,
              createdAt: msg.created_at,
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.new?.is_read && onMessageRead) {
            onMessageRead(payload.new.id)
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          onStatusChange?.(true)
          console.log('[Realtime Messages] ✅ Subscribed to message updates')
        } else if (status === 'CHANNEL_ERROR') {
          onStatusChange?.(false)
          console.error('[Realtime Messages] ❌ Subscription error', err)
          console.error(
            '[Realtime Messages] 💡 Make sure Realtime is enabled for the messages table:\n' +
            '   Run: ALTER PUBLICATION supabase_realtime ADD TABLE messages;'
          )
        } else if (status === 'TIMED_OUT') {
          onStatusChange?.(false)
          console.warn('[Realtime Messages] ⚠️ Subscription timed out')
        } else if (status === 'CLOSED') {
          onStatusChange?.(false)
          console.log('[Realtime Messages] 🔌 Subscription closed')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onNewMessage, onMessageRead, onStatusChange, enabled])
}
