import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import { APP_CONFIG } from '@/lib/constants'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/items/[id]/extend
 * Extend an item's expiration by 90 days
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
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
        { success: false, error: 'You must be logged in to extend an item' },
        { status: 401 }
      )
    }

    const rateLimit = await rateLimiters.itemUpdate(user.id)

    if (!rateLimit.success) {
      const resetDate = new Date(rateLimit.reset).toLocaleTimeString()

      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. You can update more items after ${resetDate}.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      )
    }

    // Fetch the item to verify ownership and check extension eligibility
    const { data: existingItem, error: fetchError } = await supabase
      .from('items')
      .select('id, posted_by, status, expires_at')
      .eq('id', id)
      .single()

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    const typedItem = existingItem as any

    // Verify ownership
    if (typedItem.posted_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to extend this item' },
        { status: 403 }
      )
    }

    // Only active items can be extended
    if (typedItem.status !== 'active' && typedItem.status !== 'expired') {
      return NextResponse.json(
        { success: false, error: 'Only active or expired items can be extended' },
        { status: 400 }
      )
    }

    // Check if item has reached max extensions (3)
    const { count: extensionCount, error: countError } = await supabase
      .from('item_extensions')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', id)

    if (countError) {
      console.error('Error counting extensions:', countError)
      return NextResponse.json(
        { success: false, error: 'Failed to verify extension eligibility' },
        { status: 500 }
      )
    }

    if ((extensionCount || 0) >= APP_CONFIG.maxItemExtensions) {
      return NextResponse.json(
        {
          success: false,
          error: `Item has already been extended the maximum number of times (${APP_CONFIG.maxItemExtensions})`,
        },
        { status: 400 }
      )
    }

    // Calculate new expiration date (90 days from current expiration)
    const currentExpires = new Date(typedItem.expires_at)
    const newExpires = new Date(currentExpires)
    newExpires.setDate(newExpires.getDate() + APP_CONFIG.itemExpirationDays)

    // Update item expiration and status if expired
    const updateData: any = {
      expires_at: newExpires.toISOString(),
    }

    // If item was expired, set it back to active
    if (typedItem.status === 'expired') {
      updateData.status = 'active'
    }

    const { error: updateError } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to extend item' },
        { status: 500 }
      )
    }

    // Record the extension in item_extensions table
    const { error: extensionError } = await supabase
      .from('item_extensions')
      .insert({
        item_id: id,
        user_id: user.id,
        previous_expires_at: typedItem.expires_at,
        new_expires_at: newExpires.toISOString(),
        days_extended: APP_CONFIG.extensionDays,
      })

    if (extensionError) {
      console.error('Extension record error:', extensionError)
      // Don't fail the request, the item was still extended
    }

    return NextResponse.json({
      success: true,
      message: 'Item extended successfully',
      newExpiresAt: newExpires.toISOString(),
      extensionsRemaining: APP_CONFIG.maxItemExtensions - (extensionCount || 0) - 1,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
