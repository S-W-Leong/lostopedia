import { useState, useEffect } from 'react'

/**
 * Hook to debounce a value
 * Useful for delaying API calls while user is typing
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up the timer if value changes before delay is over
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

