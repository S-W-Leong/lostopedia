/**
 * Polling configuration and utilities
 * 
 * This module provides centralized polling configuration and utilities
 * for the chat system. All polling intervals are defined in APP_CONFIG
 * and should be used consistently across the application.
 */

import { APP_CONFIG } from './constants'

/**
 * Polling interval configuration
 * 
 * These intervals are defined in APP_CONFIG.pollingIntervals:
 * - messages: 10 seconds (10000ms) - Used for message thread polling
 * - inbox: 30 seconds (30000ms) - Used for inbox/conversation list polling
 * - notifications: 60 seconds (60000ms) - Used for header notification polling
 */
export const POLLING_INTERVALS = {
  /**
   * Thread page polling interval (10 seconds)
   * Polls for new messages in an active conversation thread
   */
  THREAD: APP_CONFIG.pollingIntervals.messages,

  /**
   * Inbox page polling interval (30 seconds)
   * Polls for new conversations and conversation updates
   */
  INBOX: APP_CONFIG.pollingIntervals.inbox,

  /**
   * Header notification polling interval (60 seconds)
   * Polls for unread message count in the header
   */
  NOTIFICATIONS: APP_CONFIG.pollingIntervals.notifications,
} as const

/**
 * Polling error handling configuration
 */
export const POLLING_ERROR_CONFIG = {
  /**
   * Maximum consecutive errors before stopping polling
   */
  MAX_CONSECUTIVE_ERRORS: 5,

  /**
   * Whether to use exponential backoff on errors
   */
  USE_EXPONENTIAL_BACKOFF: true,

  /**
   * Base delay for exponential backoff in milliseconds
   */
  BACKOFF_BASE_DELAY: 1000,

  /**
   * Maximum backoff delay in milliseconds (30 seconds)
   */
  MAX_BACKOFF_DELAY: 30000,
} as const

/**
 * Polling behavior configuration
 */
export const POLLING_BEHAVIOR = {
  /**
   * Whether to pause polling when tab is hidden
   */
  PAUSE_ON_HIDDEN: true,

  /**
   * Whether to execute callback immediately when polling starts
   */
  IMMEDIATE_EXECUTION: true,

  /**
   * Whether to prevent concurrent requests (rate limiting)
   */
  PREVENT_CONCURRENT: true,
} as const

/**
 * Get polling configuration for a specific use case
 * 
 * @param useCase - The polling use case ('thread', 'inbox', or 'notifications')
 * @returns Polling configuration object
 * 
 * @example
 * ```tsx
 * const config = getPollingConfig('thread')
 * const { startPolling } = usePolling(fetchMessages, config)
 * ```
 */
export function getPollingConfig(useCase: 'thread' | 'inbox' | 'notifications') {
  const interval = useCase === 'thread' 
    ? POLLING_INTERVALS.THREAD
    : useCase === 'inbox'
    ? POLLING_INTERVALS.INBOX
    : POLLING_INTERVALS.NOTIFICATIONS

  return {
    interval,
    immediate: POLLING_BEHAVIOR.IMMEDIATE_EXECUTION,
    pauseOnHidden: POLLING_BEHAVIOR.PAUSE_ON_HIDDEN,
    enabled: true,
    maxConsecutiveErrors: POLLING_ERROR_CONFIG.MAX_CONSECUTIVE_ERRORS,
    useExponentialBackoff: POLLING_ERROR_CONFIG.USE_EXPONENTIAL_BACKOFF,
    backoffBaseDelay: POLLING_ERROR_CONFIG.BACKOFF_BASE_DELAY,
    maxBackoffDelay: POLLING_ERROR_CONFIG.MAX_BACKOFF_DELAY,
  }
}

/**
 * Calculate exponential backoff delay
 * 
 * @param attemptNumber - The attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Calculated backoff delay
 * 
 * @example
 * ```tsx
 * const delay = calculateBackoffDelay(2, 1000, 30000) // Returns 4000ms
 * ```
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  baseDelay: number = POLLING_ERROR_CONFIG.BACKOFF_BASE_DELAY,
  maxDelay: number = POLLING_ERROR_CONFIG.MAX_BACKOFF_DELAY
): number {
  const delay = baseDelay * Math.pow(2, attemptNumber)
  return Math.min(delay, maxDelay)
}

/**
 * Check if polling should be active based on page visibility
 * 
 * @returns true if the page is visible and polling should be active
 */
export function shouldPoll(): boolean {
  if (typeof document === 'undefined') return false
  return document.visibilityState === 'visible'
}

