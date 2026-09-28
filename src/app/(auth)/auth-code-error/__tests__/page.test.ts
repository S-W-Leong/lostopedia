import { describe, expect, it } from 'vitest'
import { getAuthCodeErrorMessage } from '../page'

describe('getAuthCodeErrorMessage', () => {
  it('distinguishes expired links from missing local PKCE state', () => {
    expect(getAuthCodeErrorMessage('expired_link')).toContain('expired')
    expect(getAuthCodeErrorMessage('missing_pkce_state')).toContain('same browser')
  })
})
