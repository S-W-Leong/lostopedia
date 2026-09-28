/**
 * HuggingFace Embeddings Service
 * 
 * Generates text embeddings using HuggingFace Inference API
 * Model: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
 * 
 * Uses Redis for persistent caching in production, in-memory cache as fallback
 */

import { HfInference } from '@huggingface/inference';
import { createHash } from 'crypto';
import { Redis } from '@upstash/redis';

// In-memory cache for embeddings (fallback when Redis unavailable)
const embeddingCache = new Map<string, number[]>();

// Initialize Upstash Redis client for production caching (lazy initialization)
let redis: Redis | null = null;
let redisInitialized = false;

/**
 * Initialize Redis connection (called lazily on first use)
 */
function initializeRedis(): void {
  if (redisInitialized) return;
  
  redisInitialized = true;
  
  try {
    // Vercel "Upstash for Redis" integration uses KV_REST_API_URL / KV_REST_API_TOKEN.
    const redisUrl = process.env.KV_REST_API_URL;
    const redisToken = process.env.KV_REST_API_TOKEN;

    if (redisUrl && redisToken) {
      redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      console.log('[Embeddings] ✅ Redis cache initialized');
    } else {
      console.log('[Embeddings] ⚠️ Redis not configured, using in-memory cache only (local dev)');
    }
  } catch (error) {
    console.error('[Embeddings] Failed to initialize Redis cache:', error);
    redis = null;
  }
}

// Constants
const MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSIONS = 384;
const REQUEST_TIMEOUT = 30000; // 30 seconds
const CACHE_PREFIX = 'embedding:';
const CACHE_TTL = 86400 * 7; // 7 days in seconds

/**
 * Generate a cache key from text (normalized and hashed)
 * Uses SHA-256 hash to prevent collisions and ensure consistent key size
 */
function getCacheKey(text: string): string {
  const normalizedText = text.trim().toLowerCase();
  // Use SHA-256 hash to create a unique, fixed-size key
  return createHash('sha256').update(normalizedText).digest('hex');
}

/**
 * Validate embedding dimensions
 */
function validateEmbedding(embedding: unknown): embedding is number[] {
  if (!Array.isArray(embedding)) {
    return false;
  }
  
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    console.error(`[Embeddings] Invalid dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`);
    return false;
  }
  
  if (!embedding.every(val => typeof val === 'number' && !isNaN(val))) {
    console.error('[Embeddings] Invalid embedding values: not all numbers');
    return false;
  }
  
  return true;
}

/**
 * Get cached embedding from Redis or in-memory cache
 */
async function getCachedEmbedding(cacheKey: string): Promise<number[] | null> {
  // Initialize Redis on first use
  initializeRedis();
  
  // Try Redis first (production)
  if (redis) {
    try {
      const cached = await redis.get<number[]>(`${CACHE_PREFIX}${cacheKey}`);
      if (cached && validateEmbedding(cached)) {
        // Also update in-memory cache for faster subsequent access
        embeddingCache.set(cacheKey, cached);
        return cached;
      }
    } catch (error) {
      console.error('[Embeddings] Redis get error:', error);
      // Fall through to in-memory cache
    }
  }
  
  // Fallback to in-memory cache
  const inMemoryCached = embeddingCache.get(cacheKey);
  if (inMemoryCached && validateEmbedding(inMemoryCached)) {
    return inMemoryCached;
  }
  
  return null;
}

/**
 * Set cached embedding in Redis and in-memory cache
 */
async function setCachedEmbedding(cacheKey: string, embedding: number[]): Promise<void> {
  // Initialize Redis on first use
  initializeRedis();
  
  // Always set in-memory cache as fallback
  embeddingCache.set(cacheKey, embedding);
  
  // Set in Redis if available (production)
  if (redis) {
    try {
      await redis.set(`${CACHE_PREFIX}${cacheKey}`, embedding, { ex: CACHE_TTL });
      // Log success for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Embeddings] Stored in Redis with key: ${CACHE_PREFIX}${cacheKey.substring(0, 16)}...`);
      }
    } catch (error) {
      console.error('[Embeddings] Redis set error:', error);
      // Continue - in-memory cache is already set
    }
  }
}

/**
 * Call HuggingFace Inference API using official client
 */
async function callHuggingFaceAPI(text: string): Promise<number[] | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    console.error('[Embeddings] HUGGINGFACE_API_KEY not found in environment variables');
    return null;
  }

  try {
    // Initialize HuggingFace Inference client
    const hf = new HfInference(apiKey);

    // Call feature extraction (embeddings) API with timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
    );

    const embeddingPromise = hf.featureExtraction({
      model: MODEL_NAME,
      inputs: text,
    });

    const result = await Promise.race([embeddingPromise, timeoutPromise]);
    
    // The result should be a Float32Array or number array
    let embedding: number[];

    if (result instanceof Float32Array) {
      embedding = Array.from(result);
    } else if (Array.isArray(result)) {
      // Handle nested arrays (e.g., [[...]] or [...])
      if (Array.isArray(result[0])) {
        embedding = result[0] as number[];
      } else {
        embedding = result as number[];
      }
    } else {
      console.error('[Embeddings] Unexpected API response format:', typeof result);
      return null;
    }

    if (!validateEmbedding(embedding)) {
      return null;
    }

    return embedding;

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Request timeout') {
        console.error('[Embeddings] Request timeout after', REQUEST_TIMEOUT, 'ms');
      } else if (error.message.includes('429')) {
        console.error('[Embeddings] Rate limit exceeded. Consider upgrading to HuggingFace Pro or implementing request queuing.');
      } else {
        console.error('[Embeddings] API call failed:', error.message);
      }
    } else {
      console.error('[Embeddings] Unknown error:', error);
    }
    return null;
  }
}

/**
 * Generate text embedding with caching
 * 
 * @param text - The text to generate an embedding for
 * @returns Array of 384 numbers, or null if generation failed
 * 
 * @example
 * const embedding = await generateTextEmbedding("Lost blue backpack near library");
 * if (embedding) {
 *   // Save to database
 *   await supabase.from('items').update({ ai_text_embedding: embedding });
 * }
 */
export async function generateTextEmbedding(text: string): Promise<number[] | null> {
  // Validate input
  if (!text || typeof text !== 'string') {
    console.error('[Embeddings] Invalid input: text must be a non-empty string');
    return null;
  }

  const trimmedText = text.trim();
  
  if (trimmedText.length === 0) {
    console.error('[Embeddings] Invalid input: text is empty after trimming');
    return null;
  }

  // Check cache first (Redis + in-memory)
  const cacheKey = getCacheKey(trimmedText);
  const cachedEmbedding = await getCachedEmbedding(cacheKey);
  
  if (cachedEmbedding) {
    const cacheSource = redis ? 'Redis' : 'in-memory';
    console.log(`[Embeddings] Cache hit (${cacheSource}) for text:`, trimmedText.substring(0, 50) + '...');
    return cachedEmbedding;
  }

  // Generate new embedding
  console.log('[Embeddings] Generating embedding for text:', trimmedText.substring(0, 50) + '...');
  const embedding = await callHuggingFaceAPI(trimmedText);

  if (embedding) {
    // Cache the result (Redis + in-memory)
    await setCachedEmbedding(cacheKey, embedding);
    const cacheInfo = redis ? `Redis + in-memory` : 'in-memory only';
    console.log(`[Embeddings] Successfully generated and cached embedding (${cacheInfo}). In-memory cache size:`, embeddingCache.size);
  }

  return embedding;
}

/**
 * Generate embedding for an item (combines title + description)
 * 
 * @param title - Item title
 * @param description - Item description
 * @returns Array of 384 numbers, or null if generation failed
 * 
 * @example
 * const embedding = await generateItemEmbedding(
 *   "Lost blue backpack",
 *   "Blue Nike backpack with laptop inside, lost near library on Monday"
 * );
 */
export async function generateItemEmbedding(
  title: string,
  description: string
): Promise<number[] | null> {
  // Combine title and description with double weight on title (appears twice)
  const combinedText = `${title}. ${title}. ${description}`;
  return generateTextEmbedding(combinedText);
}

/**
 * Generate embedding in background (fire-and-forget)
 * Updates the item record when complete
 * 
 * @param supabase - Supabase client instance
 * @param itemId - ID of the item to update
 * @param title - Item title
 * @param description - Item description
 * 
 * @example
 * // Fire-and-forget background embedding generation
 * generateEmbeddingInBackground(supabase, itemId, title, description)
 *   .catch(err => console.error('Background embedding failed:', err))
 */
export async function generateEmbeddingInBackground(
  supabase: any, // Using any to avoid circular dependency with @supabase/supabase-js
  itemId: string,
  title: string,
  description: string
): Promise<void> {
  try {
    console.log(`[Background Embedding] Starting generation for item ${itemId}...`);
    const embedding = await generateItemEmbedding(title, description);
    
    if (embedding) {
      const { error: updateError } = await supabase
        .from('items')
        .update({
          ai_text_embedding: embedding,
          ai_processed_at: new Date().toISOString(),
          ai_version: 'v1',
        })
        .eq('id', itemId);
      
      if (updateError) {
        console.error(`[Background Embedding] Failed to update item ${itemId}:`, updateError);
      } else {
        console.log(`[Background Embedding] ✅ Successfully generated and stored embedding for item ${itemId}`);
      }
    } else {
      console.warn(`[Background Embedding] ⚠️ Failed to generate embedding for item ${itemId}`);
    }
  } catch (error) {
    console.error(`[Background Embedding] ❌ Error generating embedding for item ${itemId}:`, error);
    // Don't throw - this is fire-and-forget, errors are logged but don't affect the request
  }
}

/**
 * Clear the embedding cache (useful for testing or memory management)
 */
export function clearEmbeddingCache(): void {
  const previousSize = embeddingCache.size;
  embeddingCache.clear();
  console.log(`[Embeddings] Cache cleared. Removed ${previousSize} entries.`);
}

/**
 * Get current cache size (for monitoring)
 */
export function getEmbeddingCacheSize(): number {
  return embeddingCache.size;
}

// Type exports
export type Embedding = number[];

// Constants export
export const EMBEDDING_CONFIG = {
  model: MODEL_NAME,
  dimensions: EMBEDDING_DIMENSIONS,
  provider: 'HuggingFace Inference API (official client)',
} as const;

