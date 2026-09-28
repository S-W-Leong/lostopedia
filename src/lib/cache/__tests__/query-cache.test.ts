import { describe, it, expect, vi, beforeEach } from 'vitest'

// In-memory fake Redis shared across the module under test.
const store = new Map<string, unknown>()
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: async (k: string) => (store.has(k) ? store.get(k) : null),
    set: async (k: string, v: unknown) => { store.set(k, v) },
    incr: async (k: string) => {
      const next = (Number(store.get(k)) || 0) + 1
      store.set(k, next)
      return next
    },
  })),
}))

describe('query-cache', () => {
  beforeEach(() => {
    store.clear()
    process.env.KV_REST_API_URL = 'https://fake'
    process.env.KV_REST_API_TOKEN = 'fake'
    vi.resetModules()
  })

  it('round-trips JSON values', async () => {
    const mod = await import('../query-cache')
    expect(await mod.getCachedJson('k1')).toBeNull()
    await mod.setCachedJson('k1', { a: 1 }, 60)
    expect(await mod.getCachedJson('k1')).toEqual({ a: 1 })
  })

  it('bumps the items version', async () => {
    const mod = await import('../query-cache')
    expect(await mod.currentItemsVersion()).toBe(0)
    await mod.bumpItemsVersion()
    expect(await mod.currentItemsVersion()).toBe(1)
  })

  it('builds keys that change with version and params', async () => {
    const mod = await import('../query-cache')
    const k1 = mod.buildItemsCacheKey(1, 'list', { type: 'lost', offset: '0' })
    const k2 = mod.buildItemsCacheKey(2, 'list', { type: 'lost', offset: '0' })
    const k3 = mod.buildItemsCacheKey(1, 'list', { type: 'found', offset: '0' })
    expect(k1).not.toBe(k2)
    expect(k1).not.toBe(k3)
  })

  it('degrades gracefully when Redis is unconfigured', async () => {
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
    vi.resetModules()
    const mod = await import('../query-cache')
    expect(await mod.getCachedJson('nope')).toBeNull()
    await expect(mod.setCachedJson('nope', { a: 1 }, 60)).resolves.toBeUndefined()
    expect(await mod.currentItemsVersion()).toBe(0)
  })
})
