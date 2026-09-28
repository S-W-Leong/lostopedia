import { describe, expect, it } from 'vitest'
import { adminOperationsV1, getOperationInputSchema } from '../operations'
import { operationIdSchema } from '../schemas'

describe('adminOperationsV1', () => {
  it('has a definition for every operation id', () => {
    const operationIds = operationIdSchema.options
    for (const operationId of operationIds) {
      expect(adminOperationsV1[operationId]).toBeDefined()
    }
  })

  it('marks destructive operations with destructive scope', () => {
    const destructiveOps = Object.values(adminOperationsV1).filter(
      (definition) => definition.destructive
    )

    expect(destructiveOps.length).toBeGreaterThan(0)

    for (const definition of destructiveOps) {
      expect(definition.requiredScopes).toContain('destructive')
    }
  })

  it('provides zod input schema for each operation', () => {
    const definitions = Object.values(adminOperationsV1)
    for (const definition of definitions) {
      const schema = getOperationInputSchema(definition.id)
      expect(typeof schema.parse).toBe('function')
    }
  })
})
