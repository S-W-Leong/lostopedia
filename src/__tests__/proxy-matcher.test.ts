import { describe, expect, it } from 'vitest'
import { config } from '@/proxy'

describe('proxy matcher', () => {
  it('contains only explicit protected route patterns', () => {
    expect(config.matcher).toEqual([
      '/dashboard/:path*',
      '/post/:path*',
      '/my-items/:path*',
      '/messages/:path*',
      '/profile/:path*',
      '/search/:path*',
      '/map/:path*',
      '/user/:path*',
      '/item/:path*',
    ])
  })
})
