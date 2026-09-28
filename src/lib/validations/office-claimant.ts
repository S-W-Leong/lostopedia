import { z } from 'zod'
import { organization } from '@/lib/organization/config'
import type { OrganizationConfig } from '@/lib/organization/schema'

export function createOfficeClaimantBodySchema(reference: OrganizationConfig['claimantReference']) {
  return z.object({
    claimantName: z.string().trim()
      .min(1, 'Claimant name is required')
      .max(200, 'Name must be 200 characters or less'),
    claimantStudentId: z.string().nullish()
      .transform(value => value?.trim() || null)
      .refine(value => !reference.required || value !== null, `${reference.label} is required`)
      .refine(value => value === null || value.length <= 64, `${reference.label} must be 64 characters or less`)
  })
}

/** Found-item claimant record; API field names remain compatible. */
export const officeClaimantBodySchema = createOfficeClaimantBodySchema(organization.claimantReference)

export type OfficeClaimantBody = z.infer<typeof officeClaimantBodySchema>
