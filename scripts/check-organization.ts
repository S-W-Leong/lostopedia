import { createClient } from '@supabase/supabase-js'
import { organization } from '../src/lib/organization/config'
import { compareOrganizationSetup, type InstalledOrganizationSetup } from './lib/organization-setup'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY for the target deployment')

  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: settings, error: settingsError } = await client
    .from('deployment_settings')
    .select('default_campus_id, registration_mode, allowed_email_domains, config_hash')
    .eq('id', true)
    .single()
  if (settingsError || !settings) throw new Error('Deployment settings are missing. Apply generated supabase/seed.sql.')

  const { data: location, error: locationError } = await client
    .from('campuses')
    .select('id, name, slug, country, city, default_latitude, default_longitude, default_zoom, is_active')
    .eq('id', settings.default_campus_id)
    .single()
  if (locationError || !location) throw new Error('Configured default location is missing. Apply generated supabase/seed.sql.')

  const installed: InstalledOrganizationSetup = {
    configHash: settings.config_hash,
    registration: {
      mode: settings.registration_mode,
      allowedDomains: settings.allowed_email_domains
    },
    location: {
      id: location.id,
      isActive: location.is_active,
      name: location.name,
      slug: location.slug,
      country: location.country,
      city: location.city,
      latitude: Number(location.default_latitude),
      longitude: Number(location.default_longitude),
      zoom: location.default_zoom
    }
  }
  const mismatches = compareOrganizationSetup(organization, installed)
  if (mismatches.length) throw new Error(`Deployment configuration mismatch: ${mismatches.join(', ')}`)
  console.log('Installed organization configuration matches config/organization.json.')
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Organization check failed')
  process.exitCode = 1
})
