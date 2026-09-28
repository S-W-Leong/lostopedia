/**
 * Custom hook to fetch AI-powered matches for an item
 * 
 * @param itemId - The ID of the item to find matches for
 * @param limit - Maximum number of matches to fetch (default: 3)
 * @returns Object with matches, loading state, error, and refetch function
 */

import { useState, useEffect, useCallback } from 'react'
import type { Match } from '@/types'

interface UseMatchesResult {
  matches: Match[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useMatches(itemId: string, limit: number = 3): UseMatchesResult {
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = useCallback(async () => {
    if (!itemId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/matches?itemId=${itemId}&limit=${limit}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          const resetHeader = response.headers.get('X-RateLimit-Reset')
          const resetMs = resetHeader ? Number(resetHeader) : NaN
          const resetTime = Number.isFinite(resetMs) ? new Date(resetMs).toLocaleTimeString() : null
          throw new Error(
            resetTime
              ? `Too many match requests. Please try again after ${resetTime}.`
              : 'Too many match requests. Please try again later.'
          )
        }
        throw new Error(data.error || 'Failed to fetch matches')
      }

      if (data.success) {
        setMatches(data.matches || [])
      } else {
        throw new Error(data.error || 'Failed to fetch matches')
      }
    } catch (err) {
      console.error('Error fetching matches:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch matches')
      setMatches([])
    } finally {
      setIsLoading(false)
    }
  }, [itemId, limit])

  // Fetch matches on mount and when dependencies change
  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  return {
    matches,
    isLoading,
    error,
    refetch: fetchMatches,
  }
}

