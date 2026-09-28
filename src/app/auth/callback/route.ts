import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { safePostAuthRedirectPath } from '@/lib/auth/post-auth-redirect'
import { resolveAppUrl } from '@/lib/organization/app-url'

/**
 * Auth callback handler for email verification and password reset
 * This route handles the redirect from Supabase Auth email links
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  let canonicalOrigin: string
  try {
    canonicalOrigin = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, process.env.NODE_ENV)
  } catch {
    return NextResponse.json({ error: 'Application origin is not configured' }, { status: 500 })
  }
  if (process.env.NODE_ENV === 'production' && origin !== canonicalOrigin) {
    const canonicalUrl = new URL(request.url)
    canonicalUrl.protocol = new URL(canonicalOrigin).protocol
    canonicalUrl.host = new URL(canonicalOrigin).host
    return NextResponse.redirect(canonicalUrl)
  }

  const code = searchParams.get('code')
  const next = safePostAuthRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${canonicalOrigin}${next}`)
    } else {
      // Log the error for debugging
      console.error('Email verification error:', error.message, error.code)
      const reason = error.code === 'otp_expired'
        ? 'expired_link'
        : error.code === 'flow_state_not_found'
          ? 'missing_pkce_state'
          : 'callback_failed'
      return NextResponse.redirect(`${canonicalOrigin}/auth-code-error?reason=${reason}`)
    }
  }

  // If there's an error or no code, redirect to an error page
  return NextResponse.redirect(`${canonicalOrigin}/auth-code-error?reason=missing_code`)
}
