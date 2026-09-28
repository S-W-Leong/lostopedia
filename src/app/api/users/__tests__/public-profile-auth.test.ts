import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

describe('GET /api/users/[id]/public auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for guests', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
      from: vi.fn(),
    }
    mocks.createClient.mockResolvedValue(supabase)

    const { GET } = await import('../[id]/public/route')
    const response = await GET(
      new NextRequest('http://localhost/api/users/user-1/public'),
      { params: Promise.resolve({ id: 'user-1' }) }
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Authentication required',
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
