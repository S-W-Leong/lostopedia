import { describe, expect, it } from 'vitest'
import {
  HELP_LOST_FOUND_OFFICE_ANCHOR,
  LOST_FOUND_OFFICE,
  LOST_FOUND_OFFICE_PICKUP_CARD_SUMMARY,
  safeTelephoneHref,
} from '../lost-found-office'
import { organization } from '@/lib/organization/config'

describe('lost-found-office', () => {
  it('exports stable help anchor', () => {
    expect(HELP_LOST_FOUND_OFFICE_ANCHOR).toBe('lost-and-found-office')
  })

  it('adapts configured office fields', () => {
    expect(LOST_FOUND_OFFICE.department).toBe(organization.office.name)
    expect(LOST_FOUND_OFFICE.buildingLine).toBe(organization.office.address)
    expect(LOST_FOUND_OFFICE.email).toBeNull()
    expect(LOST_FOUND_OFFICE.hoursLine).toBeNull()
    expect(LOST_FOUND_OFFICE.telHref).toBeNull()
    expect(LOST_FOUND_OFFICE.mapsUrl).toBeNull()
  })

  it('pickup card summary is non-empty', () => {
    expect(LOST_FOUND_OFFICE_PICKUP_CARD_SUMMARY.length).toBeGreaterThan(20)
  })

  it('links only normalized telephone numbers', () => {
    expect(safeTelephoneHref('+60 12-345-6789')).toBe('tel:+60123456789')
    expect(safeTelephoneHref('012-345-6789 ext 9999')).toBeNull()
  })
})
