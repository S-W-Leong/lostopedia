import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/api-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/users/[id]/badges
 * Get badges for a specific user
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { supabase, response: authResponse } = await requireApiUser()
    if (authResponse) return authResponse

    const { data: badges, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', id)
      .order('earned_at', { ascending: true })

    if (error) {
      console.error('Error fetching badges:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch badges' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      badges: (badges || []).map((b: any) => ({
        id: b.id,
        userId: b.user_id,
        badgeType: b.badge_type,
        earnedAt: b.earned_at,
      })),
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
