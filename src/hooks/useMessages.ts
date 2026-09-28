'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePolling } from './usePolling'
import { useRealtimeMessages } from './useRealtimeMessages'
import { APP_CONFIG } from '@/lib/constants'
import type { Conversation, Message } from '@/types'

export interface UseMessagesOptions {
  userId?: string | null
  useRealtime?: boolean
}

export interface UseMessagesReturn {
  conversations: Conversation[]
  loading: boolean
  error: string | null
  sendMessage: (itemId: string, recipientId: string, content: string) => Promise<Message | null>
  refreshConversations: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  isPolling: boolean
}

/**
 * Hook for managing conversations (inbox view)
 * Handles fetching conversations, sending messages, and realtime updates with polling fallback
 * 
 * @param options - Configuration options
 * @param options.userId - Current user ID (optional, enables realtime when provided)
 * @param options.useRealtime - Whether to use realtime subscriptions (default: true if userId provided)
 * 
 * @returns Object with conversations data and control functions
 * 
 * @example
 * ```tsx
 * const { user } = useAuth()
 * const {
 *   conversations,
 *   loading,
 *   error,
 *   sendMessage,
 *   refreshConversations,
 * } = useMessages({ userId: user?.id })
 * ```
 */
export function useMessages(options: UseMessagesOptions = {}): UseMessagesReturn {
  const { userId, useRealtime = !!userId } = options
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/messages')
      const data = await response.json()

      if (!response.ok || !data.success) {
        // Handle authentication errors
        if (response.status === 401) {
          // Redirect to login - will be handled by component
          throw new Error('UNAUTHORIZED')
        }
        // Handle rate limiting
        if (response.status === 429) {
          throw new Error('RATE_LIMIT')
        }
        throw new Error(data.error || 'Failed to fetch conversations')
      }

      setConversations(data.conversations || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching conversations:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations'
      setError(errorMessage)
      // Don't throw, just set error state (polling should continue)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Set up realtime subscriptions when userId is available
  useRealtimeMessages({
    userId: userId || '',
    enabled: useRealtime && !!userId,
    onNewMessage: (_message) => {
      // When a new message arrives, refresh conversations to update the list
      fetchConversations()
    },
  })

  // Set up polling as fallback (reduced frequency when realtime is active)
  const pollingInterval = useRealtime && userId 
    ? APP_CONFIG.pollingIntervals.inbox * 4 // Poll less frequently when realtime is active
    : APP_CONFIG.pollingIntervals.inbox
  
  const { startPolling, stopPolling, isPolling } = usePolling(
    fetchConversations,
    {
      interval: pollingInterval,
      immediate: false, // Don't start immediately, let component control it
      pauseOnHidden: true,
      enabled: !useRealtime || !userId, // Disable polling if realtime is active
    }
  )

  // Send a new message
  const sendMessage = useCallback(
    async (itemId: string, recipientId: string, content: string): Promise<Message | null> => {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId,
            recipientId,
            content: content.trim(),
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to send message')
        }

        // Refresh conversations to update the list
        // With realtime, this will be updated automatically, but we refresh to be safe
        await fetchConversations()

        return data.message
      } catch (err) {
        console.error('Error sending message:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
        setError(errorMessage)
        throw err
      }
    },
    [fetchConversations]
  )

  // Manual refresh
  const refreshConversations = useCallback(async () => {
    setLoading(true)
    await fetchConversations()
  }, [fetchConversations])

  return {
    conversations,
    loading,
    error,
    sendMessage,
    refreshConversations,
    startPolling,
    stopPolling,
    isPolling,
  }
}

