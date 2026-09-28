import { z } from 'zod'
import { APP_CONFIG } from '@/lib/constants'

export const sendMessageSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  recipientId: z.string().uuid('Invalid recipient ID'),
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(APP_CONFIG.maxMessageLength, `Message must be less than ${APP_CONFIG.maxMessageLength} characters`),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>

