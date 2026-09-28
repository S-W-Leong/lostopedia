import type { NextConfig } from 'next'

function configuredSupabaseUrl(): URL | null {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
      : null
  } catch {
    return null
  }
}

const supabaseUrl = configuredSupabaseUrl()
const supabaseOrigin = supabaseUrl?.origin || ''
const supabaseSocketOrigin = supabaseUrl
  ? `${supabaseUrl.protocol === 'https:' ? 'wss:' : 'ws:'}//${supabaseUrl.host}`
  : ''

const nextConfig: NextConfig = {
  // TypeScript errors will now be caught at build time

  // Post page uploads images directly from client to Supabase; this limit only affects API route /api/items.
  experimental: {
    serverActions: {
      bodySizeLimit: '35mb',
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
      },
      ...(supabaseUrl ? [{
        protocol: supabaseUrl.protocol.slice(0, -1) as 'http' | 'https',
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
      }] : []),
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              `img-src 'self' data: blob: ${supabaseOrigin} https://maps.googleapis.com https://maps.gstatic.com https://picsum.photos https://*.picsum.photos`,
              "font-src 'self' https://fonts.gstatic.com",
              `connect-src 'self' ${supabaseOrigin} ${supabaseSocketOrigin} https://api-inference.huggingface.co https://maps.googleapis.com`,
              "frame-src 'self' https://www.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)'
          }
        ]
      }
    ]
  }
};

export default nextConfig
