import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import { RECOVERY_BADGES, REPUTATION_POINTS } from '@/lib/constants'
import { createReputationEvent } from '@/lib/supabase/reputation'
import { createAdminClient, isAdmin } from '@/lib/supabase/admin'
import { officeClaimantBodySchema, type OfficeClaimantBody } from '@/lib/validations/office-claimant'
import { bumpItemsVersion } from '@/lib/cache/query-cache'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface CompleteRequestBody {
  helper_user_id?: string
  claimantName?: string
  claimantStudentId?: string | null
}

/**
 * Check and award badges based on total items returned
 */
async function checkAndAwardBadges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  totalReturned: number
) {
  for (const { threshold, type } of RECOVERY_BADGES) {
    if (totalReturned >= threshold) {
      // Upsert badge (UNIQUE constraint handles duplicates)
      await supabase
        .from('user_badges')
        .upsert(
          { user_id: userId, badge_type: type },
          { onConflict: 'user_id,badge_type' }
        )
    }
  }
}

/**
 * Find helper's active item linked via message thread with the owner
 */
async function findLinkedHelperItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  helperId: string,
  ownerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('items')
    .select('id')
    .eq('posted_by', helperId)
    .eq('status', 'active')
    .limit(1)
    .single()

  // If helper has an active item, check if owner messaged about it
  if (data) {
    const { data: messageExists } = await supabase
      .from('messages')
      .select('id')
      .eq('item_id', data.id)
      .eq('sender_id', ownerId)
      .limit(1)
      .single()

    if (messageExists) {
      return data.id
    }
  }

  return null
}

/**
 * POST /api/items/[id]/complete
 * Mark an item as completed. Found items require a claimant name and may
 * require a reference according to organization configuration.
 * Lost items may include helper_user_id to credit a helper; no claimant fields.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
        { success: false, error: 'You must be logged in to complete an item' },
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

    // Parse request body for helper_user_id
    let body: CompleteRequestBody = {}
    try {
      body = await request.json()
    } catch {
      // Body is optional, continue without it
    }

    const { helper_user_id, claimantName, claimantStudentId } = body

    // Fetch the item to verify ownership and get type
    const { data: existingItem, error: fetchError } = await supabase
      .from('items')
      .select('id, posted_by, status, type, title, pickup_method')
      .eq('id', id)
      .single()

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    const typedItem = existingItem as {
      id: string
      posted_by: string
      status: string
      type: string
      title: string
      pickup_method: string | null
    }

    // Office pickup: only admins may complete. All other items: owner only.
    const isOfficeItem = typedItem.pickup_method === 'office'
    const userIsAdmin = await isAdmin(user.id)

    if (isOfficeItem) {
      if (!userIsAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only admins can complete office items' },
          { status: 403 }
        )
      }
    } else if (typedItem.posted_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to complete this item' },
        { status: 403 }
      )
    }

    if (typedItem.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Only active items can be marked as completed' },
        { status: 400 }
      )
    }

    // Only lost-item completion supports helper credits.
    // Ignore helper_user_id for found items to keep completion semantics simple.
    const helperUserIdForCredit =
      typedItem.type === 'lost' ? helper_user_id : undefined

    // If helper provided for a lost item, validate they exist
    if (helperUserIdForCredit) {
      const { data: helperUser, error: helperError } = await supabase
        .from('users')
        .select('id, display_name, total_items_returned')
        .eq('id', helperUserIdForCredit)
        .single()

      if (helperError || !helperUser) {
        return NextResponse.json(
          { success: false, error: 'Helper user not found' },
          { status: 400 }
        )
      }
    }

    let claimantData: OfficeClaimantBody | null = null
    if (typedItem.type === 'found') {
      const claimantParsed = officeClaimantBodySchema.safeParse({
        claimantName,
        claimantStudentId,
      })
      if (!claimantParsed.success) {
        const first = claimantParsed.error.errors[0]
        return NextResponse.json(
          {
            success: false,
            error: first?.message ?? 'Valid claimant details are required',
          },
          { status: 400 }
        )
      }
      claimantData = claimantParsed.data
    }

    // Update item status to completed (with recovered_by if helper provided)
    const updateData: Record<string, unknown> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
    }

    if (helperUserIdForCredit) {
      updateData.recovered_by = helperUserIdForCredit
    }

    if (claimantData) {
      updateData.claimant_name = claimantData.claimantName
      updateData.claimant_student_id = claimantData.claimantStudentId
      updateData.claimant_recorded_by = user.id
    }

    const { error: updateError } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to mark item as completed' },
        { status: 500 }
      )
    }

    // Counter and badge fields are service-only at the database boundary.
    // Authorization and item state have already been checked above.
    const privileged = createAdminClient()


    // If item type is 'lost', increment owner's total_items_recovered
    // Use the item poster's ID (not the completing user's ID) so admins completing
    // office items don't accidentally credit themselves instead of the item owner.
    if (typedItem.type === 'lost') {
      // Get current count and increment
      const { data: userData } = await privileged
        .from('users')
        .select('total_items_recovered')
        .eq('id', typedItem.posted_by)
        .single()

      const currentCount = userData?.total_items_recovered ?? 0
      await privileged
        .from('users')
        .update({ total_items_recovered: currentCount + 1 })
        .eq('id', typedItem.posted_by)
    }

    // Add reputation event for completing an item (credit the item poster, not the admin)
    try {
      await createReputationEvent({
        userId: typedItem.posted_by,
        eventType: 'item_completed',
        pointsChange: REPUTATION_POINTS.item_completed,
        relatedItemId: id,
      })
    } catch (error) {
      console.error('Exception creating reputation event:', error)
    }

    let helperCredited = false
    let linkedItemId: string | null = null

    // Handle helper crediting
    if (helperUserIdForCredit) {
      try {
        // Get helper's current stats
        const { data: helperData } = await privileged
          .from('users')
          .select('total_items_returned, display_name')
          .eq('id', helperUserIdForCredit)
          .single()

        const currentReturned = (helperData?.total_items_returned ?? 0) + 1

        // Increment helper's total_items_returned
        await privileged
          .from('users')
          .update({ total_items_returned: currentReturned })
          .eq('id', helperUserIdForCredit)

        // Create item_returned reputation event for helper
        await createReputationEvent({
          userId: helperUserIdForCredit,
          eventType: 'item_returned',
          pointsChange: REPUTATION_POINTS.item_returned,
          relatedItemId: id,
          relatedUserId: user.id,
        })

        // Check and award badges
        await checkAndAwardBadges(privileged, helperUserIdForCredit, currentReturned)

        // Find helper's linked active item (for notification prompt)
        linkedItemId = await findLinkedHelperItem(
          supabase,
          helperUserIdForCredit,
          user.id
        )

        // Get owner's display name for notification
        const { data: ownerData } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', user.id)
          .single()

        const ownerName = ownerData?.display_name ?? 'Someone'

        // Create notification for helper
        await supabase
          .from('notifications')
          // @ts-ignore - Supabase type inference issue
          .insert({
            user_id: helperUserIdForCredit,
            type: 'recovery_credit',
            title: 'You helped recover an item!',
            message: `${ownerName} credited you for helping recover their "${typedItem.title}". +${REPUTATION_POINTS.item_returned} reputation`,
            related_item_id: id,
            action_url: `/items/${id}`,
          })

        helperCredited = true
      } catch (error) {
        console.error('Error crediting helper:', error)
        // Don't fail the request, item is already completed
      }
    }

    await bumpItemsVersion()

    return NextResponse.json({
      success: true,
      message: 'Item marked as completed successfully',
      helper_credited: helperCredited,
      linked_item_id: linkedItemId,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
