/**
 * Reputation Event Helper
 *
 * Creates reputation events using service role to bypass RLS.
 * Reputation events should only be created by the backend/system,
 * not directly by users.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Get Supabase service role client (bypasses RLS)
 */
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role credentials')
  }

  return createServiceClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export interface CreateReputationEventParams {
  userId: string
  eventType: 'item_posted' | 'item_completed' | 'item_returned' | 'item_flagged_valid' | 'banned' | 'admin_adjustment'
  pointsChange: number
  relatedItemId?: string
  relatedUserId?: string
  notes?: string
}

/**
 * Create a reputation event (bypasses RLS using service role)
 *
 * @returns { success: boolean, error?: string }
 */
export async function createReputationEvent(params: CreateReputationEventParams) {
  try {
    const supabase = getServiceRoleClient()

    const { error } = await supabase
      .from('reputation_events')
      .insert({
        user_id: params.userId,
        event_type: params.eventType,
        points_change: params.pointsChange,
        related_item_id: params.relatedItemId || null,
        related_user_id: params.relatedUserId || null,
        notes: params.notes || null,
      })

    if (error) {
      console.error('Error creating reputation event:', error)
      console.error('Attempted params:', params)
      return { success: false, error: error.message }
    }

    console.log('✅ Successfully created reputation event:', {
      userId: params.userId,
      eventType: params.eventType,
      pointsChange: params.pointsChange,
    })

    return { success: true }
  } catch (error) {
    console.error('Exception creating reputation event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
