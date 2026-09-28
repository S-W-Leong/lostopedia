'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { usePolling } from './usePolling'
import { createClient } from '@/lib/supabase/client'
import { APP_CONFIG } from '@/lib/constants'
import type { MessageWithUsers, Message } from '@/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface UseMessageThreadReturn {
  messages: MessageWithUsers[]
  item: {
    id: string
    title: string
    imageUrl: string | null
    type: 'lost' | 'found'
  } | null
  otherUser: {
    id: string
    displayName: string
    avatarUrl: string | null
    reputationScore: number
  } | null
  loading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<Message | null>
  markAsRead: () => Promise<void>
  refreshThread: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  isPolling: boolean
}

/**
 * Hook for managing a message thread
 * Handles fetching thread messages, sending messages, marking as read, polling,
 * and optional Realtime subscription for live updates when viewing the thread.
 *
 * When currentUserId is provided, subscribes to Supabase Realtime for this
 * thread and uses a longer polling interval as fallback.
 *
 * @param itemId - The item ID for the conversation
 * @param otherUserId - The other user's ID in the conversation
 * @param currentUserId - Current user ID; when set, enables Realtime for this thread and reduces polling
 * @returns Object with thread data and control functions
 *
 * @example
 * ```tsx
 * const {
 *   messages,
 *   item,
 *   otherUser,
 *   loading,
 *   error,
 *   sendMessage,
 *   markAsRead,
 * } = useMessageThread(itemId, otherUserId, currentUserId)
 * ```
 */
export function useMessageThread(
  itemId: string | null,
  otherUserId: string | null,
  currentUserId?: string | null
): UseMessageThreadReturn {
  const [messages, setMessages] = useState<MessageWithUsers[]>([])
  const [item, setItem] = useState<{
    id: string
    title: string
    imageUrl: string | null
    type: 'lost' | 'found'
  } | null>(null)
  const [otherUser, setOtherUser] = useState<{
    id: string
    displayName: string
    avatarUrl: string | null
    reputationScore: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch thread data
  const fetchThread = useCallback(async () => {
    if (!itemId || !otherUserId) {
      setError('Missing required parameters')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(
        `/api/messages/thread?itemId=${itemId}&userId=${otherUserId}`
      )
      const data = await response.json()

      if (!response.ok || !data.success) {
        // Handle authentication errors
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED')
        }
        // Handle rate limiting
        if (response.status === 429) {
          throw new Error('RATE_LIMIT')
        }
        // Handle not found errors
        if (response.status === 404) {
          const errorMsg = (data.error || 'Thread not found').toLowerCase()
          if (errorMsg.includes('item not found')) {
            throw new Error('ITEM_NOT_FOUND')
          } else if (errorMsg.includes('user not found')) {
            throw new Error('USER_NOT_FOUND')
          } else if (
            errorMsg.includes('conversation not found') ||
            errorMsg.includes('access denied') ||
            errorMsg.includes('conversation could not be found')
          ) {
            throw new Error('CONVERSATION_NOT_FOUND')
          }
          throw new Error(data.error || 'Thread not found')
        }
        // Handle forbidden errors (403)
        if (response.status === 403) {
          throw new Error('CONVERSATION_NOT_FOUND')
        }
        throw new Error(data.error || 'Failed to fetch thread')
      }

      setMessages(data.messages || [])
      setItem(data.item || null)
      setOtherUser(data.otherUser || null)
      setError(null)
    } catch (err) {
      console.error('Error fetching thread:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load thread'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [itemId, otherUserId])

  // Ref so Realtime callback always calls latest fetchThread
  const fetchThreadRef = useRef(fetchThread)
  useEffect(() => {
    fetchThreadRef.current = fetchThread
  }, [fetchThread])

  // Initial fetch
  useEffect(() => {
    if (itemId && otherUserId) {
      setLoading(true)
      fetchThread()
    } else if (itemId === null || otherUserId === null) {
      setError('Missing required parameters')
      setLoading(false)
    }
  }, [itemId, otherUserId, fetchThread])

  // Realtime subscription for this thread when currentUserId is provided (thread view open)
  // Filter by item_id; in handler we only process rows where current user is sender or recipient
  useEffect(() => {
    if (!itemId || !otherUserId || !currentUserId) return

    const supabase = createClient()
    const channelName = `thread:${itemId}:${currentUserId}`

    const handleChange = (payload: RealtimePostgresChangesPayload<{
      id: string
      item_id: string
      sender_id: string
      recipient_id: string
      is_read?: boolean
    }>) => {
      const row = payload.new as { sender_id?: string; recipient_id?: string } | null
      if (!row || row.sender_id === undefined || row.recipient_id === undefined) return
      if (row.sender_id !== currentUserId && row.recipient_id !== currentUserId) return
      fetchThreadRef.current()
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `item_id=eq.${itemId}`,
        },
        handleChange
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `item_id=eq.${itemId}`,
        },
        handleChange
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime Thread] ✅ Subscribed to thread updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime Thread] ❌ Subscription error', err)
        } else if (status === 'CLOSED') {
          console.log('[Realtime Thread] 🔌 Subscription closed')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [itemId, otherUserId, currentUserId])

  // Polling: longer interval when Realtime is active (currentUserId set) as fallback
  const pollingInterval =
    currentUserId != null
      ? APP_CONFIG.pollingIntervals.messages * 4
      : APP_CONFIG.pollingIntervals.messages

  const { startPolling, stopPolling, isPolling } = usePolling(
    fetchThread,
    {
      interval: pollingInterval,
      immediate: false, // Don't start immediately, wait a bit after initial load
      pauseOnHidden: true,
      enabled: !!itemId && !!otherUserId,
    }
  )

  // Start polling after initial load
  useEffect(() => {
    if (!loading && itemId && otherUserId) {
      // Wait a bit to avoid duplicate requests right after initial load
      const timeoutId = setTimeout(() => {
        startPolling()
      }, APP_CONFIG.pollingIntervals.messages)

      return () => {
        clearTimeout(timeoutId)
        stopPolling()
      }
    }
  }, [loading, itemId, otherUserId, startPolling, stopPolling])

  // Send a new message
  const sendMessage = useCallback(
    async (content: string): Promise<Message | null> => {
      if (!itemId || !otherUserId) {
        throw new Error('Missing required parameters')
      }

      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId,
            recipientId: otherUserId,
            content: content.trim(),
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to send message')
        }

        // Optimistically add the message to the list
        // The full message with user data will come from the next poll
        if (otherUser) {
          const optimisticMessage: MessageWithUsers = {
            ...data.message,
            sender: {
              id: data.message.senderId,
              displayName: 'You', // Will be replaced on next fetch
              avatarUrl: null,
              reputationScore: 0,
            },
            recipient: otherUser,
          }
          setMessages((prev) => [...prev, optimisticMessage])
        }

        // Refresh thread to get the full message data
        await fetchThread()

        return data.message
      } catch (err) {
        console.error('Error sending message:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
        setError(errorMessage)
        throw err
      }
    },
    [itemId, otherUserId, otherUser, fetchThread]
  )

  // Mark all messages in thread as read
  const markAsRead = useCallback(async () => {
    if (!itemId || !otherUserId) return

    try {
      const response = await fetch(
        `/api/messages/thread/read-all?itemId=${itemId}&userId=${otherUserId}`,
        {
          method: 'PATCH',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to mark messages as read')
      }

      // Update local state to reflect read status
      // Mark messages where the other user is the sender (they sent it to me)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId === otherUserId && !msg.isRead
            ? { ...msg, isRead: true, readAt: new Date().toISOString() }
            : msg
        )
      )

      // Dispatch a custom event to notify components that notifications should be refreshed
      // This allows the notification dropdown to update its counts immediately
      if (data.notificationsUpdatedCount > 0) {
        window.dispatchEvent(new CustomEvent('notificationsUpdated', { 
          detail: { count: data.notificationsUpdatedCount } 
        }))
      }
    } catch (err) {
      console.error('Error marking messages as read:', err)
      // Don't throw, just log the error
    }
  }, [itemId, otherUserId])

  // Manual refresh
  const refreshThread = useCallback(async () => {
    setLoading(true)
    await fetchThread()
  }, [fetchThread])

  // Auto-mark as read when messages are loaded
  useEffect(() => {
    if (messages.length > 0 && !loading && otherUserId) {
      // Check if there are unread messages where the other user is the sender
      const hasUnread = messages.some(
        (msg) => msg.senderId === otherUserId && !msg.isRead
      )
      if (hasUnread) {
        markAsRead()
      }
    }
  }, [messages, loading, otherUserId, markAsRead])

  return {
    messages,
    item,
    otherUser,
    loading,
    error,
    sendMessage,
    markAsRead,
    refreshThread,
    startPolling,
    stopPolling,
    isPolling,
  }
}

