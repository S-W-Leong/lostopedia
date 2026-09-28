import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  isAdmin: vi.fn(),
  itemCreation: vi.fn()
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/admin', () => ({ isAdmin: mocks.isAdmin }))
vi.mock('@/lib/ratelimit', () => ({ rateLimiters: { itemCreation: mocks.itemCreation } }))

describe('POST /api/items default location', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isAdmin.mockResolvedValue(false)
    mocks.itemCreation.mockResolvedValue({ success: true })
  })

  it('rejects a different location before inserting an item', async () => {
    const insert = vi.fn()
    const single = vi.fn().mockResolvedValue({ data: { id: 'canonical-location' }, error: null })
    const eq = vi.fn().mockReturnThis()
    const from = vi.fn((table: string) => table === 'campuses'
      ? { select: vi.fn().mockReturnValue({ eq, single }) }
      : { insert })
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'member-1' } }, error: null }) },
      from
    })
    const { POST } = await import('../route')
    const response = await POST(new NextRequest('http://localhost/api/items', {
      method: 'POST',
      body: JSON.stringify({
        type: 'lost', title: 'Example keys', description: 'Keys on a blue ring',
        category: 'keys', locationText: 'Near entrance', campusId: 'other-location', images: []
      }),
      headers: { 'content-type': 'application/json' }
    }))
    expect(response.status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
  })
})
