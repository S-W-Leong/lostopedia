import { MetadataRoute } from 'next'
import { organizationOrigin } from '@/lib/organization/metadata'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard',
          '/my-items',
          '/messages',
          '/post',
          '/profile',
        ],
      },
    ],
    sitemap: `${organizationOrigin()}/sitemap.xml`,
  }
}
