import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, requireAdmin } from '@/lib/supabase/admin'
import { organization } from '@/lib/organization/config'
import { resolveAppUrl } from '@/lib/organization/app-url'
import { isEmailAllowed, normalizeEmail, registrationDescription } from '@/lib/organization/registration'

/**
 * GET /api/admin/users
 * List users with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const banned = searchParams.get('banned')
    const admins = searchParams.get('admins')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`)
    }

    if (banned === 'true') {
      query = query.eq('is_banned', true)
    } else if (banned === 'false') {
      query = query.eq('is_banned', false)
    }

    if (admins === 'true') {
      query = query.eq('is_admin', true)
    }

    const { data: users, error, count } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (user: any) => {
        const { count: itemsCount } = await supabase
          .from('items')
          .select('id', { count: 'exact', head: true })
          .eq('posted_by', user.id)

        // First get the user's item IDs
        const { data: userItems } = await supabase
          .from('items')
          .select('id')
          .eq('posted_by', user.id)

        const itemIds = userItems?.map((item: any) => item.id) || []

        // Then count flags for those items (only if there are items)
        let flagsCount = 0
        if (itemIds.length > 0) {
          const { count } = await supabase
            .from('flags')
            .select('*', { count: 'exact', head: true })
            .eq('flaggable_type', 'item')
            .in('flaggable_id', itemIds)
          flagsCount = count || 0
        }

        return {
          ...user,
          itemsCount: itemsCount || 0,
          flagsCount: flagsCount || 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      users: usersWithStats,
      total: count || 0,
    })
  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * POST /api/admin/users
 * Invite a user by email, redirect them to the set-password flow,
 * and promote their profile to admin immediately
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!isEmailAllowed(email, organization.registration)) {
      return NextResponse.json(
        {
          success: false,
          error: registrationDescription(organization.registration),
        },
        { status: 400 }
      )
    }

    let appUrl: string
    try {
      appUrl = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, process.env.NODE_ENV)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Set a secure NEXT_PUBLIC_APP_URL origin for invitations.' },
        { status: 500 }
      )
    }

    const redirectTo = `${appUrl}/auth/callback?next=/update-password`
    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: displayName ? { display_name: displayName } : undefined,
    })

    if (error) {
      console.error('Error inviting user:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to send invite.' },
        { status: 400 }
      )
    }

    if (data.user?.id) {
      const { error: promoteError } = await admin
        .from('users')
        .update({ is_admin: true })
        .eq('id', data.user.id)

      if (promoteError) {
        console.error('Error promoting invited user to admin:', promoteError)
        return NextResponse.json(
          {
            success: false,
            error: 'Invite was created, but promoting the user to admin failed.',
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      invitedUser: data.user ? { id: data.user.id, email: data.user.email } : null,
      redirectTo,
    })
  } catch (error) {
    console.error('Admin invite user API error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
