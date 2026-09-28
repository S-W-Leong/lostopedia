import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/items/[id]/recovery-helpers
 * Get users who have messaged about this item (potential helpers)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user owns this item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, posted_by')
      .eq('id', id)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    if ((item as any).posted_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You do not own this item' },
        { status: 403 }
      )
    }

    // Get distinct users who have messaged about this item (excluding owner)
    const { data: helpers, error: helpersError } = await supabase
      .from('messages')
      .select(`
        sender:users!sender_id(
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('item_id', id)
      .neq('sender_id', user.id)

    if (helpersError) {
      console.error('Error fetching helpers:', helpersError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch helpers' },
        { status: 500 }
      )
    }

    // Deduplicate by user id
    const uniqueHelpers = new Map()
    for (const msg of helpers || []) {
      const sender = (msg as any).sender
      if (sender && !uniqueHelpers.has(sender.id)) {
        uniqueHelpers.set(sender.id, {
          user_id: sender.id,
          display_name: sender.display_name,
          avatar_url: sender.avatar_url,
        })
      }
    }

    return NextResponse.json({
      success: true,
      helpers: Array.from(uniqueHelpers.values()),
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
