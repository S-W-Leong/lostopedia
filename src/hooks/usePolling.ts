'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

export interface UsePollingOptions {
  /**
   * Polling interval in milliseconds
   */
  interval: number
  /**
   * Whether to start polling immediately
   * @default true
   */
  immediate?: boolean
  /**
   * Whether to pause when tab is hidden
   * @default true
   */
  pauseOnHidden?: boolean
  /**
   * Whether polling is enabled
   * @default true
   */
  enabled?: boolean
  /**
   * Maximum number of consecutive errors before stopping polling
   * @default 5
   */
  maxConsecutiveErrors?: number
  /**
   * Whether to use exponential backoff on errors
   * @default true
   */
  useExponentialBackoff?: boolean
  /**
   * Base delay for exponential backoff in milliseconds
   * @default 1000
   */
  backoffBaseDelay?: number
  /**
   * Maximum backoff delay in milliseconds
   * @default 30000
   */
  maxBackoffDelay?: number
}

export interface UsePollingReturn {
  /**
   * Start polling
   */
  startPolling: () => void
  /**
   * Stop polling
   */
  stopPolling: () => void
  /**
   * Whether polling is currently active
   */
  isPolling: boolean
  /**
   * Number of consecutive errors
   */
  consecutiveErrors: number
  /**
   * Whether polling is paused due to errors
   */
  isPaused: boolean
  /**
   * Reset error count and resume polling
   */
  resetErrors: () => void
}

/**
 * Generic polling hook that executes a callback at regular intervals
 * 
 * @param callback - Function to execute on each poll
 * @param options - Polling configuration options
 * @returns Object with polling control functions and state
 * 
 * @example
 * ```tsx
 * const { startPolling, stopPolling, isPolling } = usePolling(
 *   async () => {
 *     await fetchData()
 *   },
 *   { interval: 10000 }
 * )
 * ```
 */
export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions
): UsePollingReturn {
  const {
    interval,
    immediate = true,
    pauseOnHidden = true,
    enabled = true,
    maxConsecutiveErrors = 5,
    useExponentialBackoff = true,
    backoffBaseDelay = 1000,
    maxBackoffDelay = 30000,
  } = options

  const [isPolling, setIsPolling] = useState(false)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const backoffTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)
  const isMountedRef = useRef(true)
  const isPendingRef = useRef(false) // Rate limiting: prevent concurrent requests
  const resumeAfterVisibilityRef = useRef(false)

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (backoffTimeoutRef.current) {
        clearTimeout(backoffTimeoutRef.current)
        backoffTimeoutRef.current = null
      }
    }
  }, [])

  const executeCallback = useCallback(async () => {
    if (!isMountedRef.current || !enabled || isPaused) return

    // Rate limiting: don't execute if previous request is still pending
    if (isPendingRef.current) {
      return
    }

    isPendingRef.current = true

    try {
      await callbackRef.current()
      // Reset error count on success
      setConsecutiveErrors(0)
      setIsPaused(false)
    } catch (error) {
      console.error('Polling callback error:', error)
      const newErrorCount = consecutiveErrors + 1
      setConsecutiveErrors(newErrorCount)

      // Stop polling if max errors reached
      if (newErrorCount >= maxConsecutiveErrors) {
        console.warn(
          `Polling stopped after ${maxConsecutiveErrors} consecutive errors`
        )
        setIsPaused(true)
        stopPolling()
        return
      }

      // Apply exponential backoff
      if (useExponentialBackoff && newErrorCount > 0) {
        const backoffDelay = Math.min(
          backoffBaseDelay * Math.pow(2, newErrorCount - 1),
          maxBackoffDelay
        )

        // Clear current interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }

        // Set up backoff timeout
        backoffTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && !isPaused) {
            // Resume polling after backoff
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
            }
            intervalRef.current = setInterval(executeCallback, interval)
          }
        }, backoffDelay)
      }
    } finally {
      isPendingRef.current = false
    }
  }, [
    enabled,
    isPaused,
    consecutiveErrors,
    maxConsecutiveErrors,
    useExponentialBackoff,
    backoffBaseDelay,
    maxBackoffDelay,
    interval,
  ])

  const startPolling = useCallback(() => {
    if (intervalRef.current || !enabled || isPaused) return

    // Reset error state when manually starting
    setConsecutiveErrors(0)
    setIsPaused(false)

    // Clear any existing backoff timeout
    if (backoffTimeoutRef.current) {
      clearTimeout(backoffTimeoutRef.current)
      backoffTimeoutRef.current = null
    }

    if (immediate) {
      executeCallback()
    }

    // Set up interval
    intervalRef.current = setInterval(executeCallback, interval)
    setIsPolling(true)
  }, [interval, enabled, isPaused, immediate, executeCallback])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setIsPolling(false)
    }
    if (backoffTimeoutRef.current) {
      clearTimeout(backoffTimeoutRef.current)
      backoffTimeoutRef.current = null
    }
  }, [])

  const resetErrors = useCallback(() => {
    setConsecutiveErrors(0)
    setIsPaused(false)
    // Resume polling if it was paused
    if (!intervalRef.current && enabled && !isPaused) {
      startPolling()
    }
  }, [enabled, isPaused, startPolling])

  // Handle visibility changes
  useEffect(() => {
    if (!pauseOnHidden || !enabled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        executeCallback()
        if (resumeAfterVisibilityRef.current && !intervalRef.current && isMountedRef.current) {
          intervalRef.current = setInterval(executeCallback, interval)
          setIsPolling(true)
        }
        resumeAfterVisibilityRef.current = false
      } else {
        resumeAfterVisibilityRef.current = Boolean(intervalRef.current)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          setIsPolling(false)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pauseOnHidden, enabled, interval, executeCallback])

  // Auto-start if immediate is true
  useEffect(() => {
    if (immediate && enabled) {
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [immediate, enabled, startPolling, stopPolling])

  return {
    startPolling,
    stopPolling,
    isPolling,
    consecutiveErrors,
    isPaused,
    resetErrors,
  }
}
