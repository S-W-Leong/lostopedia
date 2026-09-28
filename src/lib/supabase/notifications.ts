'use server'

import { createAdminClient } from './admin'
import { createClient } from './server'
import { NOTIFICATION_TYPES, type NotificationType } from '../constants'

export interface CreateNotificationData {
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedItemId?: string | null
  relatedMessageId?: string | null
  actionUrl?: string | null
}

export interface CreateNotificationResult {
  success: boolean
  notificationId?: string
  error?: {
    message: string
    code?: string
  }
}

/**
 * Create a notification
 * Uses service role client to bypass RLS for system-generated notifications
 */
export async function createNotification(
  data: CreateNotificationData
): Promise<CreateNotificationResult> {
  try {
    // Validate notification type
    if (!NOTIFICATION_TYPES.includes(data.type)) {
      return {
        success: false,
        error: {
          message: `Invalid notification type: ${data.type}`,
          code: 'INVALID_TYPE',
        },
      }
    }

    // Validate required fields
    if (!data.userId || !data.title || !data.message) {
      return {
        success: false,
        error: {
          message: 'Missing required fields: userId, title, and message are required',
          code: 'MISSING_FIELDS',
        },
      }
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Insert notification
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        related_item_id: data.relatedItemId || null,
        related_message_id: data.relatedMessageId || null,
        action_url: data.actionUrl || null,
        is_read: false,
      } as any)
      .select('id')
      .single()

    if (insertError || !notification) {
      console.error('Error creating notification:', insertError)
      return {
        success: false,
        error: {
          message: 'Failed to create notification',
          code: insertError?.code,
        },
      }
    }

    return {
      success: true,
      notificationId: (notification as any).id,
    }
  } catch (error) {
    console.error('Unexpected error creating notification:', error)
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred while creating notification',
        code: 'UNKNOWN_ERROR',
      },
    }
  }
}

/**
 * Get unread notification count for a user
 * Uses regular client (RLS will handle authorization)
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Error fetching unread notification count:', error)
      return 0
    }

    return count ?? 0
  } catch (error) {
    console.error('Unexpected error fetching unread notification count:', error)
    return 0
  }
}

