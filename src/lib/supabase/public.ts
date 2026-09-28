import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let publicClient: SupabaseClient | null = null

export function getPublicSupabaseClient(): SupabaseClient {
  if (publicClient) {
    return publicClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) {
    throw new Error('Missing public Supabase configuration')
  }

  publicClient = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return publicClient
}
