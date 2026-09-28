import { APP_CONFIG } from '../constants'

/**
 * Map of allowed MIME types to file extensions.
 * Ensures we use the correct extension based on validated MIME type.
 */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg', // some systems report image/jpg instead of image/jpeg
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/**
 * Validate image file for item uploads and return the correct extension.
 * @returns Object with validation status and proper extension based on MIME type
 */
export function validateItemImage(file: File): { error?: string; extension?: string } {
  const maxSizeMB = APP_CONFIG.maxImageSizeMB
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    return { error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }
  }

  if (file.size > maxSizeBytes) {
    return { error: `Image must be less than ${maxSizeMB}MB` }
  }

  return { extension: ALLOWED_IMAGE_TYPES[file.type] }
}
