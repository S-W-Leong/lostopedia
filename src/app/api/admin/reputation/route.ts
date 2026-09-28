import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createReputationEvent } from '@/lib/supabase/reputation'

/**
 * POST /api/admin/reputation
 * Manually create reputation event and adjust user's reputation
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await requireAdmin()

    const body = await request.json()
    const { userId, points, reason, relatedItemId } = body

    // Validate inputs
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (typeof points !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Points must be a number' },
        { status: 400 }
      )
    }

    if (points < -500 || points > 500) {
      return NextResponse.json(
        { success: false, error: 'Points must be between -500 and 500' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(points)) {
      return NextResponse.json(
        { success: false, error: 'Points must be an integer' },
        { status: 400 }
      )
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Reason must be at least 10 characters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('reputation_score')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const currentScore = (user as any).reputation_score

    // Create reputation event (trigger will automatically update the score)
    const result = await createReputationEvent({
      userId,
      eventType: 'admin_adjustment',
      pointsChange: points,
      notes: `Admin adjustment by ${admin.display_name || admin.email}: ${reason}`,
      relatedItemId: relatedItemId || undefined,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create reputation event' },
        { status: 500 }
      )
    }

    // Get updated score (trigger should have updated it)
    const { data: updatedUser } = await supabase
      .from('users')
      .select('reputation_score')
      .eq('id', userId)
      .single()

    const newScore = (updatedUser as any)?.reputation_score || currentScore

    return NextResponse.json({
      success: true,
      oldScore: currentScore,
      newScore,
      pointsChange: points,
      message: `Reputation adjusted from ${currentScore} to ${newScore} (${points > 0 ? '+' : ''}${points} pts)`,
    })
  } catch (error) {
    console.error('Admin reputation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * GET /api/admin/reputation
 * Get reputation events (optional, for future use)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('reputation_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by user if provided
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: events, error, count } = await query

    if (error) {
      console.error('Error fetching reputation events:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch reputation events' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      events: events || [],
      total: count || 0,
    })
  } catch (error) {
    console.error('Admin reputation GET API error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

