import type { AdminOperationId } from './schemas'

export type ContractErrorCode =
  | 'unauthorized'
  | 'insufficient_scope'
  | 'invalid_input'
  | 'not_found'
  | 'rate_limited'
  | 'dry_run_required'
  | 'confirm_token_invalid'
  | 'idempotency_conflict'
  | 'unsupported_operation'
  | 'feature_unavailable'
  | 'internal_error'

export interface ContractProblemDetails {
  type: string
  title: string
  status: number
  detail: string
  code: ContractErrorCode
  operationId?: AdminOperationId
}

const BASE_TYPE = 'https://lostopedia.app/problems/admin-automation'

export function createProblemDetails(
  code: ContractErrorCode,
  detail: string,
  status: number,
  operationId?: AdminOperationId
): ContractProblemDetails {
  return {
    type: `${BASE_TYPE}/${code}`,
    title: getTitleForCode(code),
    status,
    detail,
    code,
    operationId,
  }
}

function getTitleForCode(code: ContractErrorCode): string {
  switch (code) {
    case 'unauthorized':
      return 'Unauthorized'
    case 'insufficient_scope':
      return 'Insufficient Scope'
    case 'invalid_input':
      return 'Invalid Input'
    case 'not_found':
      return 'Not Found'
    case 'rate_limited':
      return 'Rate Limited'
    case 'dry_run_required':
      return 'Dry Run Required'
    case 'confirm_token_invalid':
      return 'Invalid Confirmation Token'
    case 'idempotency_conflict':
      return 'Idempotency Conflict'
    case 'unsupported_operation':
      return 'Unsupported Operation'
    case 'feature_unavailable':
      return 'Feature Unavailable'
    case 'internal_error':
      return 'Internal Error'
    default:
      return 'Contract Error'
  }
}
