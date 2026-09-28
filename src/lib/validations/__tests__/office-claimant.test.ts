import { describe, it, expect } from 'vitest'
import { createOfficeClaimantBodySchema, officeClaimantBodySchema } from '../office-claimant'

describe('officeClaimantBodySchema', () => {
  it('accepts valid name and student ID', () => {
    const r = officeClaimantBodySchema.safeParse({
      claimantName: 'Jane Doe',
      claimantStudentId: '22WMR12345',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.claimantName).toBe('Jane Doe')
      expect(r.data.claimantStudentId).toBe('22WMR12345')
    }
  })

  it('rejects empty trimmed name', () => {
    const r = officeClaimantBodySchema.safeParse({
      claimantName: '   ',
      claimantStudentId: 'id',
    })
    expect(r.success).toBe(false)
  })

  it('rejects empty student ID', () => {
    const r = officeClaimantBodySchema.safeParse({
      claimantName: 'Name',
      claimantStudentId: '',
    })
    expect(r.success).toBe(false)
  })

  it('normalizes an optional reference to null', () => {
    const schema = createOfficeClaimantBodySchema({ label: 'Member reference', required: false })
    expect(schema.parse({ claimantName: 'Example Person', claimantStudentId: '  ' }))
      .toEqual({ claimantName: 'Example Person', claimantStudentId: null })
    expect(schema.parse({ claimantName: 'Example Person' }).claimantStudentId).toBeNull()
    expect(schema.parse({ claimantName: 'Example Person', claimantStudentId: null }).claimantStudentId).toBeNull()
  })

  it('keeps the claimant name mandatory even with an optional reference', () => {
    const schema = createOfficeClaimantBodySchema({ label: 'Member reference', required: false })
    expect(schema.safeParse({ claimantName: '   ', claimantStudentId: null }).success).toBe(false)
  })

  it('uses the custom label when a required reference is blank', () => {
    const schema = createOfficeClaimantBodySchema({ label: 'Library card', required: true })
    const result = schema.safeParse({ claimantName: 'Example Person', claimantStudentId: '  ' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].message).toContain('Library card')
  })

  it('limits the reference to 64 characters when optional', () => {
    const schema = createOfficeClaimantBodySchema({ label: 'Member reference', required: false })
    expect(schema.safeParse({ claimantName: 'Example Person', claimantStudentId: 'a'.repeat(65) }).success).toBe(false)
  })
})
