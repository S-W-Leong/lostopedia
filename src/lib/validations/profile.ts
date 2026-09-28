import { z } from 'zod'

export const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[\d\s\-+()]+$/.test(val),
      'Please enter a valid phone number'
    ),
})

export type ProfileFormData = z.infer<typeof profileSchema>

// Max file size: 5MB
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024

// Allowed image types
export const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)'
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return 'Image must be smaller than 5MB'
  }

  return null
}

