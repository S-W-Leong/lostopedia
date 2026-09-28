'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { DbUser } from '@/types/database'

interface AuthState {
  user: User | null
  profile: DbUser | null
  isLoading: boolean
  error: Error | null
}

// Singleton supabase client for the browser
let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (typeof window === 'undefined') return null
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

// Global auth state to share across components
let globalAuthState: AuthState = {
  user: null,
  profile: null,
  isLoading: true,
  error: null,
}

const listeners: Set<() => void> = new Set()
let isInitialized = false

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

function setGlobalAuthState(newState: Partial<AuthState>) {
  globalAuthState = { ...globalAuthState, ...newState }
  notifyListeners()
}

async function fetchProfile(supabase: ReturnType<typeof createClient>, userId: string): Promise<DbUser | null> {
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('[useAuth] Profile fetch error:', profileError)
  }

  return profile ? (profile as DbUser) : null
}

async function initializeAuth() {
  if (isInitialized) return
  isInitialized = true

  const supabase = getSupabase()
  if (!supabase) return

  // Set up auth state change listener
  supabase.auth.onAuthStateChange(
    async (_event, session) => {
      if (session?.user) {
        // Set user immediately, fetch profile in background
        setGlobalAuthState({
          user: session.user,
          profile: null,
          isLoading: false,
          error: null,
        })
        
        // Fetch profile in background (don't block rendering)
        fetchProfile(supabase, session.user.id)
          .then(profile => {
            setGlobalAuthState({ profile })
          })
          .catch(err => {
            console.error('[useAuth] Error fetching profile:', err)
          })
      } else {
        setGlobalAuthState({
          user: null,
          profile: null,
          isLoading: false,
          error: null,
        })
      }
    }
  )

  // Also fetch initial session as a fallback (in case onAuthStateChange doesn't fire)
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      setGlobalAuthState({
        user: null,
        profile: null,
        isLoading: false,
        error: error,
      })
      return
    }

    if (session?.user) {
      const profile = await fetchProfile(supabase, session.user.id)
      setGlobalAuthState({
        user: session.user,
        profile,
        isLoading: false,
        error: null,
      })
    } else {
      setGlobalAuthState({
        user: null,
        profile: null,
        isLoading: false,
        error: null,
      })
    }
  } catch (error) {
    setGlobalAuthState({
      user: null,
      profile: null,
      isLoading: false,
      error: error as Error,
    })
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  
  // Initialize auth on first subscription
  if (!isInitialized) {
    initializeAuth()
  }
  
  return () => {
    listeners.delete(callback)
  }
}

function getSnapshot() {
  return globalAuthState
}

// Server snapshot must be a stable reference
const serverSnapshot: AuthState = {
  user: null,
  profile: null,
  isLoading: true,
  error: null,
}

function getServerSnapshot() {
  return serverSnapshot
}

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const refreshProfile = useCallback(async () => {
    if (!state.user) return

    const supabase = getSupabase()
    if (!supabase) return

    const profile = await fetchProfile(supabase, state.user.id)
    setGlobalAuthState({ profile })
  }, [state.user])

  return {
    ...state,
    isAuthenticated: !!state.user,
    refreshProfile,
  }
}
