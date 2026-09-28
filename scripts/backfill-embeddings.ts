/**
 * Backfill Embeddings Script
 * 
 * Generates AI embeddings for existing items that don't have them yet.
 * This is a one-time migration script to process items created before
 * Phase 5.2 (automatic embedding generation) was implemented.
 * 
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts
 * 
 * Options:
 *   --dry-run    Show what would be processed without making changes
 *   --limit N    Process only N items (useful for testing)
 */

import { createClient } from '@supabase/supabase-js'
import { generateItemEmbedding } from '../src/lib/ai/embeddings'
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
  type: 'lost' | 'found'
  created_at: string
}

/**
 * Fetch items that need embeddings
 */
async function fetchItemsWithoutEmbeddings(): Promise<ItemToProcess[]> {
  console.log('\n🔍 Fetching items without embeddings...')
  
  let query = supabase
    .from('items')
    .select('id, title, description, type, created_at')
    .is('ai_text_embedding', null)
    .is('deleted_at', null)
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
 * Generate and save embedding for a single item
 */
async function processItem(item: ItemToProcess): Promise<boolean> {
  try {
    console.log(`\n📝 Processing: ${item.title} (${item.type})`)
    console.log(`   ID: ${item.id}`)
    console.log(`   Created: ${new Date(item.created_at).toLocaleDateString()}`)

    // Generate embedding
    console.log('   ⚙️  Generating embedding...')
    const embedding = await generateItemEmbedding(item.title, item.description)

    if (!embedding) {
      console.log('   ❌ Failed to generate embedding (API error)')
      return false
    }

    if (isDryRun) {
      console.log('   ✅ Would save embedding (dry run mode)')
      return true
    }

    // Save embedding to database
    console.log('   💾 Saving to database...')
    const { error } = await supabase
      .from('items')
      .update({
        ai_text_embedding: embedding,
        ai_processed_at: new Date().toISOString(),
        ai_version: 'v1',
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
  console.log('🚀 Starting Embedding Backfill Script')
  console.log('=' .repeat(50))
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
  }
  
  if (limit) {
    console.log(`⚠️  Processing limit: ${limit} items`)
  }

  try {
    // Fetch items
    const items = await fetchItemsWithoutEmbeddings()
    
    console.log(`\n📊 Found ${items.length} item(s) without embeddings`)
    
    if (items.length === 0) {
      console.log('\n✨ All items already have embeddings!')
      return
    }

    // Show breakdown by type
    const lostCount = items.filter(i => i.type === 'lost').length
    const foundCount = items.filter(i => i.type === 'found').length
    console.log(`   - Lost items: ${lostCount}`)
    console.log(`   - Found items: ${foundCount}`)

    if (isDryRun) {
      console.log('\n📋 Items that would be processed:')
      items.forEach((item, index) => {
        console.log(`   ${index + 1}. [${item.type.toUpperCase()}] ${item.title}`)
      })
      console.log('\n✅ Dry run complete. Use without --dry-run to process items.')
      return
    }

    // Confirm before proceeding
    console.log('\n⚠️  This will make API calls to HuggingFace and update the database.')
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

      // Add delay between items to avoid rate limiting (2 seconds)
      if (i < items.length - 1) {
        console.log('   ⏳ Waiting 2s before next item...')
        await delay(2000)
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

