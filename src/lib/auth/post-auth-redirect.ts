/**
 * Safe in-app path after auth (login callback, "already signed in" redirects).
 * Rejects open redirects and loops back to auth screens.
 */
export function safePostAuthRedirectPath(redirectParam: string | null): string {
  const fallback = '/dashboard'
  if (!redirectParam || !redirectParam.startsWith('/') || redirectParam.startsWith('//')) {
    return fallback
  }
  if (
    redirectParam === '/login' ||
    redirectParam === '/signup' ||
    redirectParam.startsWith('/login/') ||
    redirectParam.startsWith('/signup/')
  ) {
    return fallback
  }
  return redirectParam
}
