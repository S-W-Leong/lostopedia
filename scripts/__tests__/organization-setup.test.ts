import { describe, expect, it } from 'vitest'
import sample from '../../config/organization.json'
import { parseOrganizationConfig } from '../../src/lib/organization/schema'
import { compareOrganizationSetup, configurationHash, renderOrganizationSql, sqlLiteral } from '../lib/organization-setup'

const config = parseOrganizationConfig(sample)

describe('organization setup generation', () => {
  it('escapes SQL literals without treating backslashes as escapes', () => {
    expect(sqlLiteral("Example's team")).toBe("'Example''s team'")
    expect(sqlLiteral('Example\\branch')).toBe("'Example\\branch'")
    expect(() => sqlLiteral('\u0000')).toThrow()
  })

  it('changes the setup fingerprint when registration policy changes', () => {
    const open = parseOrganizationConfig({ ...sample, registration: { mode: 'open', allowedDomains: [] } })
    expect(configurationHash(config)).not.toBe(configurationHash(open))
  })

  it('hashes equivalent normalized domains identically', () => {
    const first = parseOrganizationConfig({ ...sample, registration: { mode: 'restricted', allowedDomains: [' example.org ', 'EXAMPLE.NET', 'example.org'] } })
    const second = parseOrganizationConfig({ ...sample, registration: { mode: 'restricted', allowedDomains: ['example.net', 'example.org'] } })
    expect(configurationHash(first)).toBe(configurationHash(second))
  })

  it('generates transaction-wrapped SQL for quoted names and stable updates', () => {
    const quoted = parseOrganizationConfig({
      ...sample,
      organizationName: "Example's team \\ branch",
      location: { ...sample.location, name: "Manager's room" }
    })
    const sql = renderOrganizationSql(quoted)
    expect(sql).toContain('SET LOCAL standard_conforming_strings = on')
    expect(sql).toContain("'Manager''s room'")
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('WHERE id = existing_location_id')
    expect(sql.trim().endsWith('COMMIT;')).toBe(true)
  })

  it('uses a dollar quote delimiter absent from configured text', () => {
    const embedded = parseOrganizationConfig({ ...sample, location: { ...sample.location, name: '$organization_setup$ room' } })
    const sql = renderOrganizationSql(embedded)
    expect(sql).not.toContain('DO $organization_setup$')
    expect(sql).toContain("'$organization_setup$ room'")
  })
})

describe('installed setup comparison', () => {
  it('reports a manually changed coordinate even when the hash matches', () => {
    const mismatches = compareOrganizationSetup(config, {
      configHash: configurationHash(config),
      registration: config.registration,
      location: { ...config.location, id: '11111111-1111-4111-8111-111111111111', isActive: true, latitude: 1 }
    })
    expect(mismatches).toContain('location.latitude')
    expect(mismatches).not.toContain('configHash')
  })

  it('rejects missing or inactive default location', () => {
    expect(compareOrganizationSetup(config, {
      configHash: configurationHash(config),
      registration: config.registration,
      location: { ...config.location, id: '', isActive: false }
    })).toEqual(expect.arrayContaining(['location.id', 'location.isActive']))
  })
})
