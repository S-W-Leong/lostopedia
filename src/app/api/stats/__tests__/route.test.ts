import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))

describe('GET /api/stats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads authenticated dashboard stats through one user-scoped RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        total_items: 4,
        active_items: 2,
        completed_items: 1,
        expired_items: 1,
        unread_messages: 3,
        unread_notifications: 5,
        expiring_soon: 1,
        reputation_score: 42,
        total_items_recovered: 2,
        total_items_returned: 1,
      }],
      error: null,
    })
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      rpc,
    })
    const { GET } = await import('../route')

    const response = await GET(new Request('http://localhost/api/stats') as never)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('get_dashboard_stats')
    expect(body.stats.unreadNotifications).toBe(5)
    expect(body.expiringSoon).toBe(1)
  })
})
