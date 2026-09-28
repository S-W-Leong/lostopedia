import { describe, expect, it } from 'vitest'
import { adminOperationsV1 } from '@/lib/contracts/admin/v1/operations'
import { listMcpTools } from '../server'

describe('lostopedia admin MCP host compatibility', () => {
  it('keeps MCP tools in parity with contract operations', () => {
    const tools = listMcpTools()
    const operationEntries = Object.values(adminOperationsV1)

    expect(tools).toHaveLength(operationEntries.length)

    for (const operation of operationEntries) {
      const tool = tools.find((candidate) => candidate.operationId === operation.id)
      expect(tool).toBeDefined()
      expect(tool?.name).toBe(operation.id)
      expect(tool?.destructive).toBe(operation.destructive)
      expect(tool?.requiredScopes).toEqual(operation.requiredScopes)
      expect(tool?.inputSchema).toMatchObject({ type: 'object' })
    }
  })
})

