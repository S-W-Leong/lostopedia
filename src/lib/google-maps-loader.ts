type MapsLibrary = 'maps' | 'places' | 'geocoding'

let sdkPromise: Promise<void> | undefined
const libraries = new Map<MapsLibrary, Promise<void>>()
const CALLBACK = '__lostopediaMapsReady'

function loadSdk(): Promise<void> {
  if (sdkPromise) return sdkPromise
  if (typeof google !== 'undefined' && typeof google.maps?.importLibrary === 'function') return Promise.resolve()
  sdkPromise = new Promise((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) { reject(new Error('Google Maps is not configured')); return }
    const callbacks = window as unknown as Record<string, () => void>
    const script = document.createElement('script')
    const timer = setTimeout(() => {
      callbacks[CALLBACK] = () => {}
      reject(new Error('Google Maps took too long to load'))
    }, 20000)
    callbacks[CALLBACK] = () => {
      clearTimeout(timer)
      delete callbacks[CALLBACK]
      resolve()
    }
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({
      key, v: 'weekly', loading: 'async', callback: CALLBACK,
    })}`
    script.async = true
    script.onerror = () => {
      clearTimeout(timer)
      delete callbacks[CALLBACK]
      reject(new Error('Unable to load Google Maps'))
    }
    document.head.appendChild(script)
  })
  return sdkPromise
}

// One loader for maps, pickers and autocomplete, including consumers outside
// the main layout. Importing this module never starts an SDK request.
export function loadGoogleMaps(library: MapsLibrary = 'maps'): Promise<void> {
  let pending = libraries.get(library)
  if (!pending) {
    pending = loadSdk().then(async () => { await google.maps.importLibrary(library) })
    libraries.set(library, pending)
  }
  return pending
}
