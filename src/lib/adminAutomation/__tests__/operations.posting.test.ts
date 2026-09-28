import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runAdminAutomationOperation } from '../operations'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertDefaultLocation } from '@/lib/organization/location'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({})),
}))

vi.mock('@/lib/supabase/reputation', () => ({
  createReputationEvent: vi.fn(async () => ({ success: true })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/organization/location', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/organization/location')>()),
  assertDefaultLocation: vi.fn(async (_client, requested) => requested),
}))

describe('runAdminAutomationOperation posting operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(assertDefaultLocation).mockReset().mockImplementation(async (_client, requested) => requested as string)
  })

  it('builds per-item draft outcomes and flags missing fields', async () => {
    const result = await runAdminAutomationOperation(
      'admin.items.post-draft',
      {
        items: [
          {
            briefDescription: 'Black umbrella with blue stripe',
            category: 'accessories',
            locationText: 'Library entrance',
            campusId: '11111111-1111-1111-1111-111111111111',
          },
          {
            briefDescription: 'USB drive',
          },
        ],
      },
      {
        actorType: 'session',
        actorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        displayName: 'Admin',
      }
    )

    const typed = result as {
      total: number
      ready: number
      drafts: Array<{ status: 'ready' | 'needs_input'; missingFields: string[] }>
    }

    expect(typed.total).toBe(2)
    expect(typed.ready).toBe(1)
    expect(typed.drafts[0].status).toBe('ready')
    expect(typed.drafts[1].status).toBe('needs_input')
    expect(typed.drafts[1].missingFields).toEqual(
      expect.arrayContaining(['category', 'locationText', 'campusId'])
    )
  })

  it('marks a draft with a different location as needing input', async () => {
    vi.mocked(assertDefaultLocation).mockRejectedValueOnce(new Error('Wrong location'))
    const result = await runAdminAutomationOperation('admin.items.post-draft', {
      items: [{
        briefDescription: 'Example umbrella', category: 'accessories',
        locationText: 'Entrance', campusId: '22222222-2222-4222-8222-222222222222'
      }]
    }, { actorType: 'session', actorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', displayName: 'Operator' })
    expect((result as { drafts: Array<{ status: string; missingFields: string[] }> }).drafts[0]).toMatchObject({
      status: 'needs_input', missingFields: ['campusId']
    })
  })

  it('rejects post-confirm without actor identity', async () => {
    await expect(
      runAdminAutomationOperation(
        'admin.items.post-confirm',
        {
          items: [],
        },
        {
          actorType: 'machine',
          actorId: null,
          displayName: 'Bot',
        }
      )
    ).rejects.toThrow('Posting confirmation requires actor identity')
  })

  it('does not insert a confirmed item for a mismatched location', async () => {
    const insert = vi.fn()
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn().mockReturnValue({ insert }) } as any)
    vi.mocked(assertDefaultLocation).mockRejectedValueOnce(new Error('Wrong location'))

    const result = await runAdminAutomationOperation('admin.items.post-confirm', {
      items: [{
        type: 'found', title: 'Example umbrella', description: 'Found near the entrance',
        category: 'accessories', locationText: 'Entrance',
        campusId: '22222222-2222-4222-8222-222222222222', pickupMethod: 'office'
      }]
    }, { actorType: 'machine', actorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', displayName: 'Operator' })

    expect((result as { createdCount: number }).createdCount).toBe(0)
    expect(insert).not.toHaveBeenCalled()
  })

  it('returns mixed create results for partial batch outcomes', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'item-1' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    const from = vi.fn(() => ({ insert }))

    vi.mocked(createAdminClient).mockReturnValue({ from } as any)

    const result = await runAdminAutomationOperation(
      'admin.items.post-confirm',
      {
        items: [
          {
            type: 'found',
            title: 'Black Umbrella',
            description: 'Found near science block benches.',
            category: 'accessories',
            locationText: 'Science block benches',
            campusId: '11111111-1111-1111-1111-111111111111',
            pickupMethod: 'office',
          },
          {
            type: 'found',
            title: 'USB drive',
            description: 'Recovered near cafeteria counter.',
            locationText: '',
            campusId: '11111111-1111-1111-1111-111111111111',
            pickupMethod: 'office',
          },
        ],
      },
      {
        actorType: 'machine',
        actorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        displayName: 'Ops bot',
      }
    )

    const typed = result as {
      created: Array<{ itemId: string }>
      failed: Array<{ index: number; error: string }>
      createdCount: number
      failedCount: number
    }

    expect(typed.createdCount).toBe(1)
    expect(typed.failedCount).toBe(1)
    expect(typed.created[0].itemId).toBe('item-1')
    expect(typed.failed[0].index).toBe(1)
    expect(insert).toHaveBeenCalledTimes(1)
  })
})
