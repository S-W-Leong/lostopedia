import { expect, it, vi } from 'vitest'

it('uses the configured Supabase image host without deployment-specific redirects', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example-project.supabase.co')
  const { default: config } = await import('../../next.config')
  expect(config.images?.remotePatterns).toEqual(expect.arrayContaining([
    expect.objectContaining({ hostname: 'example-project.supabase.co' })
  ]))
  const redirects = typeof config.redirects === 'function' ? await config.redirects() : []
  expect(redirects).toEqual([])
})
