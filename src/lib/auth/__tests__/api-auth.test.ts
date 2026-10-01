import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

describe('requireApiUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a 401 response when there is no signed-in user', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    }
    mocks.createClient.mockResolvedValue(supabase)

    const { requireApiUser } = await import('../api-auth')
    const result = await requireApiUser()

    expect(result.user).toBeNull()
    expect(result.response?.status).toBe(401)
    await expect(result.response?.json()).resolves.toEqual({
      success: false,
      error: 'Authentication required',
    })
  })

  it('returns a 401 response when getUser returns an auth error', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('invalid session'),
        }),
      },
    }
    mocks.createClient.mockResolvedValue(supabase)

    const { requireApiUser } = await import('../api-auth')
    const result = await requireApiUser()

    expect(result.user).toBeNull()
    expect(result.response?.status).toBe(401)
    await expect(result.response?.json()).resolves.toEqual({
      success: false,
      error: 'Authentication required',
    })
  })

  it('returns the Supabase client and user when authenticated', async () => {
    const user = { id: 'user-1', email: 'member@example.org' }
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
          error: null,
        }),
      },
    }
    mocks.createClient.mockResolvedValue(supabase)

    const { requireApiUser } = await import('../api-auth')
    const result = await requireApiUser()

    expect(result.supabase).toBe(supabase)
    expect(result.user).toBe(user)
    expect(result.response).toBeNull()
  })
})
