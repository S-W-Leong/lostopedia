'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePolling } from './usePolling'
import { useRealtimeNotifications } from './useRealtimeNotifications'
import { APP_CONFIG } from '@/lib/constants'
import type { Notification } from '@/types'

export interface UseNotificationsOptions {
  unreadOnly?: boolean
  limit?: number
  offset?: number
  pollingInterval?: number
  /** When false, skips initial fetch and no API requests are made. Use for guests. Default true. */
  enabled?: boolean
  userId?: string | null
  useRealtime?: boolean
}

export interface UseNotificationsReturn {
  notifications: Notification[]
  total: number
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (notificationId: string) => Promise<boolean>
  markAllAsRead: () => Promise<number>
  refreshNotifications: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  isPolling: boolean
}

/**
 * Hook for managing notifications
 * Handles fetching notifications with pagination, marking as read, and realtime updates with polling fallback
 * 
 * @param options - Configuration options for fetching and polling
 * @param options.userId - Current user ID (optional, enables realtime when provided)
 * @param options.useRealtime - Whether to use realtime subscriptions (default: true if userId provided)
 * 
 * @returns Object with notifications data and control functions
 * 
 * @example
 * ```tsx
 * const { user } = useAuth()
 * const {
 *   notifications,
 *   unreadCount,
 *   loading,
 *   error,
 *   markAsRead,
 *   markAllAsRead,
 * } = useNotifications({ limit: 20, userId: user?.id })
 * ```
 */
export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const {
    unreadOnly = false,
    limit = 50,
    offset = 0,
    pollingInterval = APP_CONFIG.pollingIntervals.notifications,
    enabled = true,
    userId,
    useRealtime = !!userId,
  } = options

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      if (unreadOnly) {
        params.append('unreadOnly', 'true')
      }

      const response = await fetch(`/api/notifications?${params.toString()}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        // 401 / Unauthorized is expected for guests — treat as empty, no error
        if (response.status === 401 || data.error === 'Unauthorized') {
          setNotifications([])
          setTotal(0)
          setUnreadCount(0)
          setError(null)
          setLoading(false)
          return
        }
        if (response.status === 429) {
          throw new Error('RATE_LIMIT')
        }
        throw new Error(data.error || 'Failed to fetch notifications')
      }

      setNotifications(data.notifications || [])
      setTotal(data.total || 0)
      setUnreadCount(data.unreadCount || 0)
      setError(null)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [unreadOnly, limit, offset])

  // Initial fetch only when enabled (authenticated)
  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    fetchNotifications()
  }, [enabled, fetchNotifications])

  // Set up realtime subscriptions when userId is available
  useRealtimeNotifications({
    userId: userId || '',
    enabled: useRealtime && !!userId && enabled,
    onNewNotification: (notification) => {
      // Add new notification to the list
      setNotifications((prev) => [notification, ...prev])
      setTotal((prev) => prev + 1)
      if (!notification.isRead) {
        setUnreadCount((prev) => prev + 1)
      }
    },
  })

  // Set up polling as fallback (reduced frequency when realtime is active)
  const effectivePollingInterval = useRealtime && userId 
    ? pollingInterval * 4 // Poll less frequently when realtime is active
    : pollingInterval
  
  const { startPolling, stopPolling, isPolling } = usePolling(
    fetchNotifications,
    {
      interval: effectivePollingInterval,
      immediate: false, // Don't start immediately, let component control it
      pauseOnHidden: true,
      enabled: enabled && (!useRealtime || !userId), // Disable polling if realtime is active
    }
  )

  // Mark a single notification as read
  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'PATCH',
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to mark notification as read')
        }

        // Optimistically update the notification in the list
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        )

        // Update unread count
        setUnreadCount((prev) => Math.max(0, prev - 1))

        return true
      } catch (err) {
        console.error('Error marking notification as read:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as read'
        setError(errorMessage)
        return false
      }
    },
    []
  )

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to mark all notifications as read')
      }

      const count = data.count || 0

      // Optimistically update all notifications in the list
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: n.readAt || new Date().toISOString(),
        }))
      )

      // Update unread count
      setUnreadCount(0)

      return count
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all notifications as read'
      setError(errorMessage)
      return 0
    }
  }, [])

  // Manual refresh (no-op when disabled)
  const refreshNotifications = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    await fetchNotifications()
  }, [enabled, fetchNotifications])

  // Listen for custom events only when enabled
  useEffect(() => {
    if (!enabled) return
    const handleNotificationsUpdated = () => {
      fetchNotifications()
    }
    window.addEventListener('notificationsUpdated', handleNotificationsUpdated)
    return () => {
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated)
    }
  }, [enabled, fetchNotifications])

  return {
    notifications,
    total,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    startPolling,
    stopPolling,
    isPolling,
  }
}

