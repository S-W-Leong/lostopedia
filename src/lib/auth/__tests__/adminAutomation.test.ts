import { describe, expect, it } from 'vitest'
import {
  composePresentedAutomationToken,
  createAutomationTokenPrefix,
  createAutomationTokenSecret,
  hasRequiredScopes,
  hashAutomationTokenSecret,
  parseAuthorizationHeader,
  parsePresentedToken,
} from '../adminAutomation'

describe('admin automation auth helpers', () => {
  it('parses bearer token header', () => {
    expect(parseAuthorizationHeader('Bearer token-id.secret')).toBe('token-id.secret')
    expect(parseAuthorizationHeader('')).toBeNull()
    expect(parseAuthorizationHeader(null)).toBeNull()
    expect(parseAuthorizationHeader('Basic abc')).toBeNull()
  })

  it('parses presented token payload', () => {
    expect(parsePresentedToken('abc.def')).toEqual({ tokenId: 'abc', secret: 'def' })
    expect(parsePresentedToken('abc')).toBeNull()
    expect(parsePresentedToken('.def')).toBeNull()
    expect(parsePresentedToken('abc.')).toBeNull()
  })

  it('hashes token secrets deterministically', () => {
    const input = 'secret-value'
    expect(hashAutomationTokenSecret(input)).toBe(hashAutomationTokenSecret(input))
  })

  it('creates random token secrets', () => {
    const first = createAutomationTokenSecret()
    const second = createAutomationTokenSecret()
    expect(first).not.toBe(second)
    expect(first.length).toBeGreaterThan(20)
  })

  it('creates random token prefixes', () => {
    const first = createAutomationTokenPrefix()
    const second = createAutomationTokenPrefix()
    expect(first).not.toBe(second)
    expect(first.startsWith('lat_')).toBe(true)
  })

  it('composes presented token in id.secret format', () => {
    expect(composePresentedAutomationToken('id-1', 'secret-1')).toBe('id-1.secret-1')
  })

  it('validates required scopes', () => {
    expect(hasRequiredScopes(['read', 'mutate'], ['read'])).toBe(true)
    expect(hasRequiredScopes(['mutate'], ['mutate', 'destructive'])).toBe(false)
  })
})
