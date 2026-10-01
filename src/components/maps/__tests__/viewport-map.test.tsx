import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  state: { isLoaded: true, loadError: undefined as Error | undefined },
  fitBounds: vi.fn(),
  map: { getBounds: () => ({ toJSON: () => ({ south: 3, north: 4, west: 101, east: 102 }) }) },
}))
vi.mock('@/contexts/GoogleMapsContext', () => ({ useGoogleMaps: () => sdk.state }))
vi.mock('@react-google-maps/api', async () => {
  const React = await import('react')
  return {
    GoogleMap: ({ children, onLoad, onBoundsChanged }: {
      children: React.ReactNode; onLoad?: (map: unknown) => void; onBoundsChanged?: () => void
    }) => {
      React.useEffect(() => { onLoad?.({ ...sdk.map, fitBounds: sdk.fitBounds }) }, [onLoad])
      return <div role="region" aria-label="Campus map" onClick={onBoundsChanged}>{children}</div>
    },
    MarkerClusterer: ({ children }: { children: (clusterer: object) => React.ReactNode }) => children({}),
    Marker: ({ title, onClick }: { title: string; onClick: () => void }) => <button onClick={onClick}>{title}</button>,
    InfoWindow: ({ children, onCloseClick }: { children: React.ReactNode; onCloseClick: () => void }) => (
      <div role="dialog">{children}<button onClick={onCloseClick}>Close popup</button></div>
    ),
  }
})
import MapPage from '@/app/(main)/map/page'
import { ItemsMap } from '../ItemsMap'
import { MiniMap } from '../MiniMap'

const marker = { id: 'item', type: 'lost' as const, title: 'Phone', geoLocation: { latitude: 0, longitude: 0 } }
const details = { description: 'A blue phone', imageUrl: null, locationText: 'Library', createdAt: '2026-09-01' }

describe('viewport map UI', () => {
  beforeEach(() => {
    sdk.state = { isLoaded: true, loadError: undefined }
    vi.stubGlobal('google', { maps: { SymbolPath: { CIRCLE: 'circle' } } })
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

  it('mounts before data arrives and stays mounted on errors, filters, and empty results', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response)
    render(<MapPage />)
    const map = screen.getByRole('region', { name: 'Campus map' })
    expect(screen.getByText('Loading items in this area...')).toBeInTheDocument()
    fireEvent.click(map)
    await waitFor(() => expect(screen.getByText(/unable to load map items/i)).toBeInTheDocument())
    expect(screen.getByRole('region', { name: 'Campus map' })).toBe(map)
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, items: [], hasMore: false }) } as Response)
    fireEvent.click(screen.getByRole('button', { name: 'Found' }))
    await waitFor(() => expect(screen.getByText(/no items in this area/i)).toBeInTheDocument())
    expect(screen.getByRole('region', { name: 'Campus map' })).toBe(map)
    expect(sdk.fitBounds).not.toHaveBeenCalled()
  })

  it('explains capped results while preserving the map', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, items: [marker], hasMore: true }) } as Response)
    render(<MapPage />)
    fireEvent.click(screen.getByRole('region', { name: 'Campus map' }))
    await waitFor(() => expect(screen.getByText(/zoom in or adjust filters/i)).toBeInTheDocument())
    expect(screen.getByRole('region', { name: 'Campus map' })).toBeInTheDocument()
  })

  it('explains authentication failure while keeping the map available', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 } as Response)
    render(<MapPage />)
    await waitFor(() => expect(screen.getByText('Sign in to see items on the map.')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('region', { name: 'Campus map' })).toBeInTheDocument()
  })

  it('shows SDK loading and SDK errors independently of marker requests', () => {
    sdk.state.isLoaded = false
    const { rerender } = render(<MapPage />)
    expect(screen.getByText('Loading map...')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
    sdk.state.loadError = new Error('SDK unavailable')
    rerender(<MapPage />)
    expect(screen.getByText('Error loading maps')).toBeInTheDocument()
  })

  it('renders a mini map safely before the SDK exists', () => {
    vi.stubGlobal('google', undefined)
    sdk.state.isLoaded = false
    render(<MiniMap location={{ latitude: 3, longitude: 101 }} />)
    expect(screen.getByText('Loading map...')).toBeInTheDocument()
  })

  it('requests popup details only on selection, including zero coordinates', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, item: details }) } as Response)
    render(<ItemsMap items={[marker]} />)
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Phone' }))
    await waitFor(() => expect(screen.getByText('A blue phone')).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledWith('/api/map/items/item', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('ignores stale popup responses when a different marker is selected', async () => {
    let resolveOld!: (response: Response) => void
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, item: { ...details, description: 'New details' } }) } as Response)
    render(<ItemsMap items={[marker, { ...marker, id: 'second', title: 'Keys' }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Phone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keys' }))
    await waitFor(() => expect(screen.getByText('New details')).toBeInTheDocument())
    await act(async () => { resolveOld({ ok: true, status: 200, json: async () => ({ success: true, item: details }) } as Response) })
    expect(screen.queryByText('A blue phone')).not.toBeInTheDocument()
    expect(screen.getByText('New details')).toBeInTheDocument()
  })

  it('aborts popup detail loading when closed', async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
    render(<ItemsMap items={[marker]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Phone' }))
    expect(screen.getByText('Loading item details...')).toBeInTheDocument()
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal
    fireEvent.click(screen.getByRole('button', { name: 'Close popup' }))
    expect(signal?.aborted).toBe(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('offers retry when popup details fail', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, item: details }) } as Response)
    render(<ItemsMap items={[marker]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Phone' }))
    await waitFor(() => expect(screen.getByText('Unable to load item details.')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Retry details' }))
    await waitFor(() => expect(screen.getByText('A blue phone')).toBeInTheDocument())
  })
})
