import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('on-demand Maps SDK', () => {
  beforeEach(() => { vi.resetModules(); document.head.innerHTML = ''; delete (window as unknown as { google?: unknown }).google })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  async function ready() {
    const importLibrary = vi.fn().mockResolvedValue({})
    Object.assign(window, { google: { maps: { importLibrary } } })
    const script = document.querySelector('script')!
    const callback = new URL(script.src).searchParams.get('callback')!
    ;(window as unknown as Record<string, () => void>)[callback]()
    return importLibrary
  }

  it('loads nothing on import; concurrent maps consumers share one SDK request', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
    const { loadGoogleMaps } = await import('../google-maps-loader')
    expect(document.querySelector('script')).toBeNull()
    const first = loadGoogleMaps()
    const second = loadGoogleMaps()
    expect(document.querySelectorAll('script')).toHaveLength(1)
    expect(document.querySelector('script')?.src).not.toContain('places')
    const importLibrary = await ready()
    await Promise.all([first, second])
    expect(importLibrary).not.toHaveBeenCalledWith('places')
  })

  it('imports Places once only when autocomplete requests it', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
    const { loadGoogleMaps } = await import('../google-maps-loader')
    const map = loadGoogleMaps()
    const importLibrary = await ready()
    await map
    await Promise.all([loadGoogleMaps('places'), loadGoogleMaps('places')])
    expect(document.querySelectorAll('script')).toHaveLength(1)
    expect(importLibrary.mock.calls.filter(([name]) => name === 'places')).toHaveLength(1)
  })

  it('rejects script failure for every waiting consumer', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
    const { loadGoogleMaps } = await import('../google-maps-loader')
    const first = loadGoogleMaps()
    const second = loadGoogleMaps('places')
    const results = Promise.allSettled([first, second])
    document.querySelector('script')!.dispatchEvent(new Event('error'))
    expect((await results).map(result => result.status)).toEqual(['rejected', 'rejected'])
  })

  it('reports an SDK timeout instead of loading forever', async () => {
    vi.useFakeTimers()
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
    const { loadGoogleMaps } = await import('../google-maps-loader')
    const result = Promise.allSettled([loadGoogleMaps()])
    await vi.advanceTimersByTimeAsync(20000)
    expect((await result)[0].status).toBe('rejected')
  })
})
