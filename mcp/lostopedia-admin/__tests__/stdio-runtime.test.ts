import { describe, expect, it } from 'vitest'
import { createAdminMcpServer, resolveBearerTokenFromExtra, resolveRuntimeConfig } from '../stdio'

describe('lostopedia admin MCP stdio runtime', () => {
  it('requires base URL and automation PAT env vars', () => {
    expect(() => resolveRuntimeConfig({})).toThrow('LOSTOPEDIA_BASE_URL is required.')
    expect(() => resolveRuntimeConfig({ LOSTOPEDIA_BASE_URL: 'https://lostopedia.app' })).toThrow(
      'LOSTOPEDIA_ADMIN_PAT is required.'
    )
  })

  it('creates server instance with valid runtime config', () => {
    const server = createAdminMcpServer({
      baseUrl: 'https://lostopedia.app',
      bearerToken: 'token-id.secret',
    })

    expect(server).toBeTruthy()
  })

  it('extracts bearer token from request auth info', () => {
    expect(resolveBearerTokenFromExtra({ authInfo: { token: 'token-id.secret' } })).toBe(
      'token-id.secret'
    )
    expect(resolveBearerTokenFromExtra({ authInfo: {} })).toBeUndefined()
  })
})

