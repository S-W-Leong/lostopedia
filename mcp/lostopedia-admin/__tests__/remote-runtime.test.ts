import { describe, expect, it } from 'vitest'
import {
  handleRemoteMcpRequest,
  resolveRemoteRuntimeConfig,
  validateRemoteAccess,
} from '../remote'

describe('lostopedia admin remote MCP runtime', () => {
  it('falls back to request origin when base URL is absent', () => {
    const config = resolveRemoteRuntimeConfig('https://lostopedia.app/api/mcp/admin', {})

    expect(config.baseUrl).toBe('https://lostopedia.app')
  })

  it('rejects requests without bearer token', () => {
    const headers = new Headers()

    const result = validateRemoteAccess(headers)

    expect(result.ok).toBe(false)
    expect(result.status).toBe(401)
    expect(result.code).toBe('missing_bearer_token')
  })

  it('rejects malformed bearer token format', () => {
    const headers = new Headers({
      authorization: 'Bearer malformed-token',
    })

    const result = validateRemoteAccess(headers)

    expect(result.ok).toBe(false)
    expect(result.status).toBe(401)
    expect(result.code).toBe('invalid_bearer_token_format')
  })

  it('accepts lowercase bearer auth scheme', () => {
    const headers = new Headers({
      authorization: 'bearer token-id.secret',
    })

    const result = validateRemoteAccess(headers)

    expect(result.ok).toBe(true)
    expect(result.bearerToken).toBe('token-id.secret')
  })

  it('accepts requests with bearer token only', () => {
    const headers = new Headers({
      authorization: 'Bearer token-id.secret',
    })

    const result = validateRemoteAccess(headers)

    expect(result.ok).toBe(true)
    expect(result.bearerToken).toBe('token-id.secret')
  })

  it('returns unavailable while admin automation is paused', async () => {
    const request = new Request('https://lostopedia.app/api/mcp/admin', {
      headers: {
        authorization: 'Bearer token-id.secret',
      },
    })

    const response = await handleRemoteMcpRequest(request, {
      NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED: 'false',
    })
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('feature_unavailable')
  })
})
