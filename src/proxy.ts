import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Refreshes Supabase auth session and protects routes that require login.
 * Public guests only get marketing/auth/static pages and aggregate homepage stats.
 * Signed-in users hitting /login or /signup are redirected (session from cookies).
 * Discovery/profile routes are gated in updateSession().
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/post/:path*',
    '/my-items/:path*',
    '/messages/:path*',
    '/profile/:path*',
    '/search/:path*',
    '/map/:path*',
    '/user/:path*',
    '/item/:path*',
  ],
}
