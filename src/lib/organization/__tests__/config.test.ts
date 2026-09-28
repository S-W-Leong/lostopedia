import { describe, expect, it } from 'vitest'
import sample from '../../../../config/organization.json'
import { organization } from '../config'
import { parseOrganizationConfig } from '../schema'
import { isEmailAllowed, normalizeEmail, registrationDescription } from '../registration'
import { resolveAppUrl } from '../app-url'

describe('organization configuration', () => {
  it('parses the checked-in fictional configuration', () => {
    expect(organization).toEqual(parseOrganizationConfig(sample))
  })

  it('reports a field-specific error for missing or invalid configuration', () => {
    expect(() => parseOrganizationConfig({})).toThrow(/name/i)
    expect(() => parseOrganizationConfig({ ...sample, location: { ...sample.location, zoom: 23 } })).toThrow(/location\.zoom/i)
    expect(() => parseOrganizationConfig({ ...sample, registration: { mode: 'restricted', allowedDomains: [] } })).toThrow(/registration\.allowedDomains/i)
  })

  it.each(['/https://example.org', '//evil.test/logo.svg', '/a?x=1', '/a#x', '/a/../b', '/a\\b'])('rejects unsafe logo path %s', (logoPath) => {
    expect(() => parseOrganizationConfig({ ...sample, logoPath })).toThrow(/logoPath/i)
  })

  it.each(['http://example.org', 'https://user:pass@example.org', 'javascript:alert(1)'])('rejects unsafe map URL %s', (mapsUrl) => {
    expect(() => parseOrganizationConfig({ ...sample, office: { ...sample.office, mapsUrl } })).toThrow(/office\.mapsUrl/i)
  })

  it('rejects control characters in display fields', () => {
    expect(() => parseOrganizationConfig({ ...sample, organizationName: 'Bad\u0000 Name' })).toThrow(/organizationName/i)
    expect(() => parseOrganizationConfig({ ...sample, organizationName: '\nExample Community' })).toThrow(/organizationName/i)
  })

  it.each([
    { latitude: -91 }, { latitude: 91 }, { longitude: -181 }, { longitude: 181 }, { zoom: 2.5 }
  ])('rejects out-of-range location coordinates or zoom %o', (change) => {
    expect(() => parseOrganizationConfig({ ...sample, location: { ...sample.location, ...change } })).toThrow(/location\./i)
  })

  it('normalizes and deduplicates exact allowed domains', () => {
    const config = parseOrganizationConfig({ ...sample, registration: { mode: 'restricted', allowedDomains: [' EXAMPLE.ORG ', 'example.org'] } })
    expect(config.registration.allowedDomains).toEqual(['example.org'])
  })

  it.each(['@example.org', 'example.org@evil', '-example.org', 'example..org', 'exa_mple.org'])('rejects invalid domain %s', (domain) => {
    expect(() => parseOrganizationConfig({ ...sample, registration: { mode: 'restricted', allowedDomains: [domain] } })).toThrow(/registration\.allowedDomains/i)
  })

  it('supports a second open organization with a distinct location and optional reference', () => {
    const library = parseOrganizationConfig({
      ...sample,
      organizationName: 'Example Library',
      location: { ...sample.location, name: 'Central branch', slug: 'central-branch' },
      claimantReference: { label: 'Library card', required: false },
      registration: { mode: 'open', allowedDomains: [] }
    })
    expect(library.organizationName).toBe('Example Library')
    expect(library.location.slug).toBe('central-branch')
    expect(library.claimantReference.required).toBe(false)
    expect(isEmailAllowed('reader@another.example', library.registration)).toBe(true)
  })
})

describe('registration policy', () => {
  it('accepts only a complete allowed domain', () => {
    const { registration } = parseOrganizationConfig(sample)
    expect(isEmailAllowed(' Member@EXAMPLE.ORG ', registration)).toBe(true)
    expect(isEmailAllowed('member@example.org.evil.test', registration)).toBe(false)
    expect(isEmailAllowed('member@notexample.org', registration)).toBe(false)
  })

  it.each(['', 'member', 'member@@example.org', 'member @example.org', 'member@example..org', 'member@-example.org'])('rejects malformed email %s even in open mode', (email) => {
    expect(isEmailAllowed(email, { mode: 'open', allowedDomains: [] })).toBe(false)
  })

  it('normalizes surrounding space and case and describes policy', () => {
    expect(normalizeEmail(' Member@EXAMPLE.ORG ')).toBe('member@example.org')
    expect(registrationDescription({ mode: 'restricted', allowedDomains: ['example.org'] })).toContain('example.org')
    expect(registrationDescription({ mode: 'open', allowedDomains: [] })).not.toContain('example.org')
  })
})

describe('canonical app URL', () => {
  it('rejects production without an explicit secure origin', () => {
    expect(() => resolveAppUrl(undefined, 'production')).toThrow()
    expect(() => resolveAppUrl('http://example.org', 'production')).toThrow()
    expect(resolveAppUrl('https://example.org/', 'production')).toBe('https://example.org')
  })

  it('defaults to localhost only outside production', () => {
    expect(resolveAppUrl(undefined, 'development')).toBe('http://localhost:3000')
    expect(resolveAppUrl('http://127.0.0.1:54321', 'test')).toBe('http://127.0.0.1:54321')
  })

  it.each(['https://user:pass@example.org', 'https://example.org/path', 'https://example.org/?q=x', 'https://example.org/#x', 'ftp://example.org', 'http://example.org'])('rejects unsafe origin %s', (value) => {
    expect(() => resolveAppUrl(value, 'production')).toThrow()
  })
})
