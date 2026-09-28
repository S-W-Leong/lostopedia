import { organization } from '@/lib/organization/config'
import { organizationOrigin, serializeJsonLd } from '@/lib/organization/metadata'

interface StructuredDataProps {
  type: 'website' | 'organization' | 'article'
  data?: Record<string, unknown>
}

export function WebsiteStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: organization.name,
    url: organizationOrigin(),
    description: organization.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${organizationOrigin()}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
    />
  )
}

export function OrganizationStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: organization.organizationName,
    url: organizationOrigin(),
    logo: `${organizationOrigin()}${organization.logoPath}`,
    description: organization.description,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
    />
  )
}

export default function StructuredData({ type, data }: StructuredDataProps) {
  if (type === 'website') return <WebsiteStructuredData />
  if (type === 'organization') return <OrganizationStructuredData />

  if (data) {
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
      />
    )
  }

  return null
}
