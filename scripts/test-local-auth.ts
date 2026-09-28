import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { parse } from 'dotenv'
import { assertLocalAuthUrl } from './lib/local-auth'

async function main() {
  const envPath = resolve(process.cwd(), process.argv[2] || '.env.local-auth')
  const local = parse(readFileSync(envPath))
  const url = local.SUPABASE_LOCAL_URL
  const anonKey = local.SUPABASE_LOCAL_ANON_KEY
  const serviceKey = local.SUPABASE_LOCAL_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) throw new Error('Local Auth file must define URL, anon key, and service role key')
  assertLocalAuthUrl(url)

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const publicClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const suffix = randomUUID().slice(0, 8)
  const allowed = `member+${suffix}@example.org`
  const invited = `invite+${suffix}@example.org`
  const disallowed = `member+${suffix}@evil.test`
  const createdIds: string[] = []
  const password = randomBytes(24).toString('base64url')

  try {
    const signup = await publicClient.auth.signUp({ email: allowed, password })
    if (signup.error || !signup.data.user) throw new Error(`Allowed signup failed: ${signup.error?.message || 'no user'}`)
    createdIds.push(signup.data.user.id)

    const blockedSignup = await publicClient.auth.signUp({ email: disallowed, password })
    if (!blockedSignup.error) throw new Error('Disallowed signup unexpectedly succeeded')

    const invitation = await admin.auth.admin.inviteUserByEmail(invited)
    if (invitation.error || !invitation.data.user) throw new Error(`Allowed invitation failed: ${invitation.error?.message || 'no user'}`)
    createdIds.push(invitation.data.user.id)

    const blockedInvitation = await admin.auth.admin.inviteUserByEmail(disallowed)
    if (!blockedInvitation.error) throw new Error('Disallowed invitation unexpectedly succeeded')

    const login = await publicClient.auth.signInWithPassword({ email: allowed, password })
    if (login.error || !login.data.user) throw new Error(`Allowed login failed: ${login.error?.message || 'no user'}`)
    const changed = await publicClient.auth.updateUser({ email: disallowed })
    if (!changed.error) throw new Error('Disallowed email change unexpectedly succeeded')

    const { data: forbiddenProfile } = await admin.from('users').select('id').eq('email', disallowed).maybeSingle()
    if (forbiddenProfile) throw new Error('Disallowed profile remained after rejection')
    const { data: users, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (listError || users.users.some(user => user.email === disallowed)) throw new Error('Disallowed Auth user remained after rejection')

    console.log('Local Auth signup, invitation, and email-change policy checks passed.')
  } finally {
    for (const id of createdIds) {
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) console.error('Could not remove a synthetic Auth user')
    }
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Local Auth test failed')
  process.exitCode = 1
})
