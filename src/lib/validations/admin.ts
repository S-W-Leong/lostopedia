import { z } from 'zod'

/**
 * Flag submission schema
 */
export const flagSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  reason: z.enum([
    'spam',
    'inappropriate_content',
    'scam',
    'duplicate',
    'harassment',
    'fake_item',
    'other',
  ]),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
})

export type FlagFormData = z.infer<typeof flagSchema>

/**
 * Ban user schema
 */
export const banUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be 500 characters or less'),
})

export type BanUserFormData = z.infer<typeof banUserSchema>

/**
 * Reputation adjustment schema
 * Uncapped system allows larger adjustments for special cases
 */
export const reputationAdjustSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  points: z
    .number()
    .int('Points must be an integer')
    .min(-500, 'Points adjustment must be at least -500')
    .max(500, 'Points adjustment must be at most 500'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be 500 characters or less'),
})

export type ReputationAdjustFormData = z.infer<typeof reputationAdjustSchema>

/**
 * Item moderation schema
 * Note: 'removed' status can only be set through flag review, not directly
 */
export const itemModerationSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  status: z.enum(['active', 'completed', 'expired']),
  adminNotes: z.string().max(1000, 'Admin notes must be 1000 characters or less').optional(),
})

export type ItemModerationFormData = z.infer<typeof itemModerationSchema>

/**
 * Flag review schema
 * Includes action_taken to support item removal through flag review
 */
export const flagReviewSchema = z.object({
  flagId: z.string().uuid('Invalid flag ID'),
  status: z.enum(['pending', 'reviewed', 'dismissed']),
  reviewNotes: z
    .string()
    .max(1000, 'Review notes must be 1000 characters or less')
    .nullable()
    .optional(),
  actionTaken: z.enum(['none', 'item_removed', 'user_warned', 'user_banned']).optional().default('none'),
})

export type FlagReviewFormData = z.infer<typeof flagReviewSchema>

