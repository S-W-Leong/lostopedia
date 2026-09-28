import { describe, it, expect } from 'vitest'
import { canViewClaimantDetails } from '../claimant'

describe('canViewClaimantDetails', () => {
  it('returns true when the viewer is the owner of the item', () => {
    expect(canViewClaimantDetails('owner-id', false, 'owner-id')).toBe(true)
  })

  it('returns true when the viewer is an admin and not the owner', () => {
    expect(canViewClaimantDetails('admin-id', true, 'owner-id')).toBe(true)
  })

  it('returns false when the viewer is neither owner nor admin', () => {
    expect(canViewClaimantDetails('other-user-id', false, 'owner-id')).toBe(false)
  })

  it('returns false when the viewer is anonymous', () => {
    expect(canViewClaimantDetails(null, false, 'owner-id')).toBe(false)
    expect(canViewClaimantDetails(undefined, false, 'owner-id')).toBe(false)
  })
})
