'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { DbUser } from '@/types/database'

interface AuthState {
  user: User | null
  profile: DbUser | null
  isLoading: boolean
  error: Error | null
}

// Simple version that just checks session directly
export function useAuthSimple() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    console.log('[useAuthSimple] Starting')
    let mounted = true
    const supabase = createClient()

    async function loadSession() {
      try {
        console.log('[useAuthSimple] Getting session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('[useAuthSimple] Session result:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          error 
        })

        if (!mounted) return

        if (error) {
          console.error('[useAuthSimple] Session error:', error)
          setState({ user: null, profile: null, isLoading: false, error })
          return
        }

        if (!session || !session.user) {
          console.log('[useAuthSimple] No session, logged out')
          setState({ user: null, profile: null, isLoading: false, error: null })
          return
        }

        // Have session, fetch profile
        console.log('[useAuthSimple] Fetching profile for:', session.user.id)
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        console.log('[useAuthSimple] Profile result:', { hasProfile: !!profile, error: profileError })

        if (!mounted) return

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('[useAuthSimple] Profile error:', profileError)
        }

        setState({
          user: session.user,
          profile: profile as DbUser | null,
          isLoading: false,
          error: null,
        })

        console.log('[useAuthSimple] State set successfully')
      } catch (err) {
        console.error('[useAuthSimple] Unexpected error:', err)
        if (mounted) {
          setState({ user: null, profile: null, isLoading: false, error: err as Error })
        }
      }
    }

    loadSession()

    return () => {
      console.log('[useAuthSimple] Cleanup')
      mounted = false
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!state.user) return

    const supabase = createClient()
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', state.user.id)
      .single()

    setState((prev) => ({
      ...prev,
      profile: profile as DbUser | null,
    }))
  }, [state.user])

  return {
    ...state,
    isAuthenticated: !!state.user,
    refreshProfile,
  }
}




