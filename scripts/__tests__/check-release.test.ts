import { expect, it } from 'vitest'
import { checkReleaseFiles } from '../check-release'

it('flags environment files but permits the public example', () => {
  expect(checkReleaseFiles([{ path: '.env.local', content: 'KEY=value' }])).toHaveLength(1)
  expect(checkReleaseFiles([{ path: '.env.example', content: 'KEY=your-key-here' }])).toEqual([])
})

it('flags private keys and database dumps by path', () => {
  expect(checkReleaseFiles([{ path: 'keys/production.pem', content: '' }])).toHaveLength(1)
  expect(checkReleaseFiles([{ path: 'backup/data.dump', content: '' }])).toHaveLength(1)
})

it('flags an externally supplied deployment string without printing it', () => {
  const marker = ['private', 'deployment', 'marker'].join('-')
  const issues = checkReleaseFiles([{ path: 'README.md', content: `See ${marker}` }], [marker])
  expect(issues).toHaveLength(1)
  expect(JSON.stringify(issues)).not.toContain(marker)
})

it('redacts obvious secret values in findings', () => {
  const token = 'sb_secret_' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456'
  const issues = checkReleaseFiles([{ path: 'config.json', content: `{"token":"${token}"}` }])
  expect(issues).toHaveLength(1)
  expect(JSON.stringify(issues)).not.toContain(token)
})
