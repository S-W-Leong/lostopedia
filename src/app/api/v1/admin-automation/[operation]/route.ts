import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { operationIdSchema, type AdminOperationId } from '@/lib/contracts/admin/v1/schemas'
import { getOperationDefinition, getOperationInputSchema } from '@/lib/contracts/admin/v1/operations'
import { authenticateAdminAutomationTokenDetailed } from '@/lib/auth/adminAutomation'
import { requireAdmin } from '@/lib/supabase/admin'
import { contractError, contractSuccess } from '@/lib/api/contractResponse'
import { runAdminAutomationOperation } from '@/lib/adminAutomation/operations'
import {
  getIdempotencyKeyFromHeaders,
  hashOperationPayload,
  persistIdempotencyResult,
  reserveIdempotencyKey,
} from '@/lib/automation/idempotency'
import {
  createIntentHash,
  issueConfirmToken,
  validateAndConsumeConfirmToken,
} from '@/lib/automation/dryRunConfirm'
import { writeAutomationAuditEvent } from '@/lib/automation/audit'
import { rateLimiters } from '@/lib/ratelimit'
import {
  getAdminAutomationPausedMessage,
  isAdminAutomationEnabled,
} from '@/lib/adminAutomation/availability'

function parseInputFromRequest(
  request: NextRequest,
  operationId: AdminOperationId
): Record<string, unknown> {
  const params = request.nextUrl.searchParams

  switch (operationId) {
    case 'admin.items.list':
      return {
        type: params.get('type') ?? undefined,
        status: params.get('status') ?? undefined,
        flagged: params.get('flagged') ? params.get('flagged') === 'true' : undefined,
        category: params.get('category') ?? undefined,
        limit: params.get('limit') ? Number(params.get('limit')) : undefined,
        offset: params.get('offset') ? Number(params.get('offset')) : undefined,
      }
    case 'admin.users.list':
      return {
        search: params.get('search') ?? undefined,
        banned: params.get('banned') ? params.get('banned') === 'true' : undefined,
        admins: params.get('admins') ? params.get('admins') === 'true' : undefined,
        limit: params.get('limit') ? Number(params.get('limit')) : undefined,
        offset: params.get('offset') ? Number(params.get('offset')) : undefined,
      }
    case 'admin.reputation.list':
      return {
        userId: params.get('userId') ?? undefined,
        limit: params.get('limit') ? Number(params.get('limit')) : undefined,
        offset: params.get('offset') ? Number(params.get('offset')) : undefined,
      }
    default:
      return {}
  }
}

function buildSuccessTargetRefs(
  operationId: AdminOperationId,
  data: unknown
): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  if (operationId === 'admin.items.post-confirm') {
    const payload = data as {
      created?: Array<{ itemId?: string }>
      failed?: Array<unknown>
      createdCount?: number
      failedCount?: number
      totalRequested?: number
    }
    return {
      totalRequested: payload.totalRequested ?? null,
      createdCount: payload.createdCount ?? (payload.created?.length ?? 0),
      failedCount: payload.failedCount ?? (payload.failed?.length ?? 0),
      itemIds: (payload.created ?? [])
        .map((entry) => entry.itemId)
        .filter((itemId): itemId is string => Boolean(itemId)),
    }
  }

  if (operationId === 'admin.items.post-draft') {
    const payload = data as { total?: number; ready?: number }
    return {
      total: payload.total ?? null,
      ready: payload.ready ?? null,
    }
  }

  return null
}

async function authenticateRequest(
  request: NextRequest,
  operationId: AdminOperationId,
  requestId: string
) {
  const operation = getOperationDefinition(operationId)
  const machineAuth = await authenticateAdminAutomationTokenDetailed(
    request.headers.get('authorization'),
    operation.requiredScopes
  )

  if (machineAuth.kind === 'authorized') {
    const machineActor = machineAuth.actor
    return {
      actorType: 'machine' as const,
      tokenId: machineActor.tokenId,
      actorId: machineActor.createdBy,
      displayName: machineActor.serviceAccountName,
      actorFingerprint: `token:${machineActor.tokenId}`,
    }
  }

  if (machineAuth.kind === 'insufficient_scope') {
    return contractError(
      'insufficient_scope',
      'Automation token lacks required scope for this operation.',
      403,
      requestId,
      operationId
    )
  }

  try {
    const admin = await requireAdmin()
    return {
      actorType: 'session' as const,
      actorId: admin.id,
      displayName: admin.display_name || admin.email,
      actorFingerprint: `session:${admin.id}`,
    }
  } catch {
    return contractError(
      'unauthorized',
      'Valid admin session or automation token required.',
      401,
      requestId,
      operationId
    )
  }
}

async function handleOperation(
  request: NextRequest,
  params: Promise<{ operation: string }>
) {
  const requestId = randomUUID()
  if (!isAdminAutomationEnabled()) {
    return contractError(
      'feature_unavailable',
      getAdminAutomationPausedMessage(),
      503,
      requestId
    )
  }

  const rawOperation = (await params).operation
  const operationParse = operationIdSchema.safeParse(rawOperation)
  if (!operationParse.success) {
    return contractError(
      'unsupported_operation',
      'Operation is not part of admin automation contract v1.',
      404,
      requestId
    )
  }

  const operationId = operationParse.data
  const operation = getOperationDefinition(operationId)
  const inputSchema = getOperationInputSchema(operationId)

  const authResult = await authenticateRequest(request, operationId, requestId)
  if (authResult instanceof Response) {
    return authResult
  }

  const parsedInput =
    operation.method === 'GET'
      ? parseInputFromRequest(request, operationId)
      : await request.json().catch(() => ({}))

  const validation = inputSchema.safeParse(parsedInput)
  if (!validation.success) {
    return contractError(
      'invalid_input',
      'Input payload does not match operation schema.',
      400,
      requestId,
      operationId
    )
  }

  const isMutating = operation.method !== 'GET'
  let idempotencyKey: string | null = null
  if (isMutating) {
    idempotencyKey = getIdempotencyKeyFromHeaders(request.headers)
    if (!idempotencyKey) {
      return contractError(
        'invalid_input',
        'x-idempotency-key header is required for mutating operations.',
        400,
        requestId,
        operationId
      )
    }

    const requestHash = hashOperationPayload(operationId, validation.data)
    try {
      const reservation = await reserveIdempotencyKey({
        actorFingerprint: authResult.actorFingerprint,
        operationId,
        idempotencyKey,
        requestHash,
      })
      if (reservation.replay) {
        await writeAutomationAuditEvent({
          requestId,
          actorFingerprint: authResult.actorFingerprint,
          operationId,
          outcomeStatus: 'success',
          idempotencyKey,
          targetRefs: { replay: true },
        })
        return contractSuccess(
          operationId,
          requestId,
          reservation.responsePayload ?? { replay: true },
          reservation.statusCode ?? 200
        )
      }
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : 'Idempotency reservation failed.'
      const code = detail.includes('different payload')
        ? 'idempotency_conflict'
        : 'internal_error'
      const status = code === 'idempotency_conflict' ? 409 : 500
      return contractError(code, detail, status, requestId, operationId)
    }
  }

  if (operation.destructive) {
    const intentHash = createIntentHash(operationId, validation.data)
    const dryRunRequested =
      request.nextUrl.searchParams.get('dryRun') === 'true' ||
      (validation.data as Record<string, unknown>).dryRun === true

    if (dryRunRequested) {
      try {
        const confirmToken = await issueConfirmToken({
          operationId,
          intentHash,
          actorFingerprint: authResult.actorFingerprint,
        })
        await writeAutomationAuditEvent({
          requestId,
          actorFingerprint: authResult.actorFingerprint,
          operationId,
          outcomeStatus: 'dry_run',
          idempotencyKey,
          targetRefs: { intentHash },
        })
        return contractSuccess(operationId, requestId, {
          dryRun: true,
          preview: {
            operationId,
            destructive: true,
            message: 'Dry-run accepted. Execute again with x-confirm-token header.',
          },
          confirmToken,
        })
      } catch {
        return contractError(
          'internal_error',
          'Failed to create confirmation token.',
          500,
          requestId,
          operationId
        )
      }
    }

    const confirmToken = request.headers.get('x-confirm-token')
    if (!confirmToken) {
      return contractError(
        'dry_run_required',
        'Destructive operations require dry-run and x-confirm-token.',
        400,
        requestId,
        operationId
      )
    }

    const confirmValid = await validateAndConsumeConfirmToken({
      rawToken: confirmToken,
      operationId,
      intentHash,
      actorFingerprint: authResult.actorFingerprint,
    })
    if (!confirmValid) {
      return contractError(
        'confirm_token_invalid',
        'Confirmation token is invalid, expired, or already consumed.',
        409,
        requestId,
        operationId
      )
    }
  }

  try {
    if (isMutating) {
      const rateLimit = await rateLimiters.adminAutomationMutation(
        authResult.actorFingerprint,
        operationId
      )
      if (!rateLimit.success) {
        return contractError(
          'rate_limited',
          'Rate limit exceeded for this operation. Retry after reset window.',
          429,
          requestId,
          operationId
        )
      }
    }

    const data = await runAdminAutomationOperation(operationId, validation.data, authResult)
    if (isMutating && idempotencyKey) {
      await persistIdempotencyResult({
        actorFingerprint: authResult.actorFingerprint,
        operationId,
        idempotencyKey,
        responsePayload: data,
        statusCode: 200,
      })
      await writeAutomationAuditEvent({
        requestId,
        actorFingerprint: authResult.actorFingerprint,
        operationId,
        outcomeStatus: 'success',
        idempotencyKey,
        targetRefs: buildSuccessTargetRefs(operationId, data),
      })
    }
    return contractSuccess(operationId, requestId, data)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Operation failed unexpectedly.'
    if (isMutating) {
      await writeAutomationAuditEvent({
        requestId,
        actorFingerprint: authResult.actorFingerprint,
        operationId,
        outcomeStatus: 'failed',
        idempotencyKey,
        errorCode: 'internal_error',
      })
    }
    return contractError('internal_error', message, 500, requestId, operationId)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operation: string }> }
) {
  return handleOperation(request, params)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ operation: string }> }
) {
  return handleOperation(request, params)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ operation: string }> }
) {
  return handleOperation(request, params)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ operation: string }> }
) {
  return handleOperation(request, params)
}
