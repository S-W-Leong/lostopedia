/**
 * Backfill Compress Images Script
 *
 * Re-compresses existing objects in the `item-images` and `avatars` Storage
 * buckets to WebP, and re-uploads them to the SAME object path with a 30-day
 * cacheControl. Because the path doesn't change, no database update is
 * needed — every items.image_url / users.avatar_url already stored keeps
 * working, now serving the compressed bytes.
 *
 * This is a one-off migration for objects uploaded before sharp compression
 * was fixed in production (see next.config.ts serverExternalPackages).
 *
 * Usage:
 *   npx tsx scripts/backfill-compress-images.ts
 *
 * Options:
 *   --dry-run    Show what would be processed without making changes
 *   --limit N    Process only N objects (useful for testing)
 *   --bucket B   Only process one bucket: item-images | avatars
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { compressImage } from '../src/lib/images/compress-core'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SECRET_KEY')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const limitIndex = args.indexOf('--limit')
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : undefined
const bucketIndex = args.indexOf('--bucket')
const bucketFilter = bucketIndex !== -1 ? args[bucketIndex + 1] : undefined

const CACHE_CONTROL = '2592000' // 30 days

const BUCKET_CONFIG: Record<string, { maxEdge: number; quality: number }> = {
  'item-images': { maxEdge: 1600, quality: 85 },
  avatars: { maxEdge: 512, quality: 80 },
}

interface StorageObjectRow {
  bucket_id: string
  name: string // full path within the bucket, e.g. "{userId}/{itemId}_1.jpg"
  metadata: { size?: number; mimetype?: string } | null
}

/**
 * List every object in a bucket. Storage has no real directories — the
 * client's top-level `.list('')` returns each user's folder as a pseudo-entry
 * with `id: null`; we list one level into each of those to reach real files
 * (matches the `{userId}/{filename}` layout used by uploadItemImages/uploadAvatar).
 */
async function listAllObjectsInBucket(bucketId: string): Promise<StorageObjectRow[]> {
  const { data: topLevel, error: topLevelError } = await supabase.storage
    .from(bucketId)
    .list('', { limit: 1000 })

  if (topLevelError) {
    throw new Error(`Failed to list bucket "${bucketId}": ${topLevelError.message}`)
  }

  const rows: StorageObjectRow[] = []

  for (const entry of topLevel || []) {
    if (entry.id !== null) {
      // A file sitting directly at bucket root (unexpected for this app, but handle it).
      rows.push({ bucket_id: bucketId, name: entry.name, metadata: entry.metadata as any })
      continue
    }

    // A folder pseudo-entry — list its contents.
    const { data: files, error: filesError } = await supabase.storage
      .from(bucketId)
      .list(entry.name, { limit: 1000 })

    if (filesError) {
      console.log(`   ⚠️  Failed to list folder "${entry.name}": ${filesError.message}`)
      continue
    }

    for (const file of files || []) {
      if (file.id === null) continue // nested folder; this app doesn't nest further
      rows.push({ bucket_id: bucketId, name: `${entry.name}/${file.name}`, metadata: file.metadata as any })
    }
  }

  return rows
}

/**
 * Fetch objects to backfill. Skips objects that are already WebP — a
 * previous run (or one of the 3 pre-existing webp files) already handled
 * them, so re-processing would just waste time and egress downloading them.
 */
async function fetchObjectsToProcess(): Promise<StorageObjectRow[]> {
  console.log('\n🔍 Fetching storage objects to backfill...')

  const buckets = bucketFilter ? [bucketFilter] : ['item-images', 'avatars']

  const all: StorageObjectRow[] = []
  for (const bucket of buckets) {
    all.push(...(await listAllObjectsInBucket(bucket)))
  }

  const toProcess = all.filter((o) => !o.name.toLowerCase().endsWith('.webp'))

  return limit ? toProcess.slice(0, limit) : toProcess
}

/**
 * Download, compress, and re-upload a single object to the same path.
 * Returns the before/after byte sizes, or null on failure.
 */
async function processObject(
  obj: StorageObjectRow
): Promise<{ before: number; after: number } | null> {
  const config = BUCKET_CONFIG[obj.bucket_id]
  if (!config) {
    console.log(`   ⚠️  Unknown bucket "${obj.bucket_id}", skipping`)
    return null
  }

  const before = obj.metadata?.size ?? 0

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from(obj.bucket_id)
    .download(obj.name)

  if (downloadError || !fileBlob) {
    console.log(`   ❌ Download failed: ${downloadError?.message}`)
    return null
  }

  let compressed
  try {
    const arrayBuffer = await fileBlob.arrayBuffer()
    compressed = await compressImage(arrayBuffer, {
      maxEdge: config.maxEdge,
      quality: config.quality,
    })
  } catch (err) {
    console.log(`   ❌ Compression failed: ${err instanceof Error ? err.message : err}`)
    return null
  }

  if (isDryRun) {
    return { before, after: compressed.buffer.length }
  }

  // Re-upload to the SAME path so every stored image_url/avatar_url keeps working.
  const { error: uploadError } = await supabase.storage
    .from(obj.bucket_id)
    .upload(obj.name, compressed.buffer, {
      cacheControl: CACHE_CONTROL,
      upsert: true,
      contentType: compressed.contentType,
    })

  if (uploadError) {
    console.log(`   ❌ Re-upload failed: ${uploadError.message}`)
    return null
  }

  return { before, after: compressed.buffer.length }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  console.log('🚀 Starting Image Compression Backfill')
  console.log('='.repeat(50))

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
  }
  if (limit) {
    console.log(`⚠️  Processing limit: ${limit} object(s)`)
  }
  if (bucketFilter) {
    console.log(`📦 Bucket filter: ${bucketFilter}`)
  }

  const objects = await fetchObjectsToProcess()

  console.log(`\n📊 Found ${objects.length} object(s) to backfill`)

  if (objects.length === 0) {
    console.log('\n✨ Nothing to do — all objects are already WebP!')
    return
  }

  const bucketBreakdown = objects.reduce((acc, o) => {
    acc[o.bucket_id] = (acc[o.bucket_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\n📋 Objects by bucket:')
  Object.entries(bucketBreakdown).forEach(([bucket, count]) => {
    console.log(`   - ${bucket}: ${count}`)
  })

  if (!isDryRun) {
    console.log('\n⚠️  This will download, compress, and re-upload every object above.')
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...')
    await delay(3000)
  }

  console.log('\n🔄 Processing objects...')
  console.log('='.repeat(50))

  let successCount = 0
  let failCount = 0
  let totalBefore = 0
  let totalAfter = 0

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i]
    console.log(`\n[${i + 1}/${objects.length}] ${obj.bucket_id}/${obj.name}`)

    const result = await processObject(obj)

    if (result) {
      successCount++
      totalBefore += result.before
      totalAfter += result.after
      const pct = result.before > 0 ? (100 * (1 - result.after / result.before)).toFixed(0) : '0'
      console.log(`   ✅ ${formatBytes(result.before)} → ${formatBytes(result.after)} (-${pct}%)`)
    } else {
      failCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 SUMMARY')
  console.log('='.repeat(50))
  console.log(`Total objects: ${objects.length}`)
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📦 Total size: ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)}`)
  if (totalBefore > 0) {
    console.log(`📉 Reduction: ${(100 * (1 - totalAfter / totalBefore)).toFixed(1)}%`)
  }

  if (isDryRun) {
    console.log('\n✅ Dry run complete. Re-run without --dry-run to apply changes.')
  } else if (failCount > 0) {
    console.log('\n⚠️  Some objects failed. Re-run the script to retry (already-webp objects are skipped).')
  } else {
    console.log('\n✨ All objects backfilled successfully!')
  }
}

main()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })
