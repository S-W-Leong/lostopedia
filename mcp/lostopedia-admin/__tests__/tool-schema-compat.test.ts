import { describe, expect, it } from 'vitest'
import { buildAdminToolsCatalog } from '../tools'

describe('lostopedia admin MCP tool schemas', () => {
  it('emits JSON object schemas for every tool', () => {
    const tools = buildAdminToolsCatalog()

    for (const tool of tools) {
      expect(tool.inputSchema).toBeTruthy()
      expect(typeof tool.inputSchema).toBe('object')
      expect(Array.isArray(tool.inputSchema)).toBe(false)
      expect(tool.inputSchema.type).toBe('object')
    }
  })
})

