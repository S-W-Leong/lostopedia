import { z } from 'zod'

export const operationIdSchema = z.enum([
  'admin.items.list',
  'admin.items.bulk-update',
  'admin.items.post-draft',
  'admin.items.post-confirm',
  'admin.users.list',
  'admin.users.update-status',
  'admin.users.delete',
  'admin.reputation.adjust',
  'admin.reputation.list',
])

export type AdminOperationId = z.infer<typeof operationIdSchema>

export const adminScopeSchema = z.enum([
  'read',
  'mutate',
  'destructive',
])

export type AdminScope = z.infer<typeof adminScopeSchema>

export const listItemsInputSchema = z.object({
  type: z.enum(['lost', 'found']).optional(),
  status: z.enum(['active', 'completed', 'expired', 'removed']).optional(),
  flagged: z.boolean().optional(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export const bulkUpdateItemsInputSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
  action: z.enum(['remove', 'restore']),
})

const postDraftItemInputSchema = z.object({
  type: z.enum(['lost', 'found']).optional(),
  title: z.string().min(3).max(160).optional(),
  description: z.string().min(10).max(4000).optional(),
  category: z.string().min(1).max(120).optional(),
  locationText: z.string().min(1).max(240).optional(),
  campusId: z.string().uuid().optional(),
  pickupMethod: z.enum(['office', 'meetup']).optional(),
  dateLostFound: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrls: z.array(z.string().url()).max(3).optional(),
  briefDescription: z.string().min(3).max(1200).optional(),
}).refine((value) => {
  return Boolean(
    value.title ||
      value.description ||
      value.briefDescription ||
      (value.imageUrls && value.imageUrls.length > 0)
  )
}, {
  message: 'At least one content field is required for draft generation.',
})

export const postItemsDraftInputSchema = z.object({
  items: z.array(postDraftItemInputSchema).min(1).max(50),
})

const postConfirmItemInputSchema = z.object({
  type: z.enum(['lost', 'found']),
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(4000),
  category: z.string().min(1).max(120),
  locationText: z.string().min(1).max(240),
  campusId: z.string().uuid(),
  pickupMethod: z.enum(['office', 'meetup']).optional(),
  dateLostFound: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrls: z.array(z.string().url()).max(3).optional(),
})

export const postItemsConfirmInputSchema = z.object({
  items: z.array(postConfirmItemInputSchema).min(1).max(50),
})

export const listUsersInputSchema = z.object({
  search: z.string().optional(),
  banned: z.boolean().optional(),
  admins: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export const updateUserStatusInputSchema = z.object({
  userId: z.string().uuid(),
  is_banned: z.boolean(),
  banned_reason: z.string().min(10).max(500).optional(),
})

export const deleteUserInputSchema = z.object({
  userId: z.string().uuid(),
  deleteItemsAndMessages: z.boolean(),
  confirmText: z.literal('DELETE'),
})

export const adjustReputationInputSchema = z.object({
  userId: z.string().uuid(),
  points: z.number().int().min(-500).max(500),
  reason: z.string().min(10).max(500),
  relatedItemId: z.string().uuid().optional(),
})

export const listReputationInputSchema = z.object({
  userId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export const operationInputSchemas = {
  'admin.items.list': listItemsInputSchema,
  'admin.items.bulk-update': bulkUpdateItemsInputSchema,
  'admin.items.post-draft': postItemsDraftInputSchema,
  'admin.items.post-confirm': postItemsConfirmInputSchema,
  'admin.users.list': listUsersInputSchema,
  'admin.users.update-status': updateUserStatusInputSchema,
  'admin.users.delete': deleteUserInputSchema,
  'admin.reputation.adjust': adjustReputationInputSchema,
  'admin.reputation.list': listReputationInputSchema,
} as const
