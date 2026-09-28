import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../[operation]/route'

describe('admin automation destructive flow guardrails', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED', 'true')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns unavailable while admin automation is paused', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED', 'false')
    const request = new NextRequest('http://localhost/api/v1/admin-automation/admin.users.list')
    const response = await GET(request, {
      params: Promise.resolve({ operation: 'admin.users.list' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('feature_unavailable')
  })

  it('returns unsupported operation for unknown operation id before auth', async () => {
    const request = new NextRequest('http://localhost/api/v1/admin-automation/unknown-op')
    const response = await GET(request, {
      params: Promise.resolve({ operation: 'unknown-op' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('unsupported_operation')
  })
})
