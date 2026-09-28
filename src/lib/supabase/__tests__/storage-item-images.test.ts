import { describe, it, expect, vi } from 'vitest'
import sharp from 'sharp'

// Build a fake Supabase storage client that records upload options.
function makeFakeSupabase(uploads: any[]) {
  return {
    storage: {
      from: (_bucket: string) => ({
        upload: (path: string, body: any, opts: any) => {
          uploads.push({ path, body, opts })
          return Promise.resolve({ error: null })
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.example/${path}` },
        }),
        remove: () => Promise.resolve({ error: null }),
      }),
    },
  }
}

async function makeJpegFile(): Promise<File> {
  const buf = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: { r: 10, g: 20, b: 30 } },
  }).jpeg().toBuffer()
  const arrayBuffer = new ArrayBuffer(buf.byteLength)
  new Uint8Array(arrayBuffer).set(buf)
  const file = new File([arrayBuffer], 'photo.jpg', { type: 'image/jpeg' })
  file.arrayBuffer = async () => arrayBuffer
  return file
}

describe('uploadItemImages', () => {
  it('compresses to webp, sets 30d cacheControl, and appends a version param', async () => {
    // Mock server-only since it throws inside Vitest environment
    vi.mock('server-only', () => ({}))

    const { uploadItemImages } = await import('../storage')
    const uploads: any[] = []
    const supabase = makeFakeSupabase(uploads) as any

    const file = await makeJpegFile()
    const result = await uploadItemImages('user1', 'item1', [file], supabase, 1)

    expect('urls' in result).toBe(true)
    // stored as .webp
    expect(uploads[0].path).toBe('user1/item1_1.webp')
    // long cache
    expect(uploads[0].opts.cacheControl).toBe('2592000')
    expect(uploads[0].opts.contentType).toBe('image/webp')
    // uploaded body is smaller than the original file
    expect(uploads[0].body.length).toBeLessThan(file.size)
    // returned URL carries a stable version param
    const url = (result as { urls: string[] }).urls[0]
    expect(url).toMatch(/^https:\/\/cdn\.example\/user1\/item1_1\.webp\?v=\d+$/)
  })

  it('uploads zero original bytes when compression fails', async () => {
    vi.mock('server-only', () => ({}))
    const { uploadItemImages } = await import('../storage')
    const uploads: any[] = []
    const supabase = makeFakeSupabase(uploads) as any
    const invalid = new File([new Uint8Array([1, 2, 3])], 'broken.jpg', { type: 'image/jpeg' })

    const result = await uploadItemImages('user1', 'item1', [invalid], supabase, 1)

    expect(result).toEqual({ error: 'Image compression is temporarily unavailable. Please retry.' })
    expect(uploads).toHaveLength(0)
  })
})
