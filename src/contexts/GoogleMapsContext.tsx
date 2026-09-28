'use client'

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

const libraries: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places', 'geometry']

interface GoogleMapsContextValue {
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextValue | null>(null)

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

export function useGoogleMaps(): GoogleMapsContextValue {
  const value = useContext(GoogleMapsContext)
  if (!value) {
    throw new Error('useGoogleMaps must be used within GoogleMapsProvider')
  }
  return value
}

export function useGoogleMapsOptional(): GoogleMapsContextValue | null {
  return useContext(GoogleMapsContext)
}
