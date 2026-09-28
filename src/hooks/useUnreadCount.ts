'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { usePolling } from './usePolling'
import { useRealtimeMessages } from './useRealtimeMessages'
import { organization } from '@/lib/organization/config'

export interface UseUnreadCountOptions {
  /** When false, skips initial fetch and no API requests are made. Use for guests. Default true. */
  enabled?: boolean
  userId?: string
}

export interface UseUnreadCountReturn {
  unreadCount: number
  loading: boolean
  error: string | null
  refreshCount: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  isPolling: boolean
}

/**
 * Hook for managing unread message count
 * Handles fetching unread count and polling for updates.
 * When enabled is false (e.g. unauthenticated), no requests are made.
 *
 * @param options.enabled - If false, skips fetch and polling. Default true.
 * @returns Object with unread count data and control functions
 *
 * @example
 * ```tsx
 * const { unreadCount } = useUnreadCount({ enabled: !!user })
 * ```
 */
export function useUnreadCount(options: UseUnreadCountOptions = {}): UseUnreadCountReturn {
  const { enabled = true, userId = '' } = options
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const previousCountRef = useRef<number | null>(null)

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/messages/unread-count')
      const data = await response.json()

      // 401 / Unauthorized is expected for guests or expired sessions — treat as zero unread
      if (response.status === 401 || data.error === 'Unauthorized') {
        setUnreadCount(0)
        setError(null)
        setLoading(false)
        return
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch unread count')
      }

      const newCount = data.count || 0
      const previousCount = previousCountRef.current

      // Check if count increased (new messages arrived)
      // Only show notification if we had a previous count (not initial load) and count increased
      if (previousCount !== null && previousCount >= 0 && newCount > previousCount) {
        // Trigger browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          const diff = newCount - previousCount
          new Notification('New Messages', {
            body: `You have ${diff} new message${diff > 1 ? 's' : ''}`,
            icon: organization.logoPath,
            tag: 'new-messages',
          })
        }
      }

      setUnreadCount(newCount)
      setError(null)
      previousCountRef.current = newCount
    } catch (err) {
      console.error('Error fetching unread count:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load unread count'
      setError(errorMessage)
      // Don't throw, just set error state
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch only when enabled (authenticated)
  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    fetchUnreadCount()
  }, [enabled, fetchUnreadCount])

  // Request notification permission only when enabled
  useEffect(() => {
    if (!enabled) return
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch((err) => {
        console.error('Error requesting notification permission:', err)
      })
    }
  }, [enabled])

  // Set up polling
  const { startPolling, stopPolling, isPolling } = usePolling(fetchUnreadCount, {
    interval: 300_000,
    immediate: false,
    pauseOnHidden: true,
    enabled,
  })

  const handleRealtimeStatus = useCallback((connected: boolean) => {
    if (connected) {
      stopPolling()
    } else if (enabled && userId) {
      startPolling()
    }
  }, [enabled, startPolling, stopPolling, userId])

  useRealtimeMessages({
    userId,
    enabled: enabled && Boolean(userId),
    onNewMessage: fetchUnreadCount,
    onMessageRead: fetchUnreadCount,
    onStatusChange: handleRealtimeStatus,
  })

  // Manual refresh (no-op when disabled)
  const refreshCount = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    await fetchUnreadCount()
  }, [enabled, fetchUnreadCount])

  return {
    unreadCount,
    loading,
    error,
    refreshCount,
    startPolling,
    stopPolling,
    isPolling,
  }
}
