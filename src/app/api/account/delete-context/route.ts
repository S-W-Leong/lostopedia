import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/account/delete-context
 * Returns counts used by the "Delete account" confirmation modal:
 * activeItemsCount, conversationsCount.
 * Enables copy like "You have N active listings and M conversations."
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { count: activeItemsCount } = await supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('posted_by', user.id)
      .is('deleted_at', null)

    const { data: convResult } = await (supabase as any).rpc('get_user_conversations', {
      p_user_id: user.id,
      p_limit: 1,
      p_offset: 0,
      p_unread_only: false,
    })
    const conversationsCount =
      Array.isArray(convResult) && convResult.length > 0
        ? Number(convResult[0]?.total_count ?? 0)
        : 0

    return NextResponse.json({
      success: true,
      activeItemsCount: activeItemsCount ?? 0,
      conversationsCount,
    })
  } catch (error) {
    console.error('GET /api/account/delete-context error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
