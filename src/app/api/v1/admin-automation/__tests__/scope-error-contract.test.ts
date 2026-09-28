import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../[operation]/route'
import { authenticateAdminAutomationTokenDetailed } from '@/lib/auth/adminAutomation'
import { requireAdmin } from '@/lib/supabase/admin'

vi.mock('@/lib/auth/adminAutomation', () => ({
  authenticateAdminAutomationTokenDetailed: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  requireAdmin: vi.fn(),
}))

describe('admin automation scope error contract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED', 'true')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns insufficient_scope for valid token with missing scopes', async () => {
    vi.mocked(authenticateAdminAutomationTokenDetailed).mockResolvedValue({
      kind: 'insufficient_scope',
      actor: {
        tokenId: 'token_123',
        serviceAccountName: 'ops-bot',
        scopes: ['read'],
        createdBy: null,
      },
    })
    vi.mocked(requireAdmin).mockRejectedValue(new Error('session missing'))

    const request = new NextRequest(
      'http://localhost/api/v1/admin-automation/admin.users.delete'
    )
    const response = await GET(request, {
      params: Promise.resolve({ operation: 'admin.users.delete' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('insufficient_scope')
    expect(requireAdmin).not.toHaveBeenCalled()
  })
})
