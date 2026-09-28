import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rateLimiters } from '@/lib/ratelimit'
import { GET as getAuditEvents } from '../audit/route'
import { NextRequest } from 'next/server'

describe('admin automation audit and rate-limit surfaces', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED', 'true')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns rate limit metadata for automation mutation limiter', async () => {
    const result = await rateLimiters.adminAutomationMutation(
      'session:test-admin',
      'admin.users.update-status'
    )
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.remaining).toBe('number')
    expect(typeof result.reset).toBe('number')
    expect(result.reset).toBeGreaterThan(Date.now())
  })

  it('enforces admin auth on audit route', async () => {
    const request = new NextRequest('http://localhost/api/v1/admin-automation/audit?limit=10')
    const response = await getAuditEvents(request)
    expect([401, 500]).toContain(response.status)
  })

  it('returns unavailable for audit reads while admin automation is paused', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED', 'false')
    const request = new NextRequest('http://localhost/api/v1/admin-automation/audit?limit=10')
    const response = await getAuditEvents(request)
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.success).toBe(false)
    expect(payload.error).toBe('Admin automation is temporarily paused.')
  })
})
