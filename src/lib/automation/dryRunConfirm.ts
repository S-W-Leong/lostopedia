import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminOperationId } from '@/lib/contracts/admin/v1/schemas'

export interface ConfirmTokenIssueInput {
  operationId: AdminOperationId
  intentHash: string
  actorFingerprint: string
  ttlMinutes?: number
}

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

function parsePresentedConfirmToken(rawToken: string): { tokenId: string; secret: string } | null {
  const separator = rawToken.indexOf('.')
  if (separator <= 0 || separator === rawToken.length - 1) return null

  const tokenId = rawToken.slice(0, separator).trim()
  const secret = rawToken.slice(separator + 1).trim()
  if (!tokenId || !secret) return null
  return { tokenId, secret }
}

export function createIntentHash(operationId: AdminOperationId, payload: unknown): string {
  return createHash('sha256')
    .update(`${operationId}:${JSON.stringify(payload)}`)
    .digest('hex')
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export async function issueConfirmToken(input: ConfirmTokenIssueInput): Promise<string> {
  const tokenSecret = randomBytes(32).toString('base64url')
  const tokenHash = hashSecret(tokenSecret)
  const adminClient = createAdminClient()
  const expiresAt = new Date(Date.now() + (input.ttlMinutes ?? 15) * 60_000).toISOString()

  const { data, error } = await (adminClient as any)
    .from('admin_automation_confirm_tokens')
    .insert({
      operation_id: input.operationId,
      intent_hash: input.intentHash,
      actor_fingerprint: input.actorFingerprint,
      confirm_token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new Error('Failed to issue confirmation token')
  }

  return `${data.id}.${tokenSecret}`
}

export async function validateAndConsumeConfirmToken(params: {
  rawToken: string
  operationId: AdminOperationId
  intentHash: string
  actorFingerprint: string
}): Promise<boolean> {
  const parsed = parsePresentedConfirmToken(params.rawToken)
  if (!parsed) return false

  const adminClient = createAdminClient()
  const { data: tokenRecord, error } = await (adminClient as any)
    .from('admin_automation_confirm_tokens')
    .select('*')
    .eq('id', parsed.tokenId)
    .single()

  if (error || !tokenRecord) return false
  if (tokenRecord.consumed_at) return false
  if (new Date(tokenRecord.expires_at).getTime() <= Date.now()) return false
  if (tokenRecord.operation_id !== params.operationId) return false
  if (tokenRecord.intent_hash !== params.intentHash) return false
  if (tokenRecord.actor_fingerprint !== params.actorFingerprint) return false

  const expectedHash = hashSecret(parsed.secret)
  if (!secureEqual(tokenRecord.confirm_token_hash, expectedHash)) return false

  const { error: consumeError } = await (adminClient as any)
    .from('admin_automation_confirm_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', parsed.tokenId)
    .is('consumed_at', null)

  return !consumeError
}
