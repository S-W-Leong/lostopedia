import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safePostAuthRedirectPath } from '@/lib/auth/post-auth-redirect'
import { MESSAGING_ENABLED } from '@/lib/constants'

/**
 * Paths that require authentication. Visitors are redirected to /login.
 * Public guests only get marketing/auth/static pages and aggregate homepage stats.
 */
const PROTECTED_PATH_PREFIXES = [
  '/dashboard',
  '/post',
  '/my-items',
  '/messages',
  '/profile',
  '/search',
  '/map',
  '/user',
] as const

export function isProtectedPath(pathname: string): boolean {
  const normalizedPathname = pathname.split('?')[0].split('#')[0]

  if (
    PROTECTED_PATH_PREFIXES.some(
      (p) => normalizedPathname === p || normalizedPathname.startsWith(`${p}/`)
    )
  ) {
    return true
  }

  return /^\/item\/[^/]+(?:\/|$)/.test(normalizedPathname)
}

export function hasSupabaseAuthCookie(
  cookies: Array<{ name: string; value: string }>
): boolean {
  return cookies.some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name))
}

/**
 * Refreshes the Supabase session from cookies and returns the response + user.
 * Use in Next.js middleware to keep auth in sync and optionally enforce protected routes.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  if (isProtectedPath(pathname) && !hasSupabaseAuthCookie(request.cookies.getAll())) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabasePublishableKey) {
    if (isProtectedPath(pathname)) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as { path?: string })
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const destination = safePostAuthRedirectPath(request.nextUrl.searchParams.get('redirect'))
    return NextResponse.redirect(new URL(destination, request.url))
  }

  // Redirect /messages* when messaging is paused
  if (!MESSAGING_ENABLED && (request.nextUrl.pathname === '/messages' || request.nextUrl.pathname.startsWith('/messages/'))) {
    const destination = user ? '/dashboard' : '/'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return response
}
