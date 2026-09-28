#!/usr/bin/env tsx
/**
 * Test script for HuggingFace embeddings service
 * 
 * Usage: npx tsx scripts/test-embeddings.ts
 * 
 * This script tests the embeddings service with real API calls
 * Make sure HUGGINGFACE_API_KEY is set in .env.local
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { generateItemEmbedding, getEmbeddingCacheSize, EMBEDDING_CONFIG } from '../src/lib/ai';

async function main() {
  console.log('🚀 Testing HuggingFace Embeddings Service\n');
  console.log('Configuration:');
  console.log('  Model:', EMBEDDING_CONFIG.model);
  console.log('  Dimensions:', EMBEDDING_CONFIG.dimensions);
  console.log('  Provider:', EMBEDDING_CONFIG.provider);
  console.log('');

  // Check API key
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.error('❌ HUGGINGFACE_API_KEY not found in environment');
    console.error('   Add it to your .env.local file');
    process.exit(1);
  }
  console.log('✅ API key found\n');

  // Test 1: Generate embedding for a lost item
  console.log('Test 1: Generating embedding for lost item...');
  const lostEmbedding = await generateItemEmbedding(
    'Lost blue backpack',
    'Blue Nike backpack with laptop inside, lost near library on Monday afternoon'
  );

  if (lostEmbedding) {
    console.log(`✅ Generated embedding with ${lostEmbedding.length} dimensions`);
    console.log(`   First 5 values: [${lostEmbedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]`);
    console.log(`   Cache size: ${getEmbeddingCacheSize()}`);
  } else {
    console.error('❌ Failed to generate embedding');
  }
  console.log('');

  // Test 2: Test caching (should be instant)
  console.log('Test 2: Testing cache (same text)...');
  const startTime = Date.now();
  const cachedEmbedding = await generateItemEmbedding(
    'Lost blue backpack',
    'Blue Nike backpack with laptop inside, lost near library on Monday afternoon'
  );
  const duration = Date.now() - startTime;

  if (cachedEmbedding) {
    console.log(`✅ Retrieved from cache in ${duration}ms`);
    console.log(`   Cache size: ${getEmbeddingCacheSize()}`);
  } else {
    console.error('❌ Failed to retrieve from cache');
  }
  console.log('');

  // Test 3: Generate embedding for a found item
  console.log('Test 3: Generating embedding for found item...');
  const foundEmbedding = await generateItemEmbedding(
    'Found blue bag',
    'Blue backpack found in the library, contains a laptop'
  );

  if (foundEmbedding) {
    console.log(`✅ Generated embedding with ${foundEmbedding.length} dimensions`);
    console.log(`   First 5 values: [${foundEmbedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]`);
    console.log(`   Cache size: ${getEmbeddingCacheSize()}`);
  } else {
    console.error('❌ Failed to generate embedding');
  }
  console.log('');

  // Test 4: Calculate similarity (simple cosine similarity)
  if (lostEmbedding && foundEmbedding) {
    console.log('Test 4: Calculating similarity between lost and found items...');
    const similarity = cosineSimilarity(lostEmbedding, foundEmbedding);
    console.log(`✅ Similarity score: ${(similarity * 100).toFixed(2)}%`);
    
    if (similarity > 0.7) {
      console.log('   🎉 High match! These items are very similar');
    } else if (similarity > 0.5) {
      console.log('   👍 Moderate match - worth investigating');
    } else {
      console.log('   🤔 Low match - probably different items');
    }
  }
  console.log('');

  console.log('✅ All tests complete!');
  console.log(`   Final cache size: ${getEmbeddingCacheSize()} entries`);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Run the tests
main().catch(console.error);

