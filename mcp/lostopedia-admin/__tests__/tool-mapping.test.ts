import { describe, expect, it } from 'vitest'
import { buildAdminToolsCatalog } from '../tools'

describe('lostopedia admin MCP tool mapping', () => {
  it('maps every contract operation to a tool', () => {
    const tools = buildAdminToolsCatalog()
    const toolNames = tools.map((tool) => tool.name)

    expect(toolNames).toContain('admin.items.list')
    expect(toolNames).toContain('admin.users.list')
    expect(toolNames).toContain('admin.items.bulk-update')
    expect(toolNames).toContain('admin.items.post-draft')
    expect(toolNames).toContain('admin.items.post-confirm')
  })

  it('preserves destructive metadata from operation catalog', () => {
    const tools = buildAdminToolsCatalog()
    const destructiveTool = tools.find((tool) => tool.name === 'admin.items.bulk-update')
    expect(destructiveTool?.destructive).toBe(true)
  })

  it('maps tool input schemas as JSON schema objects', () => {
    const tools = buildAdminToolsCatalog()
    const usersListTool = tools.find((tool) => tool.name === 'admin.users.list')
    expect(usersListTool?.inputSchema).toBeTruthy()
    expect(usersListTool?.inputSchema).toMatchObject({ type: 'object' })
  })
})
