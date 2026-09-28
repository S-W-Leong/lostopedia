import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  uploadAvatar: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/storage', () => ({
  IMAGE_COMPRESSION_UNAVAILABLE: 'Image compression is temporarily unavailable. Please retry.',
  uploadAvatar: mocks.uploadAvatar,
  deleteAvatar: vi.fn(),
}))

import { POST } from '../route'

const userId = 'user-1'
const avatarUrl = 'https://cdn.example/user-1/avatar.webp'

function makeRequest() {
  const formData = new FormData()
  formData.set('avatar', new File(['avatar'], 'avatar.png', { type: 'image/png' }))

  return { formData: vi.fn().mockResolvedValue(formData) } as unknown as NextRequest
}

function mockSupabaseUpdate(singleResult: {
  data: { id: string } | null
  error: Record<string, unknown> | null
}) {
  const single = vi.fn().mockResolvedValue(singleResult)
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))

  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from,
  })

  return { eq, select, single }
}

describe('POST /api/profile/avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.uploadAvatar.mockResolvedValue({ url: avatarUrl })
  })

  it('returns success only after the owned profile update returns one row', async () => {
    const chain = mockSupabaseUpdate({ data: { id: userId }, error: null })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, url: avatarUrl })
    expect(chain.eq).toHaveBeenCalledWith('id', userId)
    expect(chain.select).toHaveBeenCalledWith('id')
    expect(chain.single).toHaveBeenCalledOnce()
  })

  it('returns 500 and logs structured diagnostics when the profile update is rejected', async () => {
    const updateError = {
      code: '42501',
      message: 'permission denied for table users',
      details: null,
      hint: 'Grant the required privilege',
    }
    mockSupabaseUpdate({ data: null, error: updateError })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await POST(makeRequest())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Failed to update avatar. Please try again.',
    })
    expect(consoleError).toHaveBeenCalledWith({
      ...updateError,
      route: '/api/profile/avatar',
      userId,
    })
    consoleError.mockRestore()
  })

  it('cannot return success when the single-row assertion reports no profile row', async () => {
    const updateError = {
      code: 'PGRST116',
      message: 'Cannot coerce the result to a single JSON object',
      details: 'The result contains 0 rows',
      hint: null,
    }
    mockSupabaseUpdate({ data: null, error: updateError })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await POST(makeRequest())

    expect(response.status).toBe(500)
    expect(consoleError).toHaveBeenCalledWith({
      ...updateError,
      route: '/api/profile/avatar',
      userId,
    })
    consoleError.mockRestore()
  })
})
