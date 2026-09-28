import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/messages/unread-count - Get unread message count for current user
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

    // Use the database function to get unread count
    const { data, error } = await supabase.rpc('get_unread_message_count', {
      p_user_id: user.id,
    })

    if (error) {
      console.error('Error fetching unread count:', error)
      // Fallback: count manually if function doesn't work
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .is('deleted_at', null)

      if (countError) {
        throw countError
      }

      return NextResponse.json({
        success: true,
        count: count || 0,
      })
    }

    return NextResponse.json({
      success: true,
      count: data || 0,
    })
  } catch (error) {
    console.error('GET /api/messages/unread-count error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

