import 'server-only'
import { createClient } from './client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { validateItemImage } from '../images/validate'
import { compressImage } from '../images/compress'

export const IMAGE_COMPRESSION_UNAVAILABLE =
  'Image compression is temporarily unavailable. Please retry.'

/**
 * Upload avatar image to Supabase Storage
 * Files are stored in: avatars/{userId}/avatar.{ext}
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  supabaseClient?: SupabaseClient
): Promise<{ url: string } | { error: string }> {
  const supabase = supabaseClient || createClient()

  // Validate file and get proper extension based on MIME type
  const validation = validateItemImage(file)
  if (validation.error) {
    return { error: validation.error }
  }

  const startedAt = Date.now()
  let body: Buffer
  try {
    const arrayBuffer = typeof file.arrayBuffer === 'function'
      ? await file.arrayBuffer()
      : await new Response(file as any).arrayBuffer()
    const compressed = await compressImage(arrayBuffer, { maxEdge: 512, quality: 80 })
    body = compressed.buffer
  } catch (err) {
    console.error('[ImageCompression]', {
      route: '/api/profile/avatar',
      inputMimeType: file.type,
      inputBytes: file.size,
      durationMs: Date.now() - startedAt,
      failureStage: 'compress',
      error: err instanceof Error ? err.message : 'Unknown compression error',
    })
    return { error: IMAGE_COMPRESSION_UNAVAILABLE }
  }

  // Remove existing variants only after compression succeeds.
  await supabase.storage.from('avatars').remove([
    `${userId}/avatar.webp`,
    `${userId}/avatar.jpg`,
    `${userId}/avatar.png`,
    `${userId}/avatar.gif`,
  ])

  const fileName = `${userId}/avatar.webp`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, body, {
      cacheControl: '2592000',
      upsert: true,
      contentType: 'image/webp',
    })

  if (uploadError) {
    console.error('Avatar upload error:', uploadError)
    const message =
      uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket')
        ? 'Storage bucket is not set up. Please create an "avatars" bucket in Supabase with policies allowing authenticated uploads.'
        : uploadError.message?.includes('policy') || uploadError.message?.includes('row-level security')
          ? 'Permission denied. Ensure the avatars bucket has a policy allowing users to upload to their own folder (avatars/{user_id}/*).'
          : uploadError.message?.includes('Payload too large')
            ? 'Image is too large. Please use an image under 5MB.'
            : uploadError.message || 'Failed to upload image. Please try again.'
    return { error: message }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(fileName)

  // Stable version param (persisted to users.avatar_url), busts long cache on change.
  return { url: `${publicUrl}?t=${Date.now()}` }
}

/**
 * Delete avatar from Supabase Storage
 */
export async function deleteAvatar(
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<{ error?: string }> {
  const supabase = supabaseClient || createClient()

  // List files in user's folder
  const { data: files } = await supabase.storage.from('avatars').list(userId)

  if (files && files.length > 0) {
    const filePaths = files.map((f) => `${userId}/${f.name}`)
    const { error } = await supabase.storage.from('avatars').remove(filePaths)

    if (error) {
      return { error: 'Failed to delete avatar' }
    }
  }

  return {}
}



/**
 * Get the highest 1-based image index for an item (0 if none).
 */
export async function getItemImageMaxIndex(
  userId: string,
  itemId: string,
  supabaseClient?: SupabaseClient
): Promise<number> {
  const supabase = supabaseClient || createClient()

  const { data: files } = await supabase.storage
    .from('item-images')
    .list(userId)

  if (!files || files.length === 0) return 0

  let max = 0
  for (const f of files) {
    if (!f.name.startsWith(`${itemId}_`)) continue
    const part = f.name.split('_')[1]
    const num = parseInt(part?.split('.')[0] || '0', 10)
    if (!Number.isNaN(num) && num > max) max = num
  }
  return max
}

/**
 * Upload multiple item images to Supabase Storage
 * Files are stored in: item-images/{userId}/{itemId}_{index}.{ext}
 * startIndex: 1-based index for first file (default 1). Use when appending.
 * Returns array of public URLs or error
 */
export async function uploadItemImages(
  userId: string,
  itemId: string,
  files: File[],
  supabaseClient?: SupabaseClient,
  startIndex: number = 1
): Promise<{ urls: string[] } | { error: string }> {
  const supabase = supabaseClient || createClient()

  // Validate number of files
  if (files.length === 0) {
    return { error: 'No files provided' }
  }

  if (files.length > 3) {
    return { error: 'Maximum 3 images allowed per item' }
  }

  // Validate each file and collect extensions
  const validatedFiles: Array<{ file: File; extension: string }> = []
  for (const file of files) {
    const validation = validateItemImage(file)
    if (validation.error) {
      return { error: validation.error }
    }
    validatedFiles.push({ file, extension: validation.extension! })
  }

  // One shared version stamp for this upload call. Stable across renders;
  // changes only when images are (re)uploaded, so a 30-day cache is safe.
  const version = Date.now()

  // Upload each file
  const uploadedUrls: string[] = []
  const uploadedPaths: string[] = []

  for (let i = 0; i < validatedFiles.length; i++) {
    const { file } = validatedFiles[i]

    const startedAt = Date.now()
    let body: Buffer
    try {
      const arrayBuffer = typeof file.arrayBuffer === 'function'
        ? await file.arrayBuffer()
        : await new Response(file as any).arrayBuffer()
      const compressed = await compressImage(arrayBuffer, {
        maxEdge: 1600,
        quality: 85,
      })
      body = compressed.buffer
      if (body.length > 2 * 1024 * 1024) {
        console.warn('[ImageCompression] Large output', {
          route: '/api/items',
          inputMimeType: file.type,
          inputBytes: file.size,
          outputBytes: body.length,
          thresholdBytes: 2 * 1024 * 1024,
        })
      }
    } catch (err) {
      console.error('[ImageCompression]', {
        route: '/api/items',
        inputMimeType: file.type,
        inputBytes: file.size,
        durationMs: Date.now() - startedAt,
        failureStage: 'compress',
        error: err instanceof Error ? err.message : 'Unknown compression error',
      })
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('item-images').remove(uploadedPaths)
      }
      return { error: IMAGE_COMPRESSION_UNAVAILABLE }
    }

    const fileName = `${userId}/${itemId}_${startIndex + i}.webp`

    const { error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(fileName, body, {
        cacheControl: '2592000',
        upsert: true,
        contentType: 'image/webp',
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('item-images').remove(uploadedPaths)
      }
      return { error: `Failed to upload image ${i + 1}. Please try again.` }
    }

    uploadedPaths.push(fileName)

    const {
      data: { publicUrl },
    } = supabase.storage.from('item-images').getPublicUrl(fileName)

    // Stable version param: busts the long cache only when images actually change.
    uploadedUrls.push(`${publicUrl}?v=${version}`)
  }

  return { urls: uploadedUrls }
}

/**
 * Delete all images for a specific item
 */
export async function deleteItemImages(
  userId: string,
  itemId: string,
  supabaseClient?: SupabaseClient
): Promise<{ error?: string }> {
  const supabase = supabaseClient || createClient()

  // List all files in user's folder
  const { data: files } = await supabase.storage
    .from('item-images')
    .list(userId)

  if (!files || files.length === 0) {
    return {}
  }

  // Filter files that belong to this item
  const itemFiles = files.filter((f) => f.name.startsWith(`${itemId}_`))

  if (itemFiles.length > 0) {
    const filePaths = itemFiles.map((f) => `${userId}/${f.name}`)
    const { error } = await supabase.storage
      .from('item-images')
      .remove(filePaths)

    if (error) {
      console.error('Delete error:', error)
      return { error: 'Failed to delete item images' }
    }
  }

  return {}
}

/**
 * Delete a specific item image by index
 */
export async function deleteItemImage(
  userId: string,
  itemId: string,
  imageIndex: number,
  supabaseClient?: SupabaseClient
): Promise<{ error?: string }> {
  const supabase = supabaseClient || createClient()

  // List all files to find the one with the matching index
  const { data: files } = await supabase.storage
    .from('item-images')
    .list(userId)

  if (!files || files.length === 0) {
    return { error: 'No images found' }
  }

  // Find file with matching item ID and index
  const targetFile = files.find((f) =>
    f.name.startsWith(`${itemId}_${imageIndex}.`)
  )

  if (!targetFile) {
    return { error: 'Image not found' }
  }

  const filePath = `${userId}/${targetFile.name}`
  const { error } = await supabase.storage.from('item-images').remove([filePath])

  if (error) {
    console.error('Delete error:', error)
    return { error: 'Failed to delete image' }
  }

  return {}
}

/**
 * Get all image URLs for a specific item
 */
export async function getItemImageUrls(
  userId: string,
  itemId: string,
  supabaseClient?: SupabaseClient
): Promise<{ urls: string[] } | { error: string }> {
  const supabase = supabaseClient || createClient()

  const { data: files, error } = await supabase.storage
    .from('item-images')
    .list(userId)

  if (error) {
    console.error('List error:', error)
    return { error: 'Failed to fetch images' }
  }

  if (!files || files.length === 0) {
    return { urls: [] }
  }

  // Filter and sort files by index
  const itemFiles = files
    .filter((f) => f.name.startsWith(`${itemId}_`))
    .sort((a, b) => {
      const indexA = parseInt(a.name.split('_')[1] || '0')
      const indexB = parseInt(b.name.split('_')[1] || '0')
      return indexA - indexB
    })

  const urls = itemFiles.map((f) => {
    const {
      data: { publicUrl },
    } = supabase.storage.from('item-images').getPublicUrl(`${userId}/${f.name}`)
    return publicUrl
  })

  return { urls }
}
