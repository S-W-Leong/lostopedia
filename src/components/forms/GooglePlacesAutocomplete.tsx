'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGoogleMapsOptional } from '@/contexts/GoogleMapsContext'

interface GooglePlacesAutocompleteProps {
  value: string
  onChange: (value: string, lat?: number, lng?: number) => void
  error?: string
  label?: string
  placeholder?: string
  required?: boolean
}

// Fallback: only used when component is rendered outside GoogleMapsProvider
let isScriptLoading = false
let isScriptLoaded = false
const scriptCallbacks: (() => void)[] = []

function useFallbackScriptLoad(): boolean {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      isScriptLoaded = true
      queueMicrotask(() => setIsLoaded(true))
      return
    }
    if (isScriptLoaded) {
      queueMicrotask(() => setIsLoaded(true))
      return
    }
    if (isScriptLoading) {
      scriptCallbacks.push(() => setIsLoaded(true))
      return
    }
    isScriptLoading = true
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    )
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        isScriptLoaded = true
        isScriptLoading = false
        setIsLoaded(true)
        scriptCallbacks.forEach((cb) => cb())
        scriptCallbacks.length = 0
      })
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      isScriptLoaded = true
      isScriptLoading = false
      setIsLoaded(true)
      scriptCallbacks.forEach((cb) => cb())
      scriptCallbacks.length = 0
    }
    script.onerror = () => {
      isScriptLoading = false
      console.error('Failed to load Google Maps script')
    }
    document.head.appendChild(script)
  }, [])

  return isLoaded
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  error,
  label = 'Location',
  placeholder = 'Enter location...',
  required = false,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const mapsContext = useGoogleMapsOptional()
  const fallbackLoaded = useFallbackScriptLoad()

  // Use provider's load state when inside GoogleMapsProvider; otherwise fallback script
  const isLoaded = mapsContext ? mapsContext.isLoaded : fallbackLoaded

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return

    // Initialize autocomplete
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['establishment', 'geocode'],
      }
    )

    // Add place changed listener
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()

      if (place?.formatted_address) {
        const lat = place.geometry?.location?.lat()
        const lng = place.geometry?.location?.lng()
        onChange(place.formatted_address, lat, lng)
      } else if (place?.name) {
        onChange(place.name)
      }
    })
  }, [isLoaded, onChange])

  return (
    <div className="space-y-2">
      <Label htmlFor="location" error={!!error} required={required}>
        {label}
      </Label>
      <Input
        ref={inputRef}
        id="location"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={!!error}
        disabled={!isLoaded}
      />
      {!isLoaded && (
        <p className="text-sm text-text-muted">Loading location search...</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
