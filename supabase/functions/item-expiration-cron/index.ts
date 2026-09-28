// Supabase Edge Function for daily item expiration management
// This function runs as a cron job to:
// 1. Notify users about items expiring in 7 days
// 2. Mark expired items and notify users

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isAuthorizedCronRequest } from './auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Summary {
  expiringSoonCount: number
  expiredCount: number
  notificationsCreated: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, Allow: 'POST, OPTIONS', 'Content-Type': 'application/json' },
    })
  }

  if (!isAuthorizedCronRequest(req.headers.get('authorization'), Deno.env.get('CRON_SECRET'))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const summary: Summary = {
      expiringSoonCount: 0,
      expiredCount: 0,
      notificationsCreated: 0,
    }

    // 1. Find items expiring in 7 days (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND status = 'active')
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const now = new Date()

    const { data: expiringItems, error: expiringError } = await supabase
      .from('items')
      .select('id, title, posted_by, expires_at')
      .eq('status', 'active')
      .gte('expires_at', now.toISOString())
      .lte('expires_at', sevenDaysFromNow.toISOString())
      .is('deleted_at', null)

    if (expiringError) {
      console.error('Error fetching expiring items:', expiringError)
    } else {
      summary.expiringSoonCount = expiringItems?.length || 0

      // Create notifications for items expiring soon
      if (expiringItems && expiringItems.length > 0) {
        const notifications = expiringItems.map((item) => ({
          user_id: item.posted_by,
          type: 'item_expiring_soon',
          title: 'Item expiring soon',
          message: `Your item "${item.title}" will expire in 7 days. Consider extending it if it hasn't been found yet.`,
          related_item_id: item.id,
          related_message_id: null,
          action_url: `/item/${item.id}`,
          is_read: false,
        }))

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications)

        if (notificationError) {
          console.error('Error creating expiring soon notifications:', notificationError)
        } else {
          summary.notificationsCreated += notifications.length
        }
      }
    }

    // 2. Find items past expiration (WHERE expires_at < NOW() AND status = 'active')
    const { data: expiredItems, error: expiredError } = await supabase
      .from('items')
      .select('id, title, posted_by, expires_at')
      .eq('status', 'active')
      .lt('expires_at', now.toISOString())
      .is('deleted_at', null)

    if (expiredError) {
      console.error('Error fetching expired items:', expiredError)
    } else {
      summary.expiredCount = expiredItems?.length || 0

      // Update status to expired
      if (expiredItems && expiredItems.length > 0) {
        const expiredItemIds = expiredItems.map((item) => item.id)

        const { error: updateError } = await supabase
          .from('items')
          .update({ status: 'expired' })
          .in('id', expiredItemIds)

        if (updateError) {
          console.error('Error updating expired items:', updateError)
        } else {
          // Create notifications for expired items
          const notifications = expiredItems.map((item) => ({
            user_id: item.posted_by,
            type: 'item_expired',
            title: 'Item expired',
            message: `Your item "${item.title}" has expired and been archived. You can extend it if needed.`,
            related_item_id: item.id,
            related_message_id: null,
            action_url: `/item/${item.id}`,
            is_read: false,
          }))

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notifications)

          if (notificationError) {
            console.error('Error creating expired notifications:', notificationError)
          } else {
            summary.notificationsCreated += notifications.length
          }
        }
      }
    }

    // Return summary
    return new Response(
      JSON.stringify({
        success: true,
        summary,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Unexpected error in item-expiration-cron:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
