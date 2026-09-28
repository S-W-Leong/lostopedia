/**
 * Rate Limiting Utilities
 *
 * This module provides rate limiting for API endpoints to prevent abuse.
 * Uses Upstash Redis for production and in-memory fallback for local development.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Upstash Redis client for production
let redis: Redis | null = null

try {
  // Vercel "Upstash for Redis" integration uses KV_REST_API_URL / KV_REST_API_TOKEN.
  const redisUrl = process.env.KV_REST_API_URL
  const redisToken = process.env.KV_REST_API_TOKEN

  if (redisUrl && redisToken) {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    })
    console.log('✅ Upstash Redis connected for rate limiting')
  } else {
    console.log('⚠️ Redis not configured, using in-memory rate limiting (local dev only)')
  }
} catch (error) {
  console.error('Failed to initialize Redis:', error)
  redis = null
}

// In-memory fallback for local development
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier for the rate limit (e.g., userId, IP address)
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with success status and remaining attempts
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired entry
    const resetAt = now + windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return {
      success: true,
      remaining: limit - 1,
      reset: resetAt,
    }
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      reset: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    remaining: limit - entry.count,
    reset: entry.resetAt,
  }
}

// Production rate limiters using Upstash Redis
const productionRateLimiters = redis ? {
  itemCreation: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, '1h'),
    prefix: 'ratelimit:items',
    analytics: true,
  }),
  itemCreationAdmin: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(60, '1h'),
    prefix: 'ratelimit:items-admin',
    analytics: true,
  }),
  matches: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(30, '1m'),
    prefix: 'ratelimit:matches',
    analytics: true,
  }),
  messaging: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(100, '1h'),
    prefix: 'ratelimit:messages',
    analytics: true,
  }),
  search: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(60, '1m'),
    prefix: 'ratelimit:search',
    analytics: true,
  }),
  itemUpdate: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(30, '1h'),
    prefix: 'ratelimit:item-update',
    analytics: true,
  }),
  flagCreation: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, '1h'),
    prefix: 'ratelimit:flags',
    analytics: true,
  }),
  adminAutomationMutations: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(60, '1m'),
    prefix: 'ratelimit:admin-automation-mutations',
    analytics: true,
  }),
} : null

/**
 * Rate limiter configurations for different endpoints
 * Uses Upstash Redis in production, in-memory for local dev
 */
export const rateLimiters = {
  /**
   * Item creation: 10 items per hour per user
   * Prevents spam posting and reputation farming
   */
  itemCreation: async (userId: string) => {
    if (productionRateLimiters) {
      try {
        const result = await productionRateLimiters.itemCreation.limit(userId)
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
        }
      } catch (error) {
        console.error('[RateLimit Error] itemCreation:', error)
        return { success: true, remaining: 1, reset: Date.now() } // fail-open
      }
    }
    return checkRateLimit(`item:${userId}`, 10, 60 * 60 * 1000)
  },

  /**
   * Item creation (admin): 60 items per hour per user
   * Allows bulk posting for staff while still preventing accidental loops/abuse
   */
  itemCreationAdmin: async (userId: string) => {
    if (productionRateLimiters) {
      try {
        const result = await productionRateLimiters.itemCreationAdmin.limit(userId)
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
        }
      } catch (error) {
        console.error('[RateLimit Error] itemCreationAdmin:', error)
        return { success: true, remaining: 1, reset: Date.now() } // fail-open
      }
    }
    return checkRateLimit(`item-admin:${userId}`, 60, 60 * 60 * 1000)
  },

  /**
   * Matches: 30 requests per minute per user
   * Prevents abuse/DoS on AI matching and vector queries
   */
  matches: async (userId: string) => {
    if (productionRateLimiters) {
      try {
        const result = await productionRateLimiters.matches.limit(userId)
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
        }
      } catch (error) {
        console.error('[RateLimit Error] matches:', error)
        return { success: true, remaining: 1, reset: Date.now() } // fail-open
      }
    }
    return checkRateLimit(`matches:${userId}`, 30, 60 * 1000)
  },

  /**
   * Messaging: 100 messages per hour per user
   * Prevents harassment and spam
   */
  messaging: async (userId: string) => {
    if (productionRateLimiters) {
      try {
        const result = await productionRateLimiters.messaging.limit(userId)
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
        }
      } catch (error) {
        console.error('[RateLimit Error] messaging:', error)
        return { success: true, remaining: 1, reset: Date.now() } // fail-open
      }
    }
    return checkRateLimit(`message:${userId}`, 100, 60 * 60 * 1000)
  },

  /**
   * Search: 60 requests per minute per IP
   * Prevents DoS attacks on search endpoint
   */
  search: async (identifier: string) => {
    if (productionRateLimiters) {
      try {
        const result = await productionRateLimiters.search.limit(identifier)
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
        }
      } catch (error) {
        console.error('[RateLimit Error] search:', error)
        return { success: true, remaining: 1, reset: Date.now() } // fail-open
      }
    }
    return checkRateLimit(`search:${identifier}`, 60, 60 * 1000)
  },

  /**
   * Item updates: 30 per hour per user
   * Prevents excessive updates
   */
  itemUpdate: async (userId: string) => {
    if (productionRateLimiters) {
      try {
        const result = await productionRateLimiters.itemUpdate.limit(userId)
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
        }
      } catch (error) {
        console.error('[RateLimit Error] itemUpdate:', error)
        return { success: true, remaining: 1, reset: Date.now() } // fail-open
      }
    }
    return checkRateLimit(`item-update:${userId}`, 30, 60 * 60 * 1000)
  },

  /**
   * Flag creation: 10 per hour per user
   * Prevents flag spam
   */
  flagCreation: async (userId: string) => {
    if (productionRateLimiters) {
      try {
        const result = await productionRateLimiters.flagCreation.limit(userId)
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
        }
      } catch (error) {
        console.error('[RateLimit Error] flagCreation:', error)
        return { success: true, remaining: 1, reset: Date.now() } // fail-open
      }
    }
    return checkRateLimit(`flag:${userId}`, 10, 60 * 60 * 1000)
  },

  /**
   * Admin automation mutating operations: 60 requests per minute per actor+operation
   * Prevents runaway agent loops while allowing steady administrative automation.
   */
  adminAutomationMutation: async (actorKey: string, operationId: string) => {
    const compositeKey = `${actorKey}:${operationId}`
    if (productionRateLimiters) {
      try {
        const result = await productionRateLimiters.adminAutomationMutations.limit(compositeKey)
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
        }
      } catch (error) {
        console.error('[RateLimit Error] adminAutomationMutation:', error)
        return { success: true, remaining: 1, reset: Date.now() } // fail-open
      }
    }
    return checkRateLimit(`admin-automation:${compositeKey}`, 60, 60 * 1000)
  },
}

/**
 * Get client IP address from request headers
 * Works with Vercel, Cloudflare, and standard setups
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  )
}
