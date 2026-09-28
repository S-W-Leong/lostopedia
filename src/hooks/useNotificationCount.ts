'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { usePolling } from './usePolling'
import { APP_CONFIG } from '@/lib/constants'
import { useRealtimeNotifications } from './useRealtimeNotifications'
import { organization } from '@/lib/organization/config'

export interface UseNotificationCountOptions {
  pollingInterval?: number
  /** When false, skips initial fetch and no API requests are made. Use for guests. Default true. */
  enabled?: boolean
  userId?: string
}

export interface UseNotificationCountReturn {
  unreadCount: number
  loading: boolean
  error: string | null
  refreshCount: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  isPolling: boolean
}

/**
 * Lightweight hook for unread notification count only
 * Used in header badge and other places where only the count is needed
 * 
 * @param options - Configuration options for polling
 * @returns Object with unread count data and control functions
 * 
 * @example
 * ```tsx
 * const { unreadCount, loading } = useNotificationCount()
 * ```
 */
export function useNotificationCount(
  options: UseNotificationCountOptions = {}
): UseNotificationCountReturn {
  const {
    pollingInterval = APP_CONFIG.pollingIntervals.notifications,
    enabled = true,
    userId = '',
  } = options

  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const previousCountRef = useRef<number | null>(null)

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=1&unreadOnly=true')
      const data = await response.json()

      if (!response.ok || !data.success) {
        // Handle authentication errors silently (user might not be logged in)
        if (response.status === 401 || data.error === 'Unauthorized') {
          setUnreadCount(0)
          setError(null)
          setLoading(false)
          return
        }
        throw new Error(data.error || 'Failed to fetch unread count')
      }

      const newCount = data.unreadCount || 0
      const previousCount = previousCountRef.current

      // Check if count increased (new notifications arrived)
      // Only show notification if we had a previous count (not initial load) and count increased
      if (previousCount !== null && previousCount >= 0 && newCount > previousCount) {
        // Trigger browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          const diff = newCount - previousCount
          new Notification('New Notifications', {
            body: `You have ${diff} new notification${diff > 1 ? 's' : ''}`,
            icon: organization.logoPath,
            tag: 'new-notifications',
          })
        }
      }

      setUnreadCount(newCount)
      setError(null)
      previousCountRef.current = newCount
    } catch (err) {
      console.error('Error fetching unread notification count:', err)
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
    interval: Math.max(pollingInterval, 300_000),
    immediate: false, // Don't start immediately, let component control it
    pauseOnHidden: true,
    enabled: enabled,
  })

  const handleRealtimeStatus = useCallback((connected: boolean) => {
    if (connected) {
      stopPolling()
    } else if (enabled && userId) {
      startPolling()
    }
  }, [enabled, startPolling, stopPolling, userId])

  useRealtimeNotifications({
    userId,
    enabled: enabled && Boolean(userId),
    onNewNotification: fetchUnreadCount,
    onStatusChange: handleRealtimeStatus,
  })

  // Manual refresh (no-op when disabled)
  const refreshCount = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    await fetchUnreadCount()
  }, [enabled, fetchUnreadCount])

  // Listen for custom events from other parts of the app (only when enabled)
  useEffect(() => {
    if (!enabled) return
    const handleNotificationsUpdated = () => {
      fetchUnreadCount()
    }
    window.addEventListener('notificationsUpdated', handleNotificationsUpdated)
    return () => {
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated)
    }
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
