import type { SupabaseClient } from '@supabase/supabase-js'
import { organization } from './config'

export class DefaultLocationError extends Error {
  constructor(message: string, readonly code: 'setup' | 'validation') {
    super(message)
    this.name = 'DefaultLocationError'
  }
}

export async function resolveDefaultLocationId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client
    .from('campuses')
    .select('id')
    .eq('slug', organization.location.slug)
    .eq('is_active', true)
    .single()

  if (error || !data?.id) {
    throw new DefaultLocationError('Default location is unavailable. Ask an operator to apply the organization setup.', 'setup')
  }
  return data.id
}

export async function assertDefaultLocation(client: SupabaseClient, requestedId: unknown): Promise<string> {
  if (typeof requestedId !== 'string' || !requestedId) {
    throw new DefaultLocationError('Choose the configured default location.', 'validation')
  }
  const canonicalId = await resolveDefaultLocationId(client)
  if (requestedId !== canonicalId) {
    throw new DefaultLocationError('The selected location does not match this deployment.', 'validation')
  }
  return canonicalId
}
