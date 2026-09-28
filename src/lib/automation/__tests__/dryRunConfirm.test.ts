import { describe, expect, it } from 'vitest'
import { createIntentHash } from '../dryRunConfirm'

describe('dry-run confirm helpers', () => {
  it('creates deterministic intent hashes', () => {
    const payload = { itemIds: ['a', 'b'], action: 'remove' }
    const first = createIntentHash('admin.items.bulk-update', payload)
    const second = createIntentHash('admin.items.bulk-update', payload)
    expect(first).toBe(second)
  })

  it('creates distinct hashes for distinct payloads', () => {
    const first = createIntentHash('admin.items.bulk-update', { action: 'remove' })
    const second = createIntentHash('admin.items.bulk-update', { action: 'restore' })
    expect(first).not.toBe(second)
  })
})
