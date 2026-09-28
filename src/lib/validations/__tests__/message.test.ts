import { describe, it, expect } from 'vitest'
import { sendMessageSchema } from '../message'
import { APP_CONFIG } from '@/lib/constants'

describe('sendMessageSchema', () => {
  it('should validate a valid message', () => {
    const validMessage = {
      itemId: '123e4567-e89b-12d3-a456-426614174000',
      recipientId: '123e4567-e89b-12d3-a456-426614174001',
      content: 'Hello, is this item still available?',
    }

    const result = sendMessageSchema.safeParse(validMessage)
    expect(result.success).toBe(true)
  })

  it('should reject empty content', () => {
    const invalidMessage = {
      itemId: '123e4567-e89b-12d3-a456-426614174000',
      recipientId: '123e4567-e89b-12d3-a456-426614174001',
      content: '',
    }

    const result = sendMessageSchema.safeParse(invalidMessage)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('cannot be empty')
    }
  })

  it('should reject content exceeding max length', () => {
    const invalidMessage = {
      itemId: '123e4567-e89b-12d3-a456-426614174000',
      recipientId: '123e4567-e89b-12d3-a456-426614174001',
      content: 'a'.repeat(APP_CONFIG.maxMessageLength + 1),
    }

    const result = sendMessageSchema.safeParse(invalidMessage)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('less than')
    }
  })

  it('should reject invalid UUID for itemId', () => {
    const invalidMessage = {
      itemId: 'not-a-uuid',
      recipientId: '123e4567-e89b-12d3-a456-426614174001',
      content: 'Hello',
    }

    const result = sendMessageSchema.safeParse(invalidMessage)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Invalid item ID')
    }
  })

  it('should reject invalid UUID for recipientId', () => {
    const invalidMessage = {
      itemId: '123e4567-e89b-12d3-a456-426614174000',
      recipientId: 'not-a-uuid',
      content: 'Hello',
    }

    const result = sendMessageSchema.safeParse(invalidMessage)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Invalid recipient ID')
    }
  })

  it('should accept content at max length', () => {
    const validMessage = {
      itemId: '123e4567-e89b-12d3-a456-426614174000',
      recipientId: '123e4567-e89b-12d3-a456-426614174001',
      content: 'a'.repeat(APP_CONFIG.maxMessageLength),
    }

    const result = sendMessageSchema.safeParse(validMessage)
    expect(result.success).toBe(true)
  })

  it('should reject missing required fields', () => {
    const invalidMessage = {
      itemId: '123e4567-e89b-12d3-a456-426614174000',
      // Missing recipientId and content
    }

    const result = sendMessageSchema.safeParse(invalidMessage)
    expect(result.success).toBe(false)
  })
})

