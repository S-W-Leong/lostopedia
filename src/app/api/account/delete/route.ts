import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CONTACT_EMAIL } from '@/lib/constants'

const CONFIRM_TEXT = 'DELETE'

export async function POST(request: NextRequest) {
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

    const profileRes = await supabase
      .from('users')
      .select('is_banned')
      .eq('id', user.id)
      .single<{ is_banned: boolean }>()

    if (profileRes.error || !profileRes.data) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    if (profileRes.data.is_banned) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only an administrator can delete your account.',
        },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const deleteItemsAndMessages = body.deleteItemsAndMessages === true
    const confirmText = typeof body.confirmText === 'string' ? body.confirmText.trim() : ''

    if (confirmText !== CONFIRM_TEXT) {
      return NextResponse.json(
        { success: false, error: `You must type ${CONFIRM_TEXT} to confirm.` },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const systemUserId = process.env.LOSTOPEDIA_SYSTEM_USER_ID

    if (!deleteItemsAndMessages) {
      if (!systemUserId) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Keeping items and messages is not available. Please choose to delete your items and messages, or contact us at ${CONTACT_EMAIL}.`,
          },
          { status: 400 }
        )
      }

      await (admin as any).from('items').update({ posted_by: systemUserId }).eq('posted_by', user.id)
      await (admin as any).from('messages').update({ sender_id: systemUserId }).eq('sender_id', user.id)
      await (admin as any).from('messages').update({ recipient_id: systemUserId }).eq('recipient_id', user.id)
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      if (deleteError.message?.toLowerCase().includes('user not found')) {
        // User already deleted, sign them out anyway
        await supabase.auth.signOut()
        return NextResponse.json({ success: true })
      }
      console.error('Account delete auth.admin.deleteUser error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete account. Please try again.' },
        { status: 500 }
      )
    }

    // Sign out the user to clear their session cookies
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/account/delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
