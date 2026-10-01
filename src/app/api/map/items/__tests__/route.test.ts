import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))

describe('map marker endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'member' } }, error: null }) },
      rpc: mocks.rpc,
    })
    mocks.rpc.mockResolvedValue({ data: [], error: null })
  })

  async function request(query = 'south=3&north=4&west=101&east=102') {
    const { GET } = await import('../route')
    return GET(new NextRequest(`http://localhost/api/map/items?${query}`))
  }

  it('requires auth before querying markers', async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
      rpc: mocks.rpc,
    })
    expect((await request()).status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it.each([
    '', 'south=&north=4&west=101&east=102',
    'south=5&north=4&west=101&east=102',
    'south=NaN&north=4&west=101&east=102',
    'south=3&north=91&west=101&east=102',
    'south=3&north=4&west=-181&east=102',
    'south=3&north=4&west=101&east=102&type=invalid',
    'south=3&north=4&west=101&east=102&category=invalid',
  ])('rejects invalid bounds or filters: %s', async (query) => {
    expect((await request(query)).status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('passes viewport and filters and requests only cap + one rows', async () => {
    await request('south=-4&north=4&west=170&east=-170&type=lost&category=electronics&limit=500')
    expect(mocks.rpc).toHaveBeenCalledWith('map_items_in_bounds', {
      p_south: -4, p_north: 4, p_west: 170, p_east: -170,
      p_type: 'lost', p_category: 'electronics',
    })
  })

  it('caps the payload, detects overflow, and strips detail fields', async () => {
    mocks.rpc.mockResolvedValue({
      data: Array.from({ length: 51 }, (_, i) => ({
        id: String(i), type: 'lost', title: 'Phone', latitude: 0, longitude: 102,
        description: 'private details', poster: { id: 'poster' },
      })), error: null,
    })
    const body = await (await request()).json()
    expect(body.items).toHaveLength(50)
    expect(body.hasMore).toBe(true)
    expect(body.items[0]).toEqual({
      id: '0', type: 'lost', title: 'Phone', geoLocation: { latitude: 0, longitude: 102 },
    })
    expect(body).not.toHaveProperty('total')
  })

  it('does not claim overflow at exactly the cap', async () => {
    mocks.rpc.mockResolvedValue({ data: Array.from({ length: 50 }, () => ({
      id: 'id', type: 'found', title: 'Keys', latitude: 3, longitude: 101,
    })), error: null })
    expect(await (await request()).json()).toMatchObject({ hasMore: false })
  })

  it('returns an empty viewport without a count', async () => {
    expect(await (await request()).json()).toEqual({ success: true, items: [], hasMore: false })
  })

  it('reports database failure without leaking details', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'internal SQL details' } })
    const response = await request()
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('internal SQL details')
  })
})
