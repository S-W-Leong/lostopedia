import type { Metadata, Viewport } from 'next'
import { DM_Sans, Plus_Jakarta_Sans, IBM_Plex_Mono, Syne } from 'next/font/google'
import './globals.css'
import { organization } from '@/lib/organization/config'
import { organizationOrigin } from '@/lib/organization/metadata'

// Plus Jakarta Sans for body text (modern, clean)
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

// DM Sans for headings (slightly bolder, geometric)
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

// Syne for hero and major marketing headlines (distinctive display)
const syne = Syne({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-syne',
  display: 'swap',
})

// IBM Plex Mono for code/IDs
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(organizationOrigin()),
  title: {
    default: `${organization.name} - Lost & Found`,
    template: `%s | ${organization.name}`,
  },
  description: organization.description,
  keywords: [
    'lost and found',
    organization.organizationName,
    'lost items',
    'found items',
    'community lost and found',
    'find lost items',
    'report found items',
    'AI matching',
  ],
  authors: [{ name: `${organization.organizationName} team` }],
  creator: organization.organizationName,
  publisher: organization.organizationName,
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [{ url: organization.logoPath, type: 'image/svg+xml' }],
    shortcut: [{ url: organization.logoPath, type: 'image/svg+xml' }],
    apple: [{ url: organization.logoPath, type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: organizationOrigin(),
    title: `${organization.name} - Lost & Found`,
    description: organization.description,
    siteName: organization.name,
    images: [
      {
        url: organization.logoPath,
        width: 64,
        height: 64,
        alt: `${organization.name} logo`,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: `${organization.name} - Lost & Found`,
    description: organization.description,
    images: [organization.logoPath],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
    { media: '(prefers-color-scheme: dark)', color: '#0D0F12' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${dmSans.variable} ${syne.variable} ${ibmPlexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
