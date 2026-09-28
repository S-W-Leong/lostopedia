import { NextResponse } from 'next/server'
import type { AdminOperationId } from '@/lib/contracts/admin/v1/schemas'
import {
  createProblemDetails,
  type ContractErrorCode,
  type ContractProblemDetails,
} from '@/lib/contracts/admin/v1/errors'

export interface ContractSuccessEnvelope<TData> {
  success: true
  operationId: AdminOperationId
  requestId: string
  data: TData
}

export interface ContractErrorEnvelope {
  success: false
  operationId?: AdminOperationId
  requestId: string
  error: ContractProblemDetails
}

export function contractSuccess<TData>(
  operationId: AdminOperationId,
  requestId: string,
  data: TData,
  status = 200
) {
  const payload: ContractSuccessEnvelope<TData> = {
    success: true,
    operationId,
    requestId,
    data,
  }
  return NextResponse.json(payload, { status })
}

export function contractError(
  code: ContractErrorCode,
  detail: string,
  status: number,
  requestId: string,
  operationId?: AdminOperationId
) {
  const payload: ContractErrorEnvelope = {
    success: false,
    requestId,
    operationId,
    error: createProblemDetails(code, detail, status, operationId),
  }
  return NextResponse.json(payload, {
    status,
    headers: {
      'Content-Type': 'application/problem+json',
    },
  })
}
