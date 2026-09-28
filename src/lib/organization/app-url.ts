export function resolveAppUrl(value: string | undefined, mode: string | undefined): string {
  if (!value) {
    if (mode === 'production') throw new Error('NEXT_PUBLIC_APP_URL must be set to an HTTPS origin in production')
    return 'http://localhost:3000'
  }

  if (value.trim() !== value) throw new Error('NEXT_PUBLIC_APP_URL must be an origin without whitespace')
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('NEXT_PUBLIC_APP_URL must be a valid HTTP(S) origin')
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  const secure = url.protocol === 'https:'
  if ((!secure && !(mode !== 'production' && url.protocol === 'http:' && loopback)) ||
    url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('NEXT_PUBLIC_APP_URL must be a secure root origin without credentials, query, or fragment')
  }
  return url.origin
}
