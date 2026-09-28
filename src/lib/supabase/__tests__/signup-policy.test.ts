import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  organization: { registration: { mode: 'restricted' as 'restricted' | 'open', allowedDomains: ['example.org'] } }
}))

vi.mock('../server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/organization/config', () => ({ organization: mocks.organization }))

describe('signup policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.organization.registration.mode = 'restricted'
    mocks.organization.registration.allowedDomains = ['example.org']
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://community.example.org')
    vi.stubEnv('NODE_ENV', 'production')
  })

  it('sends a normalized exact-domain address and canonical callback URL to Auth', async () => {
    const signUpCall = vi.fn().mockResolvedValue({ data: { user: { id: 'user-id', identities: [{}] } }, error: null })
    mocks.createClient.mockResolvedValue({ auth: { signUp: signUpCall } })
    const { signUp } = await import('../auth')
    const result = await signUp(' Member@EXAMPLE.ORG ', 'Password123', 'Example Member')
    expect(result.success).toBe(true)
    expect(signUpCall).toHaveBeenCalledWith(expect.objectContaining({
      email: 'member@example.org',
      options: expect.objectContaining({ emailRedirectTo: 'https://community.example.org/auth/callback' })
    }))
  })

  it.each(['member@example.org.evil.test', 'member@notexample.org', 'not-an-email'])('rejects %s before calling Auth', async email => {
    const signUpCall = vi.fn()
    mocks.createClient.mockResolvedValue({ auth: { signUp: signUpCall } })
    const { signUp } = await import('../auth')
    expect((await signUp(email, 'Password123', 'Example Member')).success).toBe(false)
    expect(signUpCall).not.toHaveBeenCalled()
  })

  it('allows another valid domain in open mode', async () => {
    mocks.organization.registration.mode = 'open'
    mocks.organization.registration.allowedDomains = []
    const signUpCall = vi.fn().mockResolvedValue({ data: { user: { id: 'user-id', identities: [{}] } }, error: null })
    mocks.createClient.mockResolvedValue({ auth: { signUp: signUpCall } })
    const { signUp } = await import('../auth')
    expect((await signUp(' Reader@ANOTHER.EXAMPLE ', 'Password123', 'Reader')).success).toBe(true)
    expect(signUpCall).toHaveBeenCalledWith(expect.objectContaining({ email: 'reader@another.example' }))
  })
})
