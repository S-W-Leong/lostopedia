/**
 * Error Sanitization Utilities
 *
 * Prevents leaking internal implementation details in production error messages
 */

/**
 * Check if running in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Sanitize error messages for production
 * In development: returns full error details for debugging
 * In production: returns generic message to prevent information disclosure
 *
 * @param error - The error object or message
 * @param fallbackMessage - Generic message to show in production (default: 'An unexpected error occurred')
 * @returns Sanitized error message
 *
 * @example
 * try {
 *   await database.query()
 * } catch (error) {
 *   return NextResponse.json(
 *     { error: sanitizeError(error, 'Database operation failed') },
 *     { status: 500 }
 *   )
 * }
 */
export function sanitizeError(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred'
): string {
  if (isDevelopment()) {
    // In development, return full error details for debugging
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  // In production, return generic message to prevent information leakage
  return fallbackMessage
}

/**
 * Sanitize database error messages
 * Removes PostgreSQL-specific error codes and constraint names
 */
export function sanitizeDatabaseError(error: unknown): string {
  if (isDevelopment()) {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  // In production, return generic database error
  return 'Database operation failed'
}

/**
 * Sanitize authentication error messages
 */
export function sanitizeAuthError(error: unknown): string {
  if (isDevelopment()) {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  // In production, return generic auth error
  return 'Authentication failed'
}

/**
 * Log error with full details server-side while returning sanitized message to client
 * @param error - The error to log
 * @param context - Additional context for logging
 * @returns Sanitized error message safe for client
 */
export function logAndSanitizeError(
  error: unknown,
  context: string,
  fallbackMessage = 'An unexpected error occurred'
): string {
  // Always log full error server-side
  console.error(`[${context}]`, error)

  // Return sanitized message for client
  return sanitizeError(error, fallbackMessage)
}

/**
 * Create a standard API error response
 */
export interface ApiErrorResponse {
  success: false
  error: string
  details?: string
}

/**
 * Create a sanitized API error response
 * @param error - The error object
 * @param userMessage - User-friendly message describing what went wrong
 * @returns Standardized error response
 */
export function createApiErrorResponse(
  error: unknown,
  userMessage: string
): ApiErrorResponse {
  const response: ApiErrorResponse = {
    success: false,
    error: userMessage,
  }

  // Only include error details in development
  if (isDevelopment()) {
    response.details = error instanceof Error ? error.message : String(error)
  }

  return response
}
