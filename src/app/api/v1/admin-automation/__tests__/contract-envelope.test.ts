import { describe, expect, it } from 'vitest'
import { contractError, contractSuccess } from '@/lib/api/contractResponse'

describe('contract response envelopes', () => {
  it('builds success envelope with operation id and request id', async () => {
    const response = contractSuccess('admin.users.list', 'req-1', { users: [] })
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(payload.operationId).toBe('admin.users.list')
    expect(payload.requestId).toBe('req-1')
  })

  it('builds problem-details error envelope', async () => {
    const response = contractError(
      'invalid_input',
      'Input payload does not match operation schema.',
      400,
      'req-2',
      'admin.users.list'
    )
    const payload = await response.json()

    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('invalid_input')
    expect(payload.error.status).toBe(400)
  })
})
