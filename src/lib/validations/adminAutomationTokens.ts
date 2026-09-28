import { z } from 'zod'

const scopeSchema = z.enum(['read', 'mutate', 'destructive'])

export const createAutomationTokenSchema = z
  .object({
    tokenName: z.string().min(3).max(100),
    serviceAccountName: z.string().min(3).max(100),
    scopes: z.array(scopeSchema).min(1),
    expiresAt: z.string().datetime().optional(),
    confirmDestructiveScope: z.boolean().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.scopes.includes('destructive') && input.confirmDestructiveScope !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmDestructiveScope'],
        message: 'Destructive scope requires explicit confirmation.',
      })
    }
  })

export const revokeAutomationTokenSchema = z.object({
  confirm: z.literal(true),
  reason: z.string().max(500).optional(),
})

export type CreateAutomationTokenInput = z.infer<typeof createAutomationTokenSchema>
export type RevokeAutomationTokenInput = z.infer<typeof revokeAutomationTokenSchema>

