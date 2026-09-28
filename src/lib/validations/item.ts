import { z } from 'zod'
import { ITEM_CATEGORIES, ITEM_TYPES, APP_CONFIG } from '@/lib/constants'

export const itemFormSchema = z.object({
  type: z.enum(ITEM_TYPES, {
    required_error: 'Please select whether this is a lost or found item',
  }),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(APP_CONFIG.maxTitleLength, `Title must be less than ${APP_CONFIG.maxTitleLength} characters`),
  description: z
    .string()
    .trim()
    .max(APP_CONFIG.maxDescriptionLength, `Description must be less than ${APP_CONFIG.maxDescriptionLength} characters`),
  category: z.enum(ITEM_CATEGORIES, {
    required_error: 'Please select a category',
  }),
  locationText: z.string().min(1, 'Location is required').trim(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  dateLostFound: z.string().optional(),
  pickupMethod: z.enum(['office', 'meetup']).optional(),
  images: z.array(typeof File !== 'undefined' ? z.instanceof(File) : z.any()).max(3, 'Maximum 3 images allowed'),
})

export type ItemFormValues = z.infer<typeof itemFormSchema>

// Edit schema (type cannot be changed; images are optional for replace)
export const itemEditSchema = itemFormSchema
  .omit({ type: true })
  .extend({
    images: z.array(typeof File !== 'undefined' ? z.instanceof(File) : z.any()).max(3, 'Maximum 3 images allowed').optional(),
  })
export type ItemEditValues = z.infer<typeof itemEditSchema>

// Legacy export for backward compatibility
export const itemSchema = itemFormSchema
