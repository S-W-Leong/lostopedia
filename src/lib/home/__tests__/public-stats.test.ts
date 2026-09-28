import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPublicSupabaseClient: vi.fn(),
  unstableCache: vi.fn((callback: () => unknown) => callback),
}))

vi.mock('@/lib/supabase/public', () => ({
  getPublicSupabaseClient: mocks.getPublicSupabaseClient,
}))

vi.mock('server-only', () => ({}))

vi.mock('next/cache', () => ({
  unstable_cache: mocks.unstableCache,
}))

describe('getPublicStats', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('maps the narrow public stats RPC and caches it for 15 minutes', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { total_users: 258, total_items: 123, items_recovered: 31 },
      error: null,
    })
    const rpc = vi.fn(() => ({ single }))
    mocks.getPublicSupabaseClient.mockReturnValue({ rpc })

    const { getPublicStats } = await import('../public-stats')

    await expect(getPublicStats()).resolves.toEqual({
      totalUsers: 258,
      totalItems: 123,
      itemsRecovered: 31,
    })
    expect(rpc).toHaveBeenCalledWith('get_public_stats')
    expect(mocks.unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ['homepage-public-stats'],
      { revalidate: 900, tags: ['homepage-public-stats'] }
    )
  })

  it('returns zeros when no cached result exists and the RPC fails', async () => {
    mocks.getPublicSupabaseClient.mockReturnValue({
      rpc: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('rpc failed') }),
      })),
    })

    const { getPublicStats } = await import('../public-stats')

    await expect(getPublicStats()).resolves.toEqual({
      totalUsers: 0,
      totalItems: 0,
      itemsRecovered: 0,
    })
  })
})
