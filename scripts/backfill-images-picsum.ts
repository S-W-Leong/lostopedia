/**
 * Backfill Images Script (Picsum/Placeholder Version)
 * 
 * Populates existing items that don't have images with placeholder images.
 * Uses Lorem Picsum (no API key required!) for instant image population.
 * 
 * Usage:
 *   npx tsx scripts/backfill-images-picsum.ts
 * 
 * Options:
 *   --dry-run    Show what would be processed without making changes
 *   --limit N    Process only N items (useful for testing)
 * 
 * Requirements:
 *   NO API KEY NEEDED! Perfect for quick hackathon demos.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Get environment variables
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

interface ItemToProcess {
  id: string
  title: string
  description: string
  category: string
  type: 'lost' | 'found'
  created_at: string
}

/**
 * Map categories to image IDs/themes for consistent, relevant images
 * Using Lorem Picsum's category system
 */
const categoryImageConfig: Record<string, { seed: string; width: number; height: number }> = {
  'electronics': { seed: 'electronics-tech', width: 800, height: 600 },
  'clothing': { seed: 'fashion-clothes', width: 800, height: 600 },
  'books': { seed: 'books-reading', width: 800, height: 600 },
  'jewelry': { seed: 'jewelry-gems', width: 800, height: 600 },
  'keys': { seed: 'keys-security', width: 800, height: 600 },
  'cards': { seed: 'cards-wallet', width: 800, height: 600 },
  'bags': { seed: 'bags-backpack', width: 800, height: 600 },
  'accessories': { seed: 'accessories', width: 800, height: 600 },
  'containers': { seed: 'containers-bottles', width: 800, height: 600 },
  'other': { seed: 'objects-items', width: 800, height: 600 },
}

/**
 * Generate a consistent image URL for an item using Lorem Picsum
 * Uses the item's ID as part of the seed for consistency
 */
function generateImageUrl(category: string, itemId: string): string {
  const config = categoryImageConfig[category] || categoryImageConfig['other']
  
  // Use seed for consistent images - combining category seed with item ID
  // This ensures the same item always gets the same image
  const seed = `${config.seed}-${itemId.substring(0, 8)}`
  
  // Lorem Picsum URL format: https://picsum.photos/seed/{seed}/{width}/{height}
  return `https://picsum.photos/seed/${seed}/${config.width}/${config.height}`
}

/**
 * Alternative: Use specific Picsum image IDs for more control
 * Uncomment this function and swap it in if you prefer specific images per category
 */
/*
function generateImageUrlById(category: string, itemIndex: number): string {
  // Map categories to ranges of image IDs
  const categoryImageRanges: Record<string, { start: number; end: number }> = {
    'electronics': { start: 1, end: 100 },
    'clothing': { start: 101, end: 200 },
    'books': { start: 201, end: 300 },
    'jewelry': { start: 301, end: 400 },
    'keys': { start: 401, end: 500 },
    'cards': { start: 501, end: 600 },
    'bags': { start: 601, end: 700 },
    'accessories': { start: 701, end: 800 },
    'other': { start: 801, end: 900 },
  }
  
  const range = categoryImageRanges[category] || categoryImageRanges['other']
  const imageId = range.start + (itemIndex % (range.end - range.start))
  
  return `https://picsum.photos/id/${imageId}/800/600`
}
*/

/**
 * Fetch items that need images
 */
async function fetchItemsWithoutImages(): Promise<ItemToProcess[]> {
  console.log('\n🔍 Fetching items without images...')
  
  let query = supabase
    .from('items')
    .select('id, title, description, category, type, created_at')
    .is('image_url', null)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch items: ${error.message}`)
  }

  return data as ItemToProcess[]
}

/**
 * Process a single item: generate image URL and update database
 */
async function processItem(item: ItemToProcess, _index: number): Promise<boolean> {
  try {
    console.log(`\n📝 Processing: ${item.title}`)
    console.log(`   Category: ${item.category} (${item.type})`)
    console.log(`   ID: ${item.id}`)

    // Generate image URL (no API call needed!)
    const imageUrl = generateImageUrl(item.category, item.id)
    console.log(`   🖼️  Generated image URL: ${imageUrl}`)

    if (isDryRun) {
      console.log('   ✅ Would save image URL (dry run mode)')
      return true
    }

    // Save image URL to database
    console.log('   💾 Saving to database...')
    const { error } = await supabase
      .from('items')
      .update({
        image_url: imageUrl,
        image_metadata: {
          urls: [imageUrl],
          source: 'picsum',
          category_seed: categoryImageConfig[item.category]?.seed || 'objects-items',
          generated_at: new Date().toISOString(),
        },
      })
      .eq('id', item.id)

    if (error) {
      console.log(`   ❌ Failed to save: ${error.message}`)
      return false
    }

    console.log('   ✅ Successfully processed')
    return true

  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return false
  }
}

/**
 * Add small delay for visual feedback (not needed for rate limiting)
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Image Backfill Script (Picsum)')
  console.log('=' .repeat(50))
  console.log('📸 Using Lorem Picsum - No API key required!')
  console.log('=' .repeat(50))
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
  }
  
  if (limit) {
    console.log(`⚠️  Processing limit: ${limit} items`)
  }

  try {
    // Fetch items
    const items = await fetchItemsWithoutImages()
    
    console.log(`\n📊 Found ${items.length} item(s) without images`)
    
    if (items.length === 0) {
      console.log('\n✨ All items already have images!')
      return
    }

    // Show breakdown by category
    const categoryBreakdown = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('\n📋 Items by category:')
    Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`   - ${category}: ${count}`)
      })

    if (isDryRun) {
      console.log('\n📋 Sample items that would be processed:')
      items.slice(0, 10).forEach((item, index) => {
        const url = generateImageUrl(item.category, item.id)
        console.log(`   ${index + 1}. [${item.category}] ${item.title}`)
        console.log(`      → ${url}`)
      })
      if (items.length > 10) {
        console.log(`   ... and ${items.length - 10} more`)
      }
      console.log('\n✅ Dry run complete. Use without --dry-run to process items.')
      return
    }

    // Confirm before proceeding
    console.log('\n⚠️  This will update the database with Lorem Picsum image URLs.')
    console.log('   These are placeholder images - perfect for demos and hackathons!')
    console.log('   Press Ctrl+C to cancel, or wait 2 seconds to continue...')
    await delay(2000)

    // Process each item
    console.log('\n🔄 Processing items...')
    console.log('=' .repeat(50))

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      console.log(`\n[${i + 1}/${items.length}]`)
      
      const success = await processItem(item, i)
      
      if (success) {
        successCount++
      } else {
        failCount++
      }

      // Small delay for visual feedback (not rate-limited!)
      if (i < items.length - 1 && i % 10 === 9) {
        console.log('   ⏳ Quick pause...')
        await delay(500)
      }
    }

    // Summary
    console.log('\n' + '=' .repeat(50))
    console.log('📊 SUMMARY')
    console.log('=' .repeat(50))
    console.log(`Total items: ${items.length}`)
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${failCount}`)
    console.log(`📈 Success rate: ${((successCount / items.length) * 100).toFixed(1)}%`)

    if (failCount > 0) {
      console.log('\n⚠️  Some items failed to process. You can run this script again to retry failed items.')
    } else {
      console.log('\n✨ All items processed successfully!')
    }

    console.log('\n📸 About Lorem Picsum:')
    console.log('   - Free, high-quality placeholder images')
    console.log('   - No API key or rate limits')
    console.log('   - Consistent images using seed-based URLs')
    console.log('   - Perfect for demos, prototypes, and hackathons!')
    console.log('   - Learn more: https://picsum.photos')

  } catch (error) {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
main()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })

