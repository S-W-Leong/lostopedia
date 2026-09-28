import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))

describe('auth callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://community.example.org')
  })

  it('redirects an alternate hostname to canonical before exchanging the code', async () => {
    const { GET } = await import('../route')
    const response = await GET(new Request('https://alias.example.org/auth/callback?code=abc'))

    expect(response.headers.get('location')).toBe('https://community.example.org/auth/callback?code=abc')
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('validates next and redirects successful callbacks on the canonical origin', async () => {
    mocks.createClient.mockResolvedValue({
      auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }) },
    })
    const { GET } = await import('../route')
    const response = await GET(new Request('https://community.example.org/auth/callback?code=abc&next=https://evil.test'))

    expect(response.headers.get('location')).toBe('https://community.example.org/dashboard')
  })

  it('rejects a production callback when the canonical origin is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    const { GET } = await import('../route')
    const response = await GET(new Request('https://alias.example.org/auth/callback?code=abc'))
    expect(response.status).toBe(500)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
})
