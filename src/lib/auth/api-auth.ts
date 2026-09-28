import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

type RequireApiUserSuccess = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: User
  response: null
}

type RequireApiUserFailure = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: null
  response: NextResponse
}

type RequireApiUserResult = RequireApiUserSuccess | RequireApiUserFailure

export async function requireApiUser(
  errorMessage = 'Authentication required'
): Promise<RequireApiUserResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      supabase,
      user: null,
      response: NextResponse.json(
        { success: false, error: errorMessage },
        { status: 401 }
      ),
    }
  }

  return {
    supabase,
    user,
    response: null,
  }
}
