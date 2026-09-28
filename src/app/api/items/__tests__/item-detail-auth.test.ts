import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getAuthorizedClaimant: vi.fn(),
}))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))
vi.mock('@/lib/supabase/claimant', () => ({ getAuthorizedClaimant: mocks.getAuthorizedClaimant }))

describe('GET /api/items/[id] auth', () => {
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

    const { GET } = await import('../[id]/route')
    const response = await GET(
      new NextRequest('http://localhost/api/items/item-1'),
      { params: Promise.resolve({ id: 'item-1' }) }
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Authentication required',
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns no claimant values to an unrelated member', async () => {
    let selected = ''
    mocks.createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'other' } }, error: null }) },
      from: () => ({ select: (columns: string) => {
        selected = columns
        return { eq: () => ({ single: async () => ({ data: {
          id: 'item-1', title: 'Umbrella', status: 'completed', posted_by: 'owner',
          claimant_name: 'Secret name', claimant_student_id: 'Secret reference',
        }, error: null }) }) }
      } }),
    })
    mocks.getAuthorizedClaimant.mockResolvedValue({ claimantName: null, claimantStudentId: null, claimantRecordedBy: null })

    const { GET } = await import('../[id]/route')
    const response = await GET(new NextRequest('http://localhost/api/items/item-1'), { params: Promise.resolve({ id: 'item-1' }) })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(selected).not.toContain('claimant_name')
    expect(body.item.claimantName).toBeNull()
    expect(body.item.claimantStudentId).toBeNull()
  })
})
