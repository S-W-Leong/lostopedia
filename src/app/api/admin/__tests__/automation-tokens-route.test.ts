import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST as createToken } from '@/app/api/admin/automation-tokens/route'
import { POST as revokeToken } from '@/app/api/admin/automation-tokens/[id]/revoke/route'

const selectMock = vi.fn()
const orderMock = vi.fn()
const rangeMock = vi.fn()
const insertMock = vi.fn()
const eqMock = vi.fn()
const singleMock = vi.fn()
const updateMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  requireAdmin: vi.fn(),
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: selectMock,
      insert: insertMock,
      update: updateMock,
    })),
  })),
}))

vi.mock('@/lib/automation/audit', () => ({
  writeAutomationAuditEvent: vi.fn(),
}))

describe('admin automation token APIs', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED', 'true')
    const { requireAdmin } = await import('@/lib/supabase/admin')
    vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-id' } as any)

    selectMock.mockReturnValue({ order: orderMock, eq: eqMock })
    orderMock.mockReturnValue({ range: rangeMock })
    rangeMock.mockResolvedValue({ data: [], count: 0, error: null })
    insertMock.mockResolvedValue({ error: null })
    eqMock.mockReturnValue({ single: singleMock })
    singleMock.mockResolvedValue({ data: { id: 'token-1', is_active: true, token_prefix: 'lat_x' }, error: null })
    updateMock.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lists tokens for authorized admin', async () => {
    const req = new NextRequest('http://localhost/api/admin/automation-tokens?limit=10&offset=0')
    const response = await GET(req)
    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
  })

  it('creates token and returns one-time presented token', async () => {
    const req = new NextRequest('http://localhost/api/admin/automation-tokens', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost',
      },
      body: JSON.stringify({
        tokenName: 'Ops',
        serviceAccountName: 'Client',
        scopes: ['read'],
      }),
    })
    const response = await createToken(req)
    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(typeof payload.presentedToken).toBe('string')
  })

  it('revokes active token', async () => {
    const req = new NextRequest('http://localhost/api/admin/automation-tokens/token-1/revoke', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost',
      },
      body: JSON.stringify({ confirm: true }),
    })
    const response = await revokeToken(req, { params: Promise.resolve({ id: 'token-1' }) })
    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
  })

  it('returns unavailable while admin automation is paused', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED', 'false')

    const req = new NextRequest('http://localhost/api/admin/automation-tokens?limit=10&offset=0')
    const response = await GET(req)
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.success).toBe(false)
    expect(payload.error).toBe('Admin automation is temporarily paused.')
  })
})
