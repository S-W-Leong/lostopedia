import sharp from 'sharp'

export interface CompressOptions {
  /** Longest edge in pixels; image is scaled to fit within maxEdge x maxEdge. */
  maxEdge: number
  /** WebP quality 1-100. */
  quality: number
}

export interface CompressedImage {
  buffer: Buffer
  contentType: 'image/webp'
  extension: 'webp'
}

/**
 * Resize (never enlarge) and re-encode an image to WebP.
 * EXIF orientation is honored via .rotate(); all other metadata is stripped.
 *
 * The core stays independent of Next.js so it can be tested directly.
 * App code should import `compressImage` from `./compress` instead,
 * which re-exports this with the `server-only` guard applied.
 */
export async function compressImage(
  input: ArrayBuffer | Buffer,
  opts: CompressOptions
): Promise<CompressedImage> {
  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input)

  const buffer = await sharp(inputBuffer)
    .rotate() // apply EXIF orientation, then metadata is dropped by default
    .resize({
      width: opts.maxEdge,
      height: opts.maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: opts.quality })
    .toBuffer()

  return { buffer, contentType: 'image/webp', extension: 'webp' }
}
