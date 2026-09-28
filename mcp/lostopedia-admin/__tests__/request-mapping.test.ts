import { afterEach, describe, expect, it, vi } from 'vitest'
import { invokeContractedOperation } from '../server'

describe('lostopedia admin MCP request mapping', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serializes GET input fields into query parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await invokeContractedOperation(
      'admin.items.list',
      {
        type: 'lost',
        flagged: true,
        limit: 25,
        offset: 10,
      },
      {
        baseUrl: 'https://lostopedia.app',
        bearerToken: 'token-id.secret',
      }
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/api/v1/admin-automation/admin.items.list')
    expect(String(url)).toContain('type=lost')
    expect(String(url)).toContain('flagged=true')
    expect(String(url)).toContain('limit=25')
    expect(String(url)).toContain('offset=10')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
  })
})

