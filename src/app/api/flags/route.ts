import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { flagSchema } from '@/lib/validations/admin'

/**
 * POST /api/flags
 * Create a new flag (user-facing)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const rateLimit = await rateLimiters.flagCreation(user.id)

    if (!rateLimit.success) {
      const resetDate = new Date(rateLimit.reset).toLocaleTimeString()

      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. You can report more items after ${resetDate}.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      )
    }

    const body = await request.json()

    // Validate input with Zod schema
    const validationResult = flagSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { itemId, reason, description } = validationResult.data
    const flaggableType = 'item'
    const flaggableId = itemId

    const validReasons = ['spam', 'inappropriate_content', 'scam', 'duplicate', 'harassment', 'fake_item', 'other']
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { success: false, error: 'Invalid flag reason' },
        { status: 400 }
      )
    }

    // Check if user already flagged this content
    const { data: existingFlag } = await supabase
      .from('flags')
      .select('id')
      .eq('flaggable_type', flaggableType)
      .eq('flaggable_id', flaggableId)
      .eq('reporter_id', user.id)
      .single()

    if (existingFlag) {
      return NextResponse.json(
        { success: false, error: 'You have already flagged this content' },
        { status: 400 }
      )
    }

    // Check if user is trying to flag their own content
    if (flaggableType === 'item') {
      const { data: item } = await supabase
        .from('items')
        .select('posted_by')
        .eq('id', flaggableId)
        .single()

      if ((item as any)?.posted_by === user.id) {
        return NextResponse.json(
          { success: false, error: 'You cannot flag your own content' },
          { status: 400 }
        )
      }
    }

    // Create flag
    const { data: flag, error } = await supabase
      .from('flags')
      // @ts-ignore - Supabase type inference issue
      .insert({
        flaggable_type: flaggableType,
        flaggable_id: flaggableId,
        reporter_id: user.id,
        reason,
        description: description || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating flag:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create flag' },
        { status: 500 }
      )
    }

    // Update flag count on the flagged content
    if (flaggableType === 'item') {
      // Get current flag count
      const { count } = await supabase
        .from('flags')
        .select('*', { count: 'exact', head: true })
        .eq('flaggable_type', 'item')
        .eq('flaggable_id', flaggableId)

      const flagCount = count || 0

      // Update item
      await supabase
        .from('items')
        // @ts-ignore - Supabase type inference issue
        .update({
          flag_count: flagCount,
          is_flagged: flagCount >= 3, // Set is_flagged if 3+ flags
        })
        .eq('id', flaggableId)
    }

    return NextResponse.json({
      success: true,
      flag,
      message: 'Content flagged successfully. Our team will review it.',
    })
  } catch (error) {
    console.error('Flag creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/flags
 * List flags (admin-only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const flaggableType = searchParams.get('flaggableType')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('flags')
      .select(`
        *,
        reporter:users!reporter_id(
          id,
          display_name,
          email,
          avatar_url
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (flaggableType) {
      query = query.eq('flaggable_type', flaggableType)
    }

    const { data: flags, error, count } = await query

    if (error) {
      console.error('Error fetching flags:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch flags' },
        { status: 500 }
      )
    }

    // Enrich flags with flagged content info
    const enrichedFlags = await Promise.all(
      (flags || []).map(async (flag: any) => {
        let content = null

        if (flag.flaggable_type === 'item') {
          const { data: item } = await supabase
            .from('items')
            .select('id, title, type, image_url, status, posted_by')
            .eq('id', flag.flaggable_id)
            .single()
          
          content = item
        }
        // Add other types (message, user) in the future

        return {
          ...flag,
          content,
        }
      })
    )

    return NextResponse.json({
      success: true,
      flags: enrichedFlags,
      total: count || 0,
    })
  } catch (error) {
    console.error('Admin flags API error:', error)
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
