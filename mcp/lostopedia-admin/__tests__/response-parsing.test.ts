import { afterEach, describe, expect, it, vi } from 'vitest'
import { invokeContractedOperation } from '../server'

describe('lostopedia admin MCP response parsing', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns structured fallback error for non-JSON upstream failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('<html>Bad gateway</html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await invokeContractedOperation(
      'admin.users.list',
      {},
      {
        baseUrl: 'https://lostopedia.app',
        bearerToken: 'token-id.secret',
      }
    )

    expect(result.ok).toBe(false)
    expect(result.status).toBe(502)
    expect(result.payload).toMatchObject({
      success: false,
      error: { code: 'non_json_response' },
    })
  })
})

