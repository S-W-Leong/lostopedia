import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LocationMapPicker } from '../LocationMapPicker'

vi.mock('../MapContainer', () => ({
  MapContainer: ({ onClick }: { onClick: (event: unknown) => void }) => (
    <button onClick={() => onClick({ latLng: { lat: () => 3, lng: () => 101 } })}>Pick location</button>
  ),
}))
vi.mock('@/lib/google-maps-loader', () => ({
  loadGoogleMaps: async () => {
    Object.assign(google.maps, { Geocoder: class {
      async geocode() { return { results: [{ formatted_address: 'Library' }] } }
    } })
  },
}))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('imports geocoding on demand before reverse geocoding a selected location', async () => {
  vi.stubGlobal('google', { maps: {} })
  const onChange = vi.fn()
  render(<LocationMapPicker onLocationChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'Pick location' }))
  await waitFor(() => expect(onChange).toHaveBeenCalledWith('Library', 3, 101))
})
