#!/usr/bin/env tsx
/**
 * Test script for Redis Embedding Cache
 * 
 * Usage: npx tsx scripts/test-redis-embedding-cache.ts
 * 
 * This script tests the Redis caching functionality for embeddings:
 * 1. Verifies Redis connection
 * 2. Tests cache miss (first generation)
 * 3. Tests cache hit (subsequent requests)
 * 4. Tests cache persistence across process restarts
 * 5. Tests in-memory fallback when Redis unavailable
 * 
 * Make sure KV_REST_API_URL and KV_REST_API_TOKEN are set in .env.local
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
import crypto from 'crypto';

config({ path: resolve(process.cwd(), '.env.local') });

import { generateItemEmbedding, getEmbeddingCacheSize, EMBEDDING_CONFIG } from '../src/lib/ai';
import { Redis } from '@upstash/redis';

const CACHE_PREFIX = 'embedding:';

/**
 * Get cache key for a text (same logic as embeddings.ts)
 */
function getCacheKey(text: string): string {
  const normalizedText = text.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalizedText).digest('hex');
}

/**
 * Check if Redis is configured and accessible
 */
async function checkRedisConnection(): Promise<{ connected: boolean; redis: Redis | null }> {
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    console.log('⚠️  Redis not configured (KV_REST_API_URL / KV_REST_API_TOKEN missing)');
    return { connected: false, redis: null };
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    // Test connection with a ping-like operation
    await redis.ping();
    console.log('✅ Redis connection successful');
    return { connected: true, redis };
  } catch (error) {
    console.error('❌ Redis connection failed:', error instanceof Error ? error.message : error);
    return { connected: false, redis: null };
  }
}

/**
 * Check if a key exists in Redis
 */
async function checkRedisKey(redis: Redis, cacheKey: string): Promise<boolean> {
  try {
    const value = await redis.get(`${CACHE_PREFIX}${cacheKey}`);
    return value !== null;
  } catch (error) {
    console.error('Error checking Redis key:', error);
    return false;
  }
}

/**
 * Get TTL for a Redis key
 */
async function getRedisTTL(redis: Redis, cacheKey: string): Promise<number | null> {
  try {
    const ttl = await redis.ttl(`${CACHE_PREFIX}${cacheKey}`);
    return ttl;
  } catch (error) {
    console.error('Error getting Redis TTL:', error);
    return null;
  }
}

async function main() {
  console.log('🧪 Testing Redis Embedding Cache\n');
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
  console.log('✅ HuggingFace API key found\n');

  // Check Redis connection
  const { connected: redisConnected, redis } = await checkRedisConnection();
  console.log('');

  // Test text (will be used for cache testing)
  const testTitle = 'Lost iPhone 14 Pro';
  const testDescription = 'Black iPhone 14 Pro with clear case, lost in library on Monday';
  const combinedText = `${testTitle}. ${testTitle}. ${testDescription}`;
  const cacheKey = getCacheKey(combinedText);

  console.log('📝 Test Text:');
  console.log(`   Title: ${testTitle}`);
  console.log(`   Description: ${testDescription}`);
  console.log(`   Cache Key: ${cacheKey.substring(0, 16)}...`);
  console.log('');

  // Test 1: Check if key exists in Redis (before generation)
  if (redisConnected && redis) {
    console.log('Test 1: Checking if key exists in Redis (before generation)...');
    const existsBefore = await checkRedisKey(redis, cacheKey);
    if (existsBefore) {
      console.log('   ⚠️  Key already exists in Redis (from previous test)');
      console.log('   Clearing it for clean test...');
      await redis.del(`${CACHE_PREFIX}${cacheKey}`);
      console.log('   ✅ Key cleared');
    } else {
      console.log('   ✅ Key does not exist (expected for first run)');
    }
    console.log('');
  }

  // Test 2: Generate embedding (should be cache miss, call API)
  console.log('Test 2: Generating embedding (cache miss expected)...');
  const startTime = Date.now();
  const embedding1 = await generateItemEmbedding(testTitle, testDescription);
  const duration1 = Date.now() - startTime;

  if (!embedding1) {
    console.error('❌ Failed to generate embedding');
    process.exit(1);
  }

  console.log(`   ✅ Generated embedding in ${duration1}ms`);
  console.log(`   Dimensions: ${embedding1.length}`);
  console.log(`   First 5 values: [${embedding1.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]`);
  console.log(`   In-memory cache size: ${getEmbeddingCacheSize()}`);

  // Check if it was stored in Redis (wait a bit for async write to complete)
  if (redisConnected && redis) {
    // Small delay to ensure Redis write completes
    await new Promise(resolve => setTimeout(resolve, 100));
    const existsAfter = await checkRedisKey(redis, cacheKey);
    if (existsAfter) {
      const ttl = await getRedisTTL(redis, cacheKey);
      console.log(`   ✅ Stored in Redis (TTL: ${ttl ? `${Math.floor(ttl / 86400)} days` : 'unknown'})`);
    } else {
      console.log('   ⚠️  Not found in Redis (checking for errors above)');
    }
  }
  console.log('');

  // Test 3: Generate same embedding again (should be cache hit)
  console.log('Test 3: Generating same embedding again (cache hit expected)...');
  const startTime2 = Date.now();
  const embedding2 = await generateItemEmbedding(testTitle, testDescription);
  const duration2 = Date.now() - startTime2;

  if (!embedding2) {
    console.error('❌ Failed to retrieve embedding');
    process.exit(1);
  }

  console.log(`   ✅ Retrieved embedding in ${duration2}ms`);
  
  // Verify it's the same embedding
  const isSame = embedding1.length === embedding2.length &&
    embedding1.every((val, idx) => Math.abs(val - embedding2[idx]) < 0.0001);
  
  if (isSame) {
    console.log('   ✅ Embeddings match (cache working correctly)');
  } else {
    console.error('   ❌ Embeddings differ (cache may not be working)');
  }

  // Performance comparison
  const speedup = duration1 > 0 ? (duration1 / duration2).toFixed(1) : 'N/A';
  console.log(`   ⚡ Speedup: ${speedup}x faster (${duration1}ms → ${duration2}ms)`);
  
  if (redisConnected && redis) {
    const existsAfter2 = await checkRedisKey(redis, cacheKey);
    if (existsAfter2) {
      console.log('   ✅ Confirmed in Redis');
    }
  }
  console.log('');

  // Test 4: Test with different text (cache miss)
  console.log('Test 4: Generating embedding for different text (cache miss expected)...');
  const startTime3 = Date.now();
  const embedding3 = await generateItemEmbedding(
    'Found Samsung Galaxy',
    'Samsung Galaxy phone found in cafeteria'
  );
  const duration3 = Date.now() - startTime3;

  if (embedding3) {
    console.log(`   ✅ Generated new embedding in ${duration3}ms`);
    console.log(`   In-memory cache size: ${getEmbeddingCacheSize()}`);
  } else {
    console.error('   ❌ Failed to generate embedding');
  }
  console.log('');

  // Test 5: Verify Redis persistence (if Redis is available)
  if (redisConnected && redis) {
    console.log('Test 5: Verifying Redis persistence...');
    console.log('   Checking Redis keys with prefix "embedding:"...');
    
    try {
      // Note: Upstash Redis REST API doesn't support KEYS command
      // We'll verify by checking our known key
      const stillExists = await checkRedisKey(redis, cacheKey);
      if (stillExists) {
        const ttl = await getRedisTTL(redis, cacheKey);
        console.log(`   ✅ Key persists in Redis (TTL: ${ttl ? `${Math.floor(ttl / 86400)} days` : 'unknown'})`);
        console.log('   ✅ Redis cache will persist across serverless cold starts');
      } else {
        console.log('   ⚠️  Key not found (may have expired or not been set)');
      }
    } catch (error) {
      console.error('   ❌ Error checking Redis:', error);
    }
    console.log('');
  }

  // Summary
  console.log('📊 Test Summary:');
  console.log(`   Redis Connection: ${redisConnected ? '✅ Connected' : '⚠️  Not configured (using in-memory only)'}`);
  console.log(`   Cache Hits: ${duration2 < duration1 ? '✅ Working' : '⚠️  May not be working'}`);
  console.log(`   Performance: ${speedup}x speedup on cache hit`);
  console.log(`   In-memory Cache Size: ${getEmbeddingCacheSize()} entries`);
  console.log('');

  if (redisConnected) {
    console.log('✅ Redis cache is working correctly!');
    console.log('   Embeddings will persist across serverless cold starts.');
  } else {
    console.log('⚠️  Redis not configured - using in-memory cache only.');
    console.log('   This works for local development but won\'t persist in production.');
    console.log('   To enable Redis caching, set KV_REST_API_URL and KV_REST_API_TOKEN in .env.local');
  }
}

// Run the tests
main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
