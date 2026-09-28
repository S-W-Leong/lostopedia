import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createAdminClient: vi.fn(),
  organization: { registration: { mode: 'restricted' as 'restricted' | 'open', allowedDomains: ['example.org'] } }
}))

vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: mocks.requireAdmin, createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/organization/config', () => ({ organization: mocks.organization }))

function request(email: string) {
  return new NextRequest('http://localhost/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, displayName: 'Example Member' }),
    headers: { 'content-type': 'application/json' }
  })
}

describe('admin invitation policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.organization.registration.mode = 'restricted'
    mocks.organization.registration.allowedDomains = ['example.org']
    mocks.requireAdmin.mockResolvedValue({ id: 'admin-id' })
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://community.example.org')
    vi.stubEnv('NODE_ENV', 'production')
  })

  it('requires admin first and sends a normalized allowed address', async () => {
    const invite = vi.fn().mockResolvedValue({ data: { user: { id: 'new-user', email: 'member@example.org' } }, error: null })
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    mocks.createAdminClient.mockReturnValue({ auth: { admin: { inviteUserByEmail: invite } }, from: vi.fn().mockReturnValue({ update }) })
    const { POST } = await import('../users/route')
    const response = await POST(request(' Member@EXAMPLE.ORG '))
    expect(response.status).toBe(200)
    expect(mocks.requireAdmin).toHaveBeenCalledOnce()
    expect(invite).toHaveBeenCalledWith('member@example.org', expect.objectContaining({
      redirectTo: 'https://community.example.org/auth/callback?next=/update-password'
    }))
  })

  it.each(['member@example.org.evil.test', 'not-an-email'])('rejects %s before inviting', async email => {
    const invite = vi.fn()
    mocks.createAdminClient.mockReturnValue({ auth: { admin: { inviteUserByEmail: invite } } })
    const { POST } = await import('../users/route')
    expect((await POST(request(email))).status).toBe(400)
    expect(mocks.requireAdmin).toHaveBeenCalledOnce()
    expect(invite).not.toHaveBeenCalled()
  })

  it('accepts another valid domain in open mode', async () => {
    mocks.organization.registration.mode = 'open'
    mocks.organization.registration.allowedDomains = []
    const invite = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    mocks.createAdminClient.mockReturnValue({ auth: { admin: { inviteUserByEmail: invite } } })
    const { POST } = await import('../users/route')
    expect((await POST(request('Reader@ANOTHER.EXAMPLE'))).status).toBe(200)
    expect(invite).toHaveBeenCalledWith('reader@another.example', expect.anything())
  })
})
