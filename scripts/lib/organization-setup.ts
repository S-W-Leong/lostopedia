import { createHash } from 'node:crypto'
import { parseOrganizationConfig, type OrganizationConfig } from '../../src/lib/organization/schema'

export interface InstalledOrganizationSetup {
  configHash: string
  registration: OrganizationConfig['registration']
  location: OrganizationConfig['location'] & { id: string; isActive: boolean }
}

export function sqlLiteral(value: string): string {
  if (/[\u0000-\u001f\u007f-\u009f]/.test(value)) {
    throw new Error('SQL literal contains a control character')
  }
  return `'${value.replaceAll("'", "''")}'`
}

export function configurationHash(config: OrganizationConfig): string {
  return createHash('sha256').update(JSON.stringify(parseOrganizationConfig(config))).digest('hex')
}

export function renderOrganizationSql(config: OrganizationConfig): string {
  const normalized = parseOrganizationConfig(config)
  const location = normalized.location
  const registration = normalized.registration
  const domains = registration.allowedDomains.length
    ? `ARRAY[${registration.allowedDomains.map(sqlLiteral).join(', ')}]::text[]`
    : 'ARRAY[]::text[]'
  const locationValues = [
    sqlLiteral(location.name), sqlLiteral(location.slug), sqlLiteral(location.country), sqlLiteral(location.city),
    String(location.latitude), String(location.longitude), String(location.zoom)
  ]
  const hash = sqlLiteral(configurationHash(normalized))
  const sourceText = JSON.stringify(normalized)
  let delimiter = '$organization_setup$'
  while (sourceText.includes(delimiter)) {
    delimiter = `${delimiter.slice(0, -1)}_$`
  }

  return `BEGIN;
SET LOCAL standard_conforming_strings = on;
DO ${delimiter}
DECLARE
  existing_location_id uuid;
BEGIN
  SELECT default_campus_id INTO existing_location_id
  FROM public.deployment_settings WHERE id = true FOR UPDATE;

  IF existing_location_id IS NULL THEN
    INSERT INTO public.campuses
      (name, slug, country, city, default_latitude, default_longitude, default_zoom)
    VALUES (${locationValues.join(', ')})
    RETURNING id INTO existing_location_id;

    INSERT INTO public.deployment_settings
      (id, default_campus_id, registration_mode, allowed_email_domains, config_hash)
    VALUES (true, existing_location_id, ${sqlLiteral(registration.mode)}, ${domains}, ${hash});
  ELSE
    UPDATE public.campuses SET
      name = ${locationValues[0]},
      slug = ${locationValues[1]},
      country = ${locationValues[2]},
      city = ${locationValues[3]},
      default_latitude = ${locationValues[4]},
      default_longitude = ${locationValues[5]},
      default_zoom = ${locationValues[6]},
      is_active = true
    WHERE id = existing_location_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Configured default location is missing';
    END IF;

    UPDATE public.deployment_settings SET
      registration_mode = ${sqlLiteral(registration.mode)},
      allowed_email_domains = ${domains},
      config_hash = ${hash}
    WHERE id = true;
  END IF;
END;
${delimiter};
COMMIT;
`
}

export function compareOrganizationSetup(config: OrganizationConfig, installed: InstalledOrganizationSetup): string[] {
  const normalized = parseOrganizationConfig(config)
  const mismatches: string[] = []
  if (installed.configHash !== configurationHash(normalized)) mismatches.push('configHash')
  if (installed.registration.mode !== normalized.registration.mode) mismatches.push('registration.mode')
  if (JSON.stringify(installed.registration.allowedDomains) !== JSON.stringify(normalized.registration.allowedDomains)) {
    mismatches.push('registration.allowedDomains')
  }
  if (!installed.location.id) mismatches.push('location.id')
  if (!installed.location.isActive) mismatches.push('location.isActive')
  for (const key of ['name', 'slug', 'country', 'city', 'latitude', 'longitude', 'zoom'] as const) {
    if (installed.location[key] !== normalized.location[key]) mismatches.push(`location.${key}`)
  }
  return mismatches
}
