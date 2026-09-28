import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/flags/route'

const {
  getUserMock,
  fromMock,
  selectMock,
  eqMock,
  singleMock,
  rateLimitFlagCreationMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  singleMock: vi.fn(),
  rateLimitFlagCreationMock: vi.fn(),
}))

vi.mock('@/lib/ratelimit', () => ({
  rateLimiters: {
    flagCreation: rateLimitFlagCreationMock,
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
  })),
}))

describe('flags POST rate limiting', () => {
  const itemId = '11111111-1111-4111-8111-111111111111'

  beforeEach(() => {
    vi.clearAllMocks()

    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
        },
      },
    })

    const eqChain = {
      eq: eqMock,
      single: singleMock,
    }

    selectMock.mockReturnValue(eqChain)
    eqMock.mockReturnValue(eqChain)
    singleMock.mockResolvedValue({ data: { id: 'existing-flag' } })
    fromMock.mockReturnValue({
      select: selectMock,
    })
  })

  it('returns 429 before touching the database when the limiter blocks the request', async () => {
    rateLimitFlagCreationMock.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now(),
    })

    const request = new NextRequest('http://localhost/api/flags', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        itemId,
        reason: 'spam',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(429)
    expect(payload.success).toBe(false)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('continues into the database flow when the limiter allows the request', async () => {
    rateLimitFlagCreationMock.mockResolvedValue({
      success: true,
      remaining: 9,
      reset: Date.now() + 60_000,
    })

    const request = new NextRequest('http://localhost/api/flags', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        itemId,
        reason: 'spam',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(fromMock).toHaveBeenCalledWith('flags')
    expect(response.status).toBe(400)
    expect(payload.error).toBe('You have already flagged this content')
  })
})
