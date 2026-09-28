import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from './server'
import type { DbUser } from '@/types/database'
import type { Database } from '@/types/database'

/**
 * Create an admin client with service role key (bypasses RLS)
 * Use with caution - only for system operations
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables for admin client'
    )
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Check if a user is an admin
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false

  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single<{ is_admin: boolean }>()

  return data?.is_admin ?? false
}

/**
 * Get current user profile and require admin role
 * Throws error if user is not admin
 */
export async function requireAdmin(): Promise<DbUser> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get user profile
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single<DbUser>()

  if (error || !profile) {
    throw new Error('User profile not found')
  }

  if (!profile.is_admin) {
    throw new Error('Unauthorized: Admin access required')
  }

  return profile
}

/**
 * Get current user profile with admin check (non-throwing)
 * Returns null if user is not admin
 */
export async function getCurrentAdmin(): Promise<DbUser | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single<DbUser>()

    if (!profile?.is_admin) return null

    return profile
  } catch (error) {
    console.error('Error checking admin status:', error)
    return null
  }
}
