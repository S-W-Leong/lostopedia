import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), single: vi.fn(), select: vi.fn(), eq: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))

describe('map popup endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const query = { select: mocks.select, eq: mocks.eq, single: mocks.single }
    mocks.select.mockReturnValue(query)
    mocks.eq.mockReturnValue(query)
    mocks.createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'member' } }, error: null }) },
      from: () => query,
    })
    mocks.single.mockResolvedValue({ data: {
      description: 'Blue phone', image_url: null, location_text: 'Library', created_at: '2026-09-01',
    }, error: null })
  })
  async function request() {
    const { GET } = await import('../route')
    return GET(new NextRequest('http://localhost/api/map/items/item'), { params: Promise.resolve({ id: 'item' }) })
  }
  it('requires auth before accessing details', async () => {
    mocks.createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } })
    expect((await request()).status).toBe(401)
    expect(mocks.select).not.toHaveBeenCalled()
  })
  it('returns only popup fields for the requested item under the session client', async () => {
    expect(await (await request()).json()).toEqual({ success: true, item: {
      description: 'Blue phone', imageUrl: null, locationText: 'Library', createdAt: '2026-09-01',
    } })
    expect(mocks.select).toHaveBeenCalledWith('description, image_url, location_text, created_at')
    expect(mocks.eq).toHaveBeenCalledWith('id', 'item')
  })
  it('reports missing or RLS-hidden items as not found', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    expect((await request()).status).toBe(404)
  })
  it('does not expose internal database errors', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: 'SQL', message: 'secret' } })
    const response = await request()
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('secret')
  })
})
