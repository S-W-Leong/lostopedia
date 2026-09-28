/**
 * Sanitization Utilities
 *
 * Provides functions to sanitize user-controlled content before storage or display
 */

/**
 * Remove HTML tags and special characters from user input
 * Prevents XSS in contexts where content might be rendered as HTML
 *
 * @param input - The string to sanitize
 * @returns Sanitized string with HTML tags removed
 *
 * @example
 * sanitizeUserInput('<script>alert("xss")</script>Hello')
 * // Returns: 'Hello'
 *
 * sanitizeUserInput('John<img src=x onerror=alert(1)>')
 * // Returns: 'John'
 */
export function sanitizeUserInput(input: string | null | undefined): string {
  if (!input) return ''

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')

  // Remove any remaining script-like patterns
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')

  // Trim whitespace
  sanitized = sanitized.trim()

  return sanitized
}

/**
 * Sanitize text for use in notifications
 * Limits length and removes HTML to prevent XSS in notification contexts
 *
 * @param text - Text to sanitize
 * @param maxLength - Maximum length (default: 200)
 * @returns Sanitized text
 *
 * @example
 * sanitizeNotificationText('User <script>alert(1)</script>sent you a message', 50)
 * // Returns: 'User sent you a message'
 */
export function sanitizeNotificationText(
  text: string | null | undefined,
  maxLength = 200
): string {
  const sanitized = sanitizeUserInput(text)

  // Truncate if too long
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength - 3) + '...'
  }

  return sanitized
}

/**
 * Sanitize display name for safe display
 *
 * @param name - User's display name
 * @returns Sanitized name or fallback
 *
 * @example
 * sanitizeDisplayName('<script>alert(1)</script>')
 * // Returns: 'Someone'
 *
 * sanitizeDisplayName('John Smith')
 * // Returns: 'John Smith'
 */
export function sanitizeDisplayName(
  name: string | null | undefined
): string {
  const sanitized = sanitizeUserInput(name)

  // Return fallback if empty after sanitization
  if (!sanitized) {
    return 'Someone'
  }

  // Limit length for display names
  const maxLength = 50
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength)
  }

  return sanitized
}

/**
 * Sanitize item title for safe display
 *
 * @param title - Item title
 * @returns Sanitized title or fallback
 *
 * @example
 * sanitizeItemTitle('<img src=x onerror=alert(1)>Backpack')
 * // Returns: 'Backpack'
 */
export function sanitizeItemTitle(
  title: string | null | undefined
): string {
  const sanitized = sanitizeUserInput(title)

  // Return fallback if empty after sanitization
  if (!sanitized) {
    return 'an item'
  }

  // Limit length
  const maxLength = 100
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength - 3) + '...'
  }

  return sanitized
}
