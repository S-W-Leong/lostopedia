import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserStats } from '@/types'

/**
 * GET /api/stats - Get user statistics
 * Returns stats for the authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase.rpc('get_dashboard_stats')
    if (error) {
      console.error('Error fetching dashboard stats:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }
    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 })
    }

    // Build stats response
    const stats: UserStats = {
      totalItems: Number(row.total_items || 0),
      activeItems: Number(row.active_items || 0),
      completedItems: Number(row.completed_items || 0),
      expiredItems: Number(row.expired_items || 0),
      unreadMessages: Number(row.unread_messages || 0),
      unreadNotifications: Number(row.unread_notifications || 0),
    }

    return NextResponse.json({
      success: true,
      stats,
      profile: {
        reputationScore: Number(row.reputation_score || 0),
        totalItemsRecovered: Number(row.total_items_recovered || 0),
        totalItemsReturned: Number(row.total_items_returned || 0),
      },
      expiringSoon: Number(row.expiring_soon || 0),
    })
  } catch (error) {
    console.error('GET /api/stats error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
