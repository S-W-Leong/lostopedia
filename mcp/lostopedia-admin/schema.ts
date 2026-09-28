import { zodToJsonSchema } from 'zod-to-json-schema'
import { getOperationInputSchema } from '@/lib/contracts/admin/v1/operations'
import type { AdminOperationId } from '@/lib/contracts/admin/v1/schemas'

export type JsonSchemaObject = Record<string, unknown>

function asJsonSchemaObject(schema: unknown): JsonSchemaObject {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return { type: 'object', additionalProperties: false }
  }

  return schema as JsonSchemaObject
}

export function getOperationInputJsonSchema(operationId: AdminOperationId): JsonSchemaObject {
  const zodSchema = getOperationInputSchema(operationId)
  const jsonSchema = zodToJsonSchema(zodSchema, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  })

  return asJsonSchemaObject(jsonSchema)
}

