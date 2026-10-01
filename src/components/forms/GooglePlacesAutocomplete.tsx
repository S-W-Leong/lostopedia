'use client'

import { useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGoogleMaps } from '@/contexts/GoogleMapsContext'

interface GooglePlacesAutocompleteProps {
  value: string
  onChange: (value: string, lat?: number, lng?: number) => void
  error?: string
  label?: string
  placeholder?: string
  required?: boolean
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
  const onChangeRef = useRef(onChange)
  const { isLoaded, loadError } = useGoogleMaps('places')

  useEffect(() => { onChangeRef.current = onChange }, [onChange])

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
    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()

      if (place?.formatted_address) {
        const lat = place.geometry?.location?.lat()
        const lng = place.geometry?.location?.lng()
        onChangeRef.current(place.formatted_address, lat, lng)
      } else if (place?.name) {
        onChangeRef.current(place.name)
      }
    })
    return () => {
      listener.remove()
      if (autocompleteRef.current) google.maps.event.clearInstanceListeners(autocompleteRef.current)
      autocompleteRef.current = null
    }
  }, [isLoaded])

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
        <p className="text-sm text-text-muted">{loadError ? 'Location search is unavailable. Please reload to try again.' : 'Loading location search...'}</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
