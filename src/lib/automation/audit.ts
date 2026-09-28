import { createAdminClient } from '@/lib/supabase/admin'

export interface AuditEventInput {
  requestId: string
  actorFingerprint: string
  operationId: string
  outcomeStatus: 'success' | 'failed' | 'dry_run'
  idempotencyKey?: string | null
  errorCode?: string | null
  targetRefs?: Record<string, unknown> | null
}

export async function writeAutomationAuditEvent(input: AuditEventInput) {
  const adminClient = createAdminClient()
  await (adminClient as any).from('admin_automation_audit_events').insert({
    request_id: input.requestId,
    actor_fingerprint: input.actorFingerprint,
    operation_id: input.operationId,
    outcome_status: input.outcomeStatus,
    idempotency_key: input.idempotencyKey ?? null,
    error_code: input.errorCode ?? null,
    target_refs: input.targetRefs ?? null,
  })
}
