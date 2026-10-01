import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMapMarkers } from '../use-map-markers'

const bounds = { south: 3, north: 4, west: 101, east: 102 }
const marker = { id: 'new', type: 'lost', title: 'Phone', geoLocation: { latitude: 3, longitude: 101 } }
const response = (items = [marker], status = 200) => ({
  ok: status === 200, status, json: async () => ({ success: status === 200, items, hasMore: false }),
})

describe('viewport marker requests', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })
  const advance = () => act(async () => { await vi.advanceTimersByTimeAsync(350) })

  it('waits for bounds and debounces movement', async () => {
    vi.mocked(fetch).mockResolvedValue(response() as Response)
    const { rerender, result } = renderHook(({ viewport }) => useMapMarkers(viewport, 'all', 'all'), {
      initialProps: { viewport: null as typeof bounds | null },
    })
    await advance()
    expect(fetch).not.toHaveBeenCalled()
    rerender({ viewport: bounds })
    rerender({ viewport: { ...bounds, east: 103 } })
    await advance()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('east=103')
    expect(result.current.items).toEqual([marker])
  })

  it('aborts old requests and ignores their late responses', async () => {
    let resolveOld!: (value: Response) => void
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
      .mockResolvedValueOnce(response() as Response)
    const { result, rerender } = renderHook(({ type }) => useMapMarkers(bounds, type, 'all'), {
      initialProps: { type: 'all' as 'all' | 'found' },
    })
    await advance()
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal
    rerender({ type: 'found' })
    expect(signal?.aborted).toBe(true)
    expect(result.current.items).toEqual([])
    await advance()
    await act(async () => { resolveOld(response([{ ...marker, id: 'old' }]) as Response) })
    expect(result.current.items).toEqual([marker])
    expect(result.current.loading).toBe(false)
  })

  it.each([401, 500])('communicates HTTP %s and permits retry', async (status) => {
    vi.mocked(fetch).mockResolvedValueOnce(response([], status) as Response)
      .mockResolvedValueOnce(response() as Response)
    const { result } = renderHook(() => useMapMarkers(bounds, 'all', 'all'))
    await advance()
    expect(result.current.error).toBeTruthy()
    expect(result.current.authRequired).toBe(status === 401)
    act(() => result.current.retry())
    await advance()
    expect(result.current.items).toEqual([marker])
    expect(result.current.error).toBeNull()
  })
})
