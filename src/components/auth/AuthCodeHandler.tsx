'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Client component that handles auth code redirects
 * When Supabase redirects to root with a code parameter (e.g., password reset),
 * this component redirects to the proper auth callback handler
 * 
 * Supabase password reset links may redirect to root URL instead of the configured
 * redirectTo URL if the URL isn't whitelisted in Supabase dashboard settings.
 */
export function AuthCodeHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  useEffect(() => {
    if (code) {
      // Check if this is a password reset flow
      // Supabase may include type=recovery for password reset links
      const type = searchParams.get('type')
      
      // Default to update-password for password reset flows
      // If type is recovery, it's definitely a password reset
      // Otherwise, we'll default to update-password since the user is experiencing
      // a password reset issue. Email verification links should go to /auth/callback
      // directly, but if they end up here, they'll be authenticated and can navigate.
      const next = type === 'recovery' ? '/update-password' : '/update-password'
      
      // Redirect to auth callback which will handle the code exchange
      // The callback will exchange the code for a session and redirect to 'next'
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=${next}`)
    }
  }, [code, router, searchParams])

  // If there's a code, don't render children (redirecting)
  if (code) {
    return null
  }

  return <>{children}</>
}
