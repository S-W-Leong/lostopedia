import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminScope } from '@/lib/contracts/admin/v1/schemas'

const AUTH_PREFIX = 'Bearer '

export interface ParsedAutomationToken {
  tokenId: string
  secret: string
}

export interface AdminAutomationTokenRecord {
  id: string
  token_hash: string
  scopes: string[]
  is_active: boolean
  service_account_name: string
  created_by: string | null
  expires_at: string | null
}

export interface AdminAutomationActor {
  tokenId: string
  serviceAccountName: string
  scopes: string[]
  createdBy: string | null
}

export type AdminAutomationTokenAuthResult =
  | { kind: 'missing_or_invalid' }
  | { kind: 'insufficient_scope'; actor: AdminAutomationActor }
  | { kind: 'authorized'; actor: AdminAutomationActor }

export function parseAuthorizationHeader(headerValue: string | null): string | null {
  if (!headerValue || !headerValue.startsWith(AUTH_PREFIX)) {
    return null
  }

  const token = headerValue.slice(AUTH_PREFIX.length).trim()
  return token.length > 0 ? token : null
}

export function parsePresentedToken(token: string): ParsedAutomationToken | null {
  const separatorIndex = token.indexOf('.')
  if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
    return null
  }

  const tokenId = token.slice(0, separatorIndex).trim()
  const secret = token.slice(separatorIndex + 1).trim()
  if (!tokenId || !secret) {
    return null
  }

  return { tokenId, secret }
}

export function hashAutomationTokenSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

export function createAutomationTokenSecret(): string {
  return randomBytes(32).toString('base64url')
}

export function createAutomationTokenPrefix(): string {
  return `lat_${randomBytes(6).toString('hex')}`
}

export function composePresentedAutomationToken(tokenId: string, secret: string): string {
  return `${tokenId}.${secret}`
}

export function hasRequiredScopes(
  tokenScopes: readonly string[],
  requiredScopes: readonly AdminScope[]
): boolean {
  const availableScopes = new Set(tokenScopes)
  return requiredScopes.every((scope) => availableScopes.has(scope))
}

function timingSafeHashCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

export async function authenticateAdminAutomationToken(
  authorizationHeader: string | null,
  requiredScopes: readonly AdminScope[]
): Promise<AdminAutomationActor | null> {
  const result = await authenticateAdminAutomationTokenDetailed(
    authorizationHeader,
    requiredScopes
  )
  return result.kind === 'authorized' ? result.actor : null
}

export async function authenticateAdminAutomationTokenDetailed(
  authorizationHeader: string | null,
  requiredScopes: readonly AdminScope[]
): Promise<AdminAutomationTokenAuthResult> {
  const rawToken = parseAuthorizationHeader(authorizationHeader)
  if (!rawToken) {
    return { kind: 'missing_or_invalid' }
  }

  const parsedToken = parsePresentedToken(rawToken)
  if (!parsedToken) {
    return { kind: 'missing_or_invalid' }
  }

  const secretHash = hashAutomationTokenSecret(parsedToken.secret)
  const adminClient = createAdminClient()

  const { data: tokenRecord, error } = await (adminClient as any)
    .from('admin_automation_tokens')
    .select('id, token_hash, scopes, is_active, service_account_name, created_by, expires_at')
    .eq('id', parsedToken.tokenId)
    .single()

  if (error || !tokenRecord) {
    return { kind: 'missing_or_invalid' }
  }

  const record = tokenRecord as AdminAutomationTokenRecord
  if (!record.is_active) {
    return { kind: 'missing_or_invalid' }
  }

  if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) {
    return { kind: 'missing_or_invalid' }
  }

  if (!timingSafeHashCompare(record.token_hash, secretHash)) {
    return { kind: 'missing_or_invalid' }
  }

  const actor: AdminAutomationActor = {
    tokenId: record.id,
    serviceAccountName: record.service_account_name,
    scopes: record.scopes || [],
    createdBy: record.created_by,
  }

  if (!hasRequiredScopes(record.scopes || [], requiredScopes)) {
    return {
      kind: 'insufficient_scope',
      actor,
    }
  }

  await (adminClient as any)
    .from('admin_automation_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', record.id)

  return {
    kind: 'authorized',
    actor,
  }
}
