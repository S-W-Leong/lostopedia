import { describe, it, expect } from 'vitest'
import { validateItemImage } from '../validate'

function fakeFile(type: string, sizeBytes: number): File {
  return { type, size: sizeBytes } as unknown as File
}

describe('validateItemImage', () => {
  it('accepts a jpeg and returns its extension', () => {
    expect(validateItemImage(fakeFile('image/jpeg', 1024))).toEqual({ extension: 'jpg' })
  })

  it('rejects an unsupported mime type', () => {
    const result = validateItemImage(fakeFile('image/tiff', 1024))
    expect(result.error).toMatch(/JPEG, PNG, WebP/)
  })

  it('rejects a file over the size limit', () => {
    const result = validateItemImage(fakeFile('image/png', 999 * 1024 * 1024))
    expect(result.error).toMatch(/less than/)
  })
})
