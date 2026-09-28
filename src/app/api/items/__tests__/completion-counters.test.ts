import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  isAdmin: vi.fn(),
  itemUpdate: vi.fn(),
  createReputationEvent: vi.fn(),
  bumpItemsVersion: vi.fn()
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient, isAdmin: mocks.isAdmin }))
vi.mock('@/lib/ratelimit', () => ({ rateLimiters: { itemUpdate: mocks.itemUpdate } }))
vi.mock('@/lib/supabase/reputation', () => ({ createReputationEvent: mocks.createReputationEvent }))
vi.mock('@/lib/cache/query-cache', () => ({ bumpItemsVersion: mocks.bumpItemsVersion }))

describe('item completion counters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('credits the item owner through the trusted server client after authorization', async () => {
    const ownerId = 'b99771ce-b6ba-4fa1-9c79-68fe09a82e4d'
    const itemId = 'debb0ee9-903c-4776-86eb-8a11e5273f34'
    const owner = { id: ownerId, total_items_recovered: 0 }
    const item = { id: itemId, posted_by: ownerId, status: 'active', type: 'lost', title: 'Example keys', pickup_method: 'meetup' }

    function client(privileged: boolean) {
      return {
        auth: { getUser: async () => ({ data: { user: { id: ownerId } }, error: null }) },
        from(table: string) {
          return {
            select(_columns: string) {
              return {
                eq(_key: string, _value: string) {
                  return { single: async () => ({ data: table === 'items' ? item : owner, error: null }) }
                }
              }
            },
            update(patch: Record<string, unknown>) {
              return {
                eq: async (_key: string, _value: string) => {
                  if (table === 'users' && !privileged) return { error: { code: '42501' } }
                  if (table === 'users') Object.assign(owner, patch)
                  else Object.assign(item, patch)
                  return { error: null }
                }
              }
            }
          }
        }
      }
    }

    mocks.createClient.mockResolvedValue(client(false))
    mocks.createAdminClient.mockReturnValue(client(true))
    mocks.isAdmin.mockResolvedValue(false)
    mocks.itemUpdate.mockResolvedValue({ success: true })
    mocks.createReputationEvent.mockResolvedValue({ success: true })
    mocks.bumpItemsVersion.mockResolvedValue(undefined)

    const { POST } = await import('../[id]/complete/route')
    const response = await POST(new NextRequest(`http://localhost/api/items/${itemId}/complete`, { method: 'POST' }), {
      params: Promise.resolve({ id: itemId })
    })

    expect(response.status).toBe(200)
    expect(owner.total_items_recovered).toBe(1)
  })
})
