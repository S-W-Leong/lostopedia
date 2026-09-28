import { describe, it, expect, vi } from 'vitest'
import sharp from 'sharp'

function makeFakeSupabase(uploads: any[]) {
  return {
    storage: {
      from: () => ({
        upload: (path: string, body: any, opts: any) => {
          uploads.push({ path, body, opts })
          return Promise.resolve({ error: null })
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example/${path}` } }),
        remove: () => Promise.resolve({ error: null }),
      }),
    },
  }
}

async function makeAvatarFile(): Promise<File> {
  const buf = await sharp({
    create: { width: 1500, height: 1500, channels: 3, background: { r: 200, g: 50, b: 50 } },
  }).jpeg().toBuffer()
  const arrayBuffer = new ArrayBuffer(buf.byteLength)
  new Uint8Array(arrayBuffer).set(buf)
  const file = new File([arrayBuffer], 'me.jpg', { type: 'image/jpeg' })
  file.arrayBuffer = async () => arrayBuffer
  return file
}

describe('uploadAvatar', () => {
  it('compresses avatar to webp with 30d cacheControl', async () => {
    // Mock server-only since it throws inside Vitest environment
    vi.mock('server-only', () => ({}))

    const { uploadAvatar } = await import('../storage')
    const uploads: any[] = []
    const supabase = makeFakeSupabase(uploads) as any

    const result = await uploadAvatar('user1', await makeAvatarFile(), supabase)

    expect('url' in result).toBe(true)
    expect(uploads[0].path).toBe('user1/avatar.webp')
    expect(uploads[0].opts.cacheControl).toBe('2592000')
    expect(uploads[0].opts.contentType).toBe('image/webp')
    const meta = await sharp(uploads[0].body).metadata()
    expect(Math.max(meta.width!, meta.height!)).toBe(512)
  })

  it('does not delete or upload avatar objects when compression fails', async () => {
    vi.mock('server-only', () => ({}))
    const { uploadAvatar } = await import('../storage')
    const uploads: any[] = []
    const removals: string[][] = []
    const supabase = {
      storage: {
        from: () => ({
          upload: (path: string, body: any, opts: any) => {
            uploads.push({ path, body, opts })
            return Promise.resolve({ error: null })
          },
          remove: (paths: string[]) => {
            removals.push(paths)
            return Promise.resolve({ error: null })
          },
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example/${path}` } }),
        }),
      },
    } as any
    const invalid = new File([new Uint8Array([1, 2, 3])], 'broken.jpg', { type: 'image/jpeg' })

    const result = await uploadAvatar('user1', invalid, supabase)

    expect(result).toEqual({ error: 'Image compression is temporarily unavailable. Please retry.' })
    expect(uploads).toHaveLength(0)
    expect(removals).toHaveLength(0)
  })
})
