import { z } from 'zod'

const controlCharacters = /[\u0000-\u001f\u007f-\u009f]/
const safeText = z.string().refine(value => !controlCharacters.test(value), 'must not contain control characters').transform(value => value.trim()).pipe(z.string().min(1))
const domainPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const email = safeText.pipe(z.string().email()).transform(value => value.toLowerCase())
const domain = safeText.transform(value => value.toLowerCase()).refine(value => domainPattern.test(value), 'must be a complete ASCII domain')
const localAssetPath = safeText.refine(value => {
  if (!value.startsWith('/') || value.startsWith('//') || /[\\?#%]/.test(value)) return false
  return value.split('/').slice(1).every(segment => segment !== '.' && segment !== '..' && /^[A-Za-z0-9._~-]+$/.test(segment))
}, 'must be a root-relative local asset path')
const httpsUrl = safeText.pipe(z.string().url()).refine(value => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}, 'must be an HTTPS URL without credentials')

export const organizationSchema = z.object({
  name: safeText,
  organizationName: safeText,
  description: safeText,
  logoPath: localAssetPath,
  supportEmail: email,
  memberLabel: safeText,
  location: z.object({
    name: safeText,
    slug: safeText.refine(value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), 'must be a lowercase slug'),
    country: safeText,
    city: safeText,
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    zoom: z.number().int().min(0).max(22)
  }),
  office: z.object({
    name: safeText,
    address: safeText,
    phone: safeText.nullable(),
    email: email.nullable(),
    hours: safeText.nullable(),
    mapsUrl: httpsUrl.nullable()
  }),
  claimantReference: z.object({
    label: safeText,
    required: z.boolean()
  }),
  registration: z.object({
    mode: z.enum(['restricted', 'open']),
    allowedDomains: z.array(domain).transform(values => [...new Set(values)].sort())
  }).refine(value => value.mode === 'open' || value.allowedDomains.length > 0, {
    path: ['allowedDomains'],
    message: 'restricted registration requires at least one domain'
  })
})

export type OrganizationConfig = z.infer<typeof organizationSchema>

export function parseOrganizationConfig(input: unknown): OrganizationConfig {
  const parsed = organizationSchema.safeParse(input)
  if (parsed.success) return parsed.data
  const first = parsed.error.issues[0]
  const path = first.path.join('.') || 'organization'
  throw new Error(`Invalid organization configuration at ${path}: ${first.message}`)
}
