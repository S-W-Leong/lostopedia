import { expect, it } from 'vitest'
import { assertLocalAuthUrl } from '../lib/local-auth'

it('refuses a non-loopback Auth target', () => {
  expect(() => assertLocalAuthUrl('https://example.supabase.co')).toThrow()
  expect(() => assertLocalAuthUrl('http://localhost:54321')).not.toThrow()
  expect(() => assertLocalAuthUrl('http://127.0.0.1:54321')).not.toThrow()
  expect(() => assertLocalAuthUrl('http://[::1]:54321')).not.toThrow()
})
