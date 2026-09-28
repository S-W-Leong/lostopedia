'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface UseRealtimeNotificationsOptions {
  userId: string
  onNewNotification?: (notification: Notification) => void
  enabled?: boolean
  onStatusChange?: (connected: boolean) => void
}

/**
 * Hook for subscribing to realtime notification updates via Supabase Realtime
 * 
 * @param options - Configuration options
 * @param options.userId - Current user ID
 * @param options.onNewNotification - Callback when a new notification is received
 * @param options.enabled - Whether the subscription is enabled (default: true)
 * 
 * @example
 * ```tsx
 * useRealtimeNotifications({
 *   userId: user.id,
 *   onNewNotification: (notification) => {
 *     console.log('New notification:', notification)
 *     // Update UI, show toast, update badge count, etc.
 *   },
 * })
 * ```
 */
export function useRealtimeNotifications({
  userId,
  onNewNotification,
  enabled = true,
  onStatusChange,
}: UseRealtimeNotificationsOptions) {
  useEffect(() => {
    if (!enabled || !userId) return

    const supabase = createClient()

    // Subscribe without server-side filter to avoid Realtime "binding mismatch" CHANNEL_ERROR.
    // RLS ensures we only receive rows we can SELECT (our own); we filter by user_id in the callback as well.
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          const notif = payload.new
          if (!notif || notif.user_id !== userId) return
          if (onNewNotification) {
            onNewNotification({
              id: notif.id,
              userId: notif.user_id,
              type: notif.type,
              title: notif.title,
              message: notif.message,
              relatedItemId: notif.related_item_id,
              relatedMessageId: notif.related_message_id,
              actionUrl: notif.action_url,
              isRead: notif.is_read,
              readAt: notif.read_at,
              createdAt: notif.created_at,
            })
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          onStatusChange?.(true)
          console.log('[Realtime Notifications] ✅ Subscribed to notification updates')
        } else if (status === 'CHANNEL_ERROR') {
          onStatusChange?.(false)
          const errMessage = err?.message ?? (err && String(err)) ?? 'Unknown (table may not be in Realtime publication)'
          console.error('[Realtime Notifications] ❌ Subscription error', errMessage)
          console.error(
            '[Realtime Notifications] 💡 Enable Realtime for the notifications table:\n' +
            '   1. Run migration: supabase/migrations/00018_enable_realtime.sql\n' +
            '   2. Or run: ALTER PUBLICATION supabase_realtime ADD TABLE notifications;\n' +
            '   3. In Dashboard: Database → Replication → ensure "notifications" is listed.'
          )
        } else if (status === 'TIMED_OUT') {
          onStatusChange?.(false)
          console.warn('[Realtime Notifications] ⚠️ Subscription timed out')
        } else if (status === 'CLOSED') {
          onStatusChange?.(false)
          console.log('[Realtime Notifications] 🔌 Subscription closed')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onNewNotification, onStatusChange, enabled])
}
