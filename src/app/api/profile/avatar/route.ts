import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { IMAGE_COMPRESSION_UNAVAILABLE, uploadAvatar, deleteAvatar } from '@/lib/supabase/storage'

/**
 * POST /api/profile/avatar
 * Compresses (server-side) and uploads the current user's avatar, then persists
 * the URL to users.avatar_url. Accepts multipart/form-data with field `avatar`.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'You must be logged in to update your avatar' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('avatar')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No avatar file provided' },
        { status: 400 }
      )
    }

    const result = await uploadAvatar(user.id, file, supabase as any)
    if ('error' in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === IMAGE_COMPRESSION_UNAVAILABLE ? 503 : 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: result.url, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('id')
      .single()

    if (updateError) {
      console.error({
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        route: '/api/profile/avatar',
        userId: user.id,
      })
      return NextResponse.json(
        { success: false, error: 'Failed to update avatar. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, url: result.url })
  } catch (error) {
    console.error('Avatar upload route error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/profile/avatar
 * Deletes the current user's avatar from storage, and sets users.avatar_url to null.
 */
export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'You must be logged in to delete your avatar' },
        { status: 401 }
      )
    }

    const result = await deleteAvatar(user.id, supabase as any)
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update avatar. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Avatar delete route error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
