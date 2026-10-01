'use client'

import { useEffect, useState } from 'react'
import { loadGoogleMaps } from '@/lib/google-maps-loader'

// Consumers load only the library they need. The loader persists across route
// changes and deduplicates concurrent consumers without an eager layout provider.
export function useGoogleMaps(library: 'maps' | 'places' = 'maps') {
  const [state, setState] = useState({ isLoaded: false, loadError: undefined as Error | undefined })
  useEffect(() => {
    let current = true
    loadGoogleMaps(library).then(
      () => { if (current) setState({ isLoaded: true, loadError: undefined }) },
      (error: Error) => { if (current) setState({ isLoaded: false, loadError: error }) },
    )
    return () => { current = false }
  }, [library])
  return state
}
