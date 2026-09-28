import { expect, it } from 'vitest'
import { serializeJsonLd, organizationOrigin } from '../metadata'

it('escapes a script-closing organization name while preserving JSON data', () => {
  const name = 'Example </script><script>alert(1)</script>'
  const serialized = serializeJsonLd({ name })
  expect(serialized).not.toContain('</script>')
  expect(JSON.parse(serialized)).toEqual({ name })
})

it('uses the configured canonical origin', () => {
  expect(organizationOrigin('https://community.example.org/', 'production')).toBe('https://community.example.org')
})
