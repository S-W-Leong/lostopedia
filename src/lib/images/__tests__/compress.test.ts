import { describe, it, expect, vi } from 'vitest'
import sharp from 'sharp'

vi.mock('server-only', () => ({}))

import { compressImage } from '../compress'

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 80, b: 200 } },
  }).png().toBuffer()
}

describe('compressImage', () => {
  it('resizes down to maxEdge, outputs webp, and shrinks bytes', async () => {
    const original = await makePng(3000, 2000)
    const result = await compressImage(original, { maxEdge: 1600, quality: 85 })

    expect(result.contentType).toBe('image/webp')
    expect(result.extension).toBe('webp')

    const meta = await sharp(result.buffer).metadata()
    expect(meta.format).toBe('webp')
    expect(Math.max(meta.width!, meta.height!)).toBe(1600)
    expect(result.buffer.length).toBeLessThan(original.length)
  })

  it('does not enlarge images already smaller than maxEdge', async () => {
    const original = await makePng(400, 300)
    const result = await compressImage(original, { maxEdge: 1600, quality: 85 })
    const meta = await sharp(result.buffer).metadata()
    expect(meta.width).toBe(400)
    expect(meta.height).toBe(300)
  })

  it('accepts an ArrayBuffer input', async () => {
    const original = await makePng(800, 600)
    const ab = original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength)
    const result = await compressImage(ab as ArrayBuffer, { maxEdge: 512, quality: 80 })
    expect(result.contentType).toBe('image/webp')
  })
})
