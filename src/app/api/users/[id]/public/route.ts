import { NextRequest, NextResponse } from 'next/server'
import { effectiveItemStatus } from '@/lib/utils/item-status'
import { requireApiUser } from '@/lib/auth/api-auth'

/**
 * GET /api/users/[id]/public
 * Fetches public profile information for a user
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID is required' },
      { status: 400 }
    )
  }

  try {
    const { supabase, response: authResponse } = await requireApiUser()
    if (authResponse) return authResponse

    // Fetch user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, reputation_score, total_items_returned, created_at, is_banned, banned_reason, is_admin, email, phone')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Fetch user badges
    const { data: badges, error: badgesError } = await supabase
      .from('user_badges')
      .select('id, badge_type, earned_at')
      .eq('user_id', userId)
      .order('earned_at', { ascending: true })

    if (badgesError) {
      console.error('Error fetching badges:', badgesError)
    }

    // Fetch item statistics
    const { count: totalItemsPosted } = await supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('posted_by', userId)

    const { count: activeItems } = await supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('posted_by', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())

    // Fetch recent items (last 10)
    const { data: recentItems, error: itemsError } = await supabase
      .from('items')
      .select(
        'id, type, title, description, category, image_url, location_text, pickup_method, status, created_at, expires_at'
      )
      .eq('posted_by', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (itemsError) {
      console.error('Error fetching recent items:', itemsError)
    }

    // Transform recent items to include poster (for consistent typing)
    const transformedRecentItems = (recentItems || []).map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      category: item.category,
      imageUrl: item.image_url,
      locationText: item.location_text,
      pickupMethod:
        item.pickup_method === 'office' || item.pickup_method === 'meetup'
          ? item.pickup_method
          : null,
      status: effectiveItemStatus(item.status, item.expires_at),
      createdAt: item.created_at,
      expiresAt: item.expires_at,
      poster: {
        id: user.id,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        reputationScore: user.reputation_score,
      }
    }))

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: user.id,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          reputationScore: user.reputation_score,
          totalItemsReturned: user.total_items_returned || 0,
          memberSince: user.created_at,
          isBanned: user.is_banned,
          bannedReason: user.banned_reason,
          isAdmin: user.is_admin ?? false,
          email: user.email,
          phone: user.phone,
        },
        badges: badges || [],
        stats: {
          totalItemsPosted: totalItemsPosted || 0,
          activeItems: activeItems || 0,
        },
        recentItems: transformedRecentItems,
      },
    })
  } catch (error) {
    console.error('Error fetching public profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}
