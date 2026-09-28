import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('../server', () => ({ createClient: mocks.createClient }))
vi.mock('../admin', () => ({ createAdminClient: mocks.createAdminClient }))

beforeEach(() => vi.clearAllMocks())

it.each([
  ['owner', 'owner', false, true],
  ['admin', 'other', true, true],
  ['unrelated member', 'other', false, false],
])('protects claimant fields for %s', async (_case, userId, isAdmin, allowed) => {
  const privilegedSelect = vi.fn().mockReturnValue({ eq: () => ({ single: async () => ({ data: { claimant_name: 'Private', claimant_student_id: 'R-1', claimant_recorded_by: 'staff' }, error: null }) }) })
  mocks.createAdminClient.mockReturnValue({ from: () => ({ select: privilegedSelect }) })
  mocks.createClient.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
    from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: table === 'items' ? { posted_by: 'owner' } : { is_admin: isAdmin }, error: null }) }) }) }),
  })
  const { getAuthorizedClaimant } = await import('../claimant')
  const result = await getAuthorizedClaimant('item-1')
  expect(result.claimantName).toBe(allowed ? 'Private' : null)
  expect(privilegedSelect).toHaveBeenCalledTimes(allowed ? 1 : 0)
})
