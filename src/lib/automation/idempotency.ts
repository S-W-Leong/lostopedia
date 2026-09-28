import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminOperationId } from '@/lib/contracts/admin/v1/schemas'

export interface IdempotencyReplay {
  replay: boolean
  statusCode?: number
  responsePayload?: unknown
}

export function hashOperationPayload(
  operationId: AdminOperationId,
  payload: unknown
): string {
  return createHash('sha256')
    .update(`${operationId}:${JSON.stringify(payload)}`)
    .digest('hex')
}

export function getIdempotencyKeyFromHeaders(headers: Headers): string | null {
  const key = headers.get('x-idempotency-key')?.trim() || null
  return key && key.length > 0 ? key : null
}

export async function reserveIdempotencyKey(params: {
  actorFingerprint: string
  operationId: AdminOperationId
  idempotencyKey: string
  requestHash: string
}): Promise<IdempotencyReplay> {
  const adminClient = createAdminClient()

  const { data: existing, error: selectError } = await (adminClient as any)
    .from('admin_automation_idempotency')
    .select('*')
    .eq('actor_fingerprint', params.actorFingerprint)
    .eq('operation_id', params.operationId)
    .eq('idempotency_key', params.idempotencyKey)
    .single()

  if (!selectError && existing) {
    if (existing.request_hash !== params.requestHash) {
      throw new Error('Idempotency key reused with a different payload')
    }
    if (existing.response_payload !== null && existing.status_code !== null) {
      return {
        replay: true,
        statusCode: existing.status_code,
        responsePayload: existing.response_payload,
      }
    }
    return { replay: false }
  }

  const { error: insertError } = await (adminClient as any)
    .from('admin_automation_idempotency')
    .insert({
      actor_fingerprint: params.actorFingerprint,
      operation_id: params.operationId,
      idempotency_key: params.idempotencyKey,
      request_hash: params.requestHash,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

  if (insertError) {
    throw new Error('Failed to reserve idempotency key')
  }

  return { replay: false }
}

export async function persistIdempotencyResult(params: {
  actorFingerprint: string
  operationId: AdminOperationId
  idempotencyKey: string
  responsePayload: unknown
  statusCode: number
}) {
  const adminClient = createAdminClient()
  await (adminClient as any)
    .from('admin_automation_idempotency')
    .update({
      response_payload: params.responsePayload,
      status_code: params.statusCode,
      completed_at: new Date().toISOString(),
    })
    .eq('actor_fingerprint', params.actorFingerprint)
    .eq('operation_id', params.operationId)
    .eq('idempotency_key', params.idempotencyKey)
}
