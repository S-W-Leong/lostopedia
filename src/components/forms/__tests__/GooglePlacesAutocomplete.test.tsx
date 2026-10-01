import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { GooglePlacesAutocomplete } from '../GooglePlacesAutocomplete'

vi.mock('@/contexts/GoogleMapsContext', () => ({ useGoogleMaps: () => ({ isLoaded: true }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('retains the autocomplete widget while delivering selections to the latest callback', () => {
  let placeChanged!: () => void
  const remove = vi.fn()
  const Autocomplete = vi.fn(function () {
    return {
      addListener: (_name: string, callback: () => void) => { placeChanged = callback; return { remove } },
      getPlace: () => ({ formatted_address: 'Library', geometry: { location: { lat: () => 3, lng: () => 101 } } }),
    }
  })
  vi.stubGlobal('google', { maps: { places: { Autocomplete }, event: { clearInstanceListeners: vi.fn() } } })
  const first = vi.fn()
  const latest = vi.fn()
  const { rerender, unmount } = render(<GooglePlacesAutocomplete value="" onChange={first} />)
  rerender(<GooglePlacesAutocomplete value="Library" onChange={latest} />)
  placeChanged()
  expect(latest).toHaveBeenCalledWith('Library', 3, 101)
  expect(first).not.toHaveBeenCalled()
  expect(Autocomplete).toHaveBeenCalledTimes(1)
  unmount()
  expect(remove).toHaveBeenCalledTimes(1)
})
