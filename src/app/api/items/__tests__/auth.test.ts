import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getCachedJson: vi.fn(),
  currentItemsVersion: vi.fn(),
  rateLimitSearch: vi.fn(),
}))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('@/lib/cache/query-cache', async () => {
  const actual = await vi.importActual<typeof import('@/lib/cache/query-cache')>('@/lib/cache/query-cache')
  return {
    ...actual,
    getCachedJson: mocks.getCachedJson,
    currentItemsVersion: mocks.currentItemsVersion,
    buildItemsCacheKey: vi.fn(() => 'items:v1:list'),
  }
})

vi.mock('@/lib/ratelimit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ratelimit')>('@/lib/ratelimit')
  return {
    ...actual,
    getClientIp: vi.fn(() => '127.0.0.1'),
    rateLimiters: {
      ...actual.rateLimiters,
      search: mocks.rateLimitSearch,
    },
  }
})

describe('GET /api/items auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentItemsVersion.mockResolvedValue('v1')
    mocks.rateLimitSearch.mockResolvedValue({ success: true })
  })

  it('returns 401 for guests before reading cached item data', async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    })

    const { GET } = await import('../route')
    const response = await GET(new NextRequest('http://localhost/api/items'))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Authentication required',
    })
    expect(mocks.rateLimitSearch).toHaveBeenCalled()
    expect(mocks.currentItemsVersion).not.toHaveBeenCalled()
    expect(mocks.getCachedJson).not.toHaveBeenCalled()
  })
})
