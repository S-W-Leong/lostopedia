import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(), createAdminClient: vi.fn(), isAdmin: vi.fn(),
  itemUpdate: vi.fn(), createReputationEvent: vi.fn(), bumpItemsVersion: vi.fn(),
}))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/organization/config', () => ({ organization: { claimantReference: { label: 'Library card', required: false } } }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient, isAdmin: mocks.isAdmin }))
vi.mock('@/lib/ratelimit', () => ({ rateLimiters: { itemUpdate: mocks.itemUpdate } }))
vi.mock('@/lib/supabase/reputation', () => ({ createReputationEvent: mocks.createReputationEvent }))
vi.mock('@/lib/cache/query-cache', () => ({ bumpItemsVersion: mocks.bumpItemsVersion }))

beforeEach(() => vi.clearAllMocks())

it('persists null for an optional blank reference', async () => {
  let storedPatch: Record<string, unknown> | null = null
  mocks.createClient.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'item', posted_by: 'owner', status: 'active', type: 'found', title: 'Umbrella', pickup_method: 'meetup' }, error: null }) }) }),
      update: (patch: Record<string, unknown>) => ({ eq: async () => { storedPatch = patch; return { error: null } } }),
    }),
  })
  mocks.createAdminClient.mockReturnValue({})
  mocks.isAdmin.mockResolvedValue(false)
  mocks.itemUpdate.mockResolvedValue({ success: true })
  mocks.createReputationEvent.mockResolvedValue({ success: true })
  mocks.bumpItemsVersion.mockResolvedValue(undefined)

  const { POST } = await import('../[id]/complete/route')
  const response = await POST(new NextRequest('http://localhost/api/items/item/complete', {
    method: 'POST', body: JSON.stringify({ claimantName: 'Example Person', claimantStudentId: '  ' }),
  }), { params: Promise.resolve({ id: 'item' }) })
  expect(response.status).toBe(200)
  expect(storedPatch).toMatchObject({ claimant_name: 'Example Person', claimant_student_id: null })
})
