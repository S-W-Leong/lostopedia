'use server'

import { createClient } from './server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { organization } from '@/lib/organization/config'
import { resolveAppUrl } from '@/lib/organization/app-url'
import { isEmailAllowed, normalizeEmail, registrationDescription } from '@/lib/organization/registration'

export type AuthError = {
  message: string
  code?: string
}

export type AuthResult = {
  success: boolean
  error?: AuthError
  redirectTo?: string
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email)

  if (!isEmailAllowed(normalizedEmail, organization.registration)) {
    return {
      success: false,
      error: {
        message: registrationDescription(organization.registration),
      },
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        display_name: displayName,
      },
      emailRedirectTo: `${resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, process.env.NODE_ENV)}/auth/callback`,
    },
  })

  if (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    }
  }

  /**
   * Supabase may return success with a user that has no identities when the email
   * is already registered (anti-enumeration behavior). In that case, we should
   * not proceed to the verification page.
   */
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      success: false,
      error: {
        message: 'This email is already registered. Please sign in instead.',
      },
    }
  }

  if (!data.user) {
    return {
      success: false,
      error: {
        message: 'Failed to create account. Please try again.',
      },
    }
  }

  return {
    success: true,
    redirectTo: '/verify-email',
  }
}

/**
 * Sign in a user with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  })

  if (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    }
  }

  revalidatePath('/', 'layout')

  return {
    success: true,
    redirectTo: '/dashboard',
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

/**
 * Send a password reset email
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, process.env.NODE_ENV)}/auth/callback?next=/update-password`,
  })

  if (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    }
  }

  return {
    success: true,
  }
}

/**
 * Update the user's password
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    }
  }

  return {
    success: true,
    redirectTo: '/dashboard',
  }
}

/**
 * Get the current user
 */
export async function getCurrentUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

/**
 * Get the current user's profile from the users table
 */
export async function getCurrentUserProfile() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
