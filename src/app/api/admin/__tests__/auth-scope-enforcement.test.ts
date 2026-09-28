import { describe, expect, it } from 'vitest'
import { hasRequiredScopes } from '@/lib/auth/adminAutomation'

describe('admin automation scope enforcement', () => {
  it('permits read-only operations with read scope', () => {
    expect(hasRequiredScopes(['read'], ['read'])).toBe(true)
  })

  it('rejects destructive operations without destructive scope', () => {
    expect(hasRequiredScopes(['read', 'mutate'], ['mutate', 'destructive'])).toBe(false)
  })
})
