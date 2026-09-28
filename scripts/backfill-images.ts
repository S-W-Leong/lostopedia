/**
 * Backfill Images Script
 * 
 * Populates existing items that don't have images with free images from Unsplash.
 * Maps item categories to relevant search terms and fetches appropriate images.
 * 
 * Usage:
 *   npx tsx scripts/backfill-images.ts
 * 
 * Options:
 *   --dry-run    Show what would be processed without making changes
 *   --limit N    Process only N items (useful for testing)
 * 
 * Requirements:
 *   UNSPLASH_ACCESS_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY
const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SECRET_KEY')
  process.exit(1)
}

if (!unsplashAccessKey) {
  console.error('❌ Missing UNSPLASH_ACCESS_KEY environment variable')
  console.error('   Get a free API key from: https://unsplash.com/developers')
  console.error('   Add it to your .env.local file')
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
 * Map item categories to Unsplash search terms
 */
const categoryToSearchTerm: Record<string, string> = {
  'electronics': 'electronics gadgets',
  'clothing': 'clothing accessories',
  'books': 'books education',
  'jewelry': 'jewelry accessories',
  'keys': 'keys lock',
  'cards': 'cards wallet',
  'bags': 'bags backpack',
  'accessories': 'accessories fashion',
  'containers': 'water bottle lunch box',
  'other': 'objects items',
}

/**
 * Fetch a random image from Unsplash for a given category
 */
async function fetchUnsplashImage(category: string, _itemTitle: string): Promise<string | null> {
  try {
    const searchTerm = categoryToSearchTerm[category] || 'objects'
    
    // Use Unsplash API to get a random photo
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(searchTerm)}&orientation=landscape&content_filter=high`,
      {
        headers: {
          'Authorization': `Client-ID ${unsplashAccessKey}`,
        },
      }
    )

    if (!response.ok) {
      console.log(`   ⚠️  Unsplash API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    
    // Return the regular size image URL (smaller, faster to load)
    return data.urls.regular || data.urls.full
    
  } catch (error) {
    console.log(`   ⚠️  Error fetching image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return null
  }
}

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
 * Process a single item: fetch image and update database
 */
async function processItem(item: ItemToProcess): Promise<boolean> {
  try {
    console.log(`\n📝 Processing: ${item.title}`)
    console.log(`   Category: ${item.category} (${item.type})`)
    console.log(`   ID: ${item.id}`)

    // Fetch image from Unsplash
    console.log('   🖼️  Fetching image from Unsplash...')
    const imageUrl = await fetchUnsplashImage(item.category, item.title)

    if (!imageUrl) {
      console.log('   ❌ Failed to fetch image')
      return false
    }

    console.log(`   ✅ Got image: ${imageUrl.substring(0, 50)}...`)

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
          source: 'unsplash',
          fetched_at: new Date().toISOString(),
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
 * Add delay between API calls to respect rate limits
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Image Backfill Script')
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
        console.log(`   ${index + 1}. [${item.category}] ${item.title}`)
      })
      if (items.length > 10) {
        console.log(`   ... and ${items.length - 10} more`)
      }
      console.log('\n✅ Dry run complete. Use without --dry-run to process items.')
      return
    }

    // Confirm before proceeding
    console.log('\n⚠️  This will make API calls to Unsplash and update the database.')
    console.log('   Unsplash has a rate limit of 50 requests/hour for free tier.')
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...')
    await delay(3000)

    // Process each item
    console.log('\n🔄 Processing items...')
    console.log('=' .repeat(50))

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      console.log(`\n[${i + 1}/${items.length}]`)
      
      const success = await processItem(item)
      
      if (success) {
        successCount++
      } else {
        failCount++
      }

      // Add delay between items to avoid rate limiting
      // Unsplash free tier: 50 requests/hour = ~72 seconds per request
      // We'll use 3 seconds for safety
      if (i < items.length - 1) {
        console.log('   ⏳ Waiting 3s before next item...')
        await delay(3000)
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

    console.log('\n📸 Image Attribution:')
    console.log('   Photos from Unsplash (https://unsplash.com)')
    console.log('   Consider adding attribution in your UI for Unsplash photos')

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

