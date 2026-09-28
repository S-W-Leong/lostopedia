import { describe, expect, it } from 'vitest'
import { getIdempotencyKeyFromHeaders, hashOperationPayload } from '../idempotency'

describe('idempotency helpers', () => {
  it('extracts idempotency key from headers', () => {
    const headers = new Headers({
      'x-idempotency-key': 'abc-123',
    })
    expect(getIdempotencyKeyFromHeaders(headers)).toBe('abc-123')
  })

  it('returns null when key header is absent', () => {
    expect(getIdempotencyKeyFromHeaders(new Headers())).toBeNull()
  })

  it('hashes operation payload deterministically', () => {
    const payload = { is_banned: true, userId: 'u1' }
    expect(hashOperationPayload('admin.users.update-status', payload)).toBe(
      hashOperationPayload('admin.users.update-status', payload)
    )
  })
})
