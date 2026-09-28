import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasSupabaseAuthCookie, isProtectedPath, updateSession } from '../middleware'

const createServerClientMock = vi.hoisted(() => vi.fn())
const nextResponseNextMock = vi.hoisted(() => vi.fn())
const nextResponseRedirectMock = vi.hoisted(() => vi.fn())

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}))

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')

  return {
    ...actual,
    NextResponse: {
      next: nextResponseNextMock,
      redirect: nextResponseRedirectMock,
    },
  }
})

describe('isProtectedPath', () => {
  it('protects item discovery and community data pages', () => {
    expect(isProtectedPath('/search')).toBe(true)
    expect(isProtectedPath('/search?q=wallet')).toBe(true)
    expect(isProtectedPath('/map')).toBe(true)
    expect(isProtectedPath('/item/abc-123')).toBe(true)
    expect(isProtectedPath('/item/abc-123/edit')).toBe(true)
    expect(isProtectedPath('/item/abc-123/flag')).toBe(true)
    expect(isProtectedPath('/user/user-123')).toBe(true)
  })

  it('keeps public marketing and auth pages open', () => {
    expect(isProtectedPath('/')).toBe(false)
    expect(isProtectedPath('/login')).toBe(false)
    expect(isProtectedPath('/signup')).toBe(false)
    expect(isProtectedPath('/privacy')).toBe(false)
    expect(isProtectedPath('/terms')).toBe(false)
    expect(isProtectedPath('/help')).toBe(false)
  })
})

describe('hasSupabaseAuthCookie', () => {
  it('recognizes regular and chunked Supabase auth cookies', () => {
    expect(hasSupabaseAuthCookie([{ name: 'sb-project-auth-token', value: 'token' }])).toBe(true)
    expect(hasSupabaseAuthCookie([{ name: 'sb-project-auth-token.1', value: 'chunk' }])).toBe(true)
    expect(hasSupabaseAuthCookie([{ name: 'theme', value: 'dark' }])).toBe(false)
  })
})

describe('updateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'anon-key')
    nextResponseNextMock.mockReturnValue({ cookies: { set: vi.fn() } })
    nextResponseRedirectMock.mockImplementation((url: URL) => ({
      headers: new Headers({ location: url.toString() }),
    }))
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('preserves the query string in the login redirect target', async () => {
    const request = {
      url: 'http://localhost/search?q=wallet',
      nextUrl: new URL('http://localhost/search?q=wallet'),
      cookies: {
        getAll: () => [],
      },
    } as unknown as Parameters<typeof updateSession>[0]

    const response = await updateSession(request)

    expect(response.headers.get('location')).toBe(
      'http://localhost/login?redirect=%2Fsearch%3Fq%3Dwallet'
    )
    expect(createServerClientMock).not.toHaveBeenCalled()
  })

  it('validates every apparent auth cookie with Supabase', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null } })
    createServerClientMock.mockReturnValue({ auth: { getUser } })
    const request = {
      url: 'http://localhost/dashboard',
      nextUrl: new URL('http://localhost/dashboard'),
      cookies: {
        getAll: () => [{ name: 'sb-project-auth-token.0', value: 'forged' }],
      },
    } as unknown as Parameters<typeof updateSession>[0]

    const response = await updateSession(request)

    expect(getUser).toHaveBeenCalledTimes(1)
    expect(response.headers.get('location')).toBe(
      'http://localhost/login?redirect=%2Fdashboard'
    )
  })

  it('fails closed when auth configuration is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const request = {
      url: 'http://localhost/dashboard',
      nextUrl: new URL('http://localhost/dashboard'),
      cookies: { getAll: () => [{ name: 'sb-project-auth-token', value: 'token' }] },
    } as unknown as Parameters<typeof updateSession>[0]

    const response = await updateSession(request)

    expect(response.headers.get('location')).toBe(
      'http://localhost/login?redirect=%2Fdashboard'
    )
    expect(createServerClientMock).not.toHaveBeenCalled()
  })
})
