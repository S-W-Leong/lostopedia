import { randomUUID } from 'node:crypto'
import { buildAdminToolsCatalog } from './tools'
import { adminOperationsV1 } from '@/lib/contracts/admin/v1/operations'
import type { AdminOperationId } from '@/lib/contracts/admin/v1/schemas'

export interface InvokeOptions {
  baseUrl: string
  bearerToken: string
  idempotencyKey?: string
  confirmToken?: string
  dryRun?: boolean
}

export interface ContractInvocationResult {
  ok: boolean
  status: number
  payload: unknown
}

function withDefinedQuery(
  query: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined
) {
  if (value === undefined) return
  query.set(key, String(value))
}

function buildQueryForGet(
  operationId: AdminOperationId,
  input: Record<string, unknown>,
  query: URLSearchParams
) {
  switch (operationId) {
    case 'admin.items.list':
      withDefinedQuery(query, 'type', input.type as string | undefined)
      withDefinedQuery(query, 'status', input.status as string | undefined)
      withDefinedQuery(query, 'flagged', input.flagged as boolean | undefined)
      withDefinedQuery(query, 'category', input.category as string | undefined)
      withDefinedQuery(query, 'limit', input.limit as number | undefined)
      withDefinedQuery(query, 'offset', input.offset as number | undefined)
      return
    case 'admin.users.list':
      withDefinedQuery(query, 'search', input.search as string | undefined)
      withDefinedQuery(query, 'banned', input.banned as boolean | undefined)
      withDefinedQuery(query, 'admins', input.admins as boolean | undefined)
      withDefinedQuery(query, 'limit', input.limit as number | undefined)
      withDefinedQuery(query, 'offset', input.offset as number | undefined)
      return
    case 'admin.reputation.list':
      withDefinedQuery(query, 'userId', input.userId as string | undefined)
      withDefinedQuery(query, 'limit', input.limit as number | undefined)
      withDefinedQuery(query, 'offset', input.offset as number | undefined)
      return
    default:
      return
  }
}

async function parseInvocationPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  const rawText = await response.text()
  if (!rawText) {
    return null
  }

  const likelyJson =
    contentType.includes('application/json') ||
    contentType.includes('application/problem+json') ||
    rawText.startsWith('{') ||
    rawText.startsWith('[')

  if (!likelyJson) {
    return {
      success: false,
      error: {
        code: 'non_json_response',
        detail: 'Upstream endpoint returned non-JSON payload.',
      },
      rawBody: rawText,
    }
  }

  try {
    return JSON.parse(rawText)
  } catch {
    return {
      success: false,
      error: {
        code: 'invalid_json_response',
        detail: 'Upstream endpoint returned malformed JSON.',
      },
      rawBody: rawText,
    }
  }
}

export async function invokeContractedOperation(
  operationId: AdminOperationId,
  input: Record<string, unknown>,
  options: InvokeOptions
): Promise<ContractInvocationResult> {
  const operation = adminOperationsV1[operationId]
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.bearerToken}`,
  }

  if (operation.method !== 'GET') {
    headers['Content-Type'] = 'application/json'
    headers['x-idempotency-key'] = options.idempotencyKey || randomUUID()
  }
  if (options.confirmToken) {
    headers['x-confirm-token'] = options.confirmToken
  }

  const query = new URLSearchParams()
  if (options.dryRun) query.set('dryRun', 'true')
  if (operation.method === 'GET') {
    buildQueryForGet(operationId, input, query)
  }
  const endpoint = `${options.baseUrl}/api/v1/admin-automation/${operationId}${query.toString() ? `?${query.toString()}` : ''}`

  const response = await fetch(endpoint, {
    method: operation.method,
    headers,
    body: operation.method === 'GET' ? undefined : JSON.stringify(input),
  })

  return {
    ok: response.ok,
    status: response.status,
    payload: await parseInvocationPayload(response),
  }
}

export function listMcpTools() {
  return buildAdminToolsCatalog()
}
