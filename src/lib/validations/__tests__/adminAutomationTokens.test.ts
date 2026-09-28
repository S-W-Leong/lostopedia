import { describe, expect, it } from 'vitest'
import {
  createAutomationTokenSchema,
  revokeAutomationTokenSchema,
} from '@/lib/validations/adminAutomationTokens'

describe('admin automation token validations', () => {
  it('accepts valid token creation payload', () => {
    const parsed = createAutomationTokenSchema.safeParse({
      tokenName: 'Ops Token',
      serviceAccountName: 'Claude Client',
      scopes: ['read', 'mutate'],
    })
    expect(parsed.success).toBe(true)
  })

  it('requires explicit confirm for destructive scope', () => {
    const parsed = createAutomationTokenSchema.safeParse({
      tokenName: 'Danger Token',
      serviceAccountName: 'Danger Client',
      scopes: ['read', 'destructive'],
      confirmDestructiveScope: false,
    })
    expect(parsed.success).toBe(false)
  })

  it('requires confirm=true for revoke', () => {
    const parsed = revokeAutomationTokenSchema.safeParse({})
    expect(parsed.success).toBe(false)
  })
})

