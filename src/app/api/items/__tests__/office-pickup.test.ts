import { describe, it, expect } from 'vitest'
import { itemFormSchema } from '@/lib/validations/item'

describe('itemFormSchema - pickupMethod', () => {
  it('accepts office as a valid pickup method', () => {
    const result = itemFormSchema.shape.pickupMethod.safeParse('office')
    expect(result.success).toBe(true)
  })

  it('rejects dsa as an invalid pickup method', () => {
    const result = itemFormSchema.shape.pickupMethod.safeParse('dsa')
    expect(result.success).toBe(false)
  })

  it('accepts meetup as a valid pickup method', () => {
    const result = itemFormSchema.shape.pickupMethod.safeParse('meetup')
    expect(result.success).toBe(true)
  })
})
