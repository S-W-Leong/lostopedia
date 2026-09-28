import { adminOperationsV1 } from '@/lib/contracts/admin/v1/operations'
import type { AdminOperationId } from '@/lib/contracts/admin/v1/schemas'
import { getOperationInputJsonSchema, type JsonSchemaObject } from './schema'

export interface MappedToolDefinition {
  name: string
  description: string
  operationId: AdminOperationId
  destructive: boolean
  requiredScopes: string[]
  inputSchema: JsonSchemaObject
}

export function buildAdminToolsCatalog(): MappedToolDefinition[] {
  return Object.values(adminOperationsV1).map((operation) => ({
    name: operation.id,
    description: operation.description,
    operationId: operation.id,
    destructive: operation.destructive,
    requiredScopes: operation.requiredScopes,
    inputSchema: getOperationInputJsonSchema(operation.id),
  }))
}
