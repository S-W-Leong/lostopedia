/**
 * Example usage of the embeddings service
 * 
 * This file demonstrates how to integrate embeddings into the item creation flow
 * DO NOT import this file in production code - it's for reference only
 */

import { generateItemEmbedding } from './embeddings';
import { createClient } from '../supabase/server';

/**
 * Example: Generate embedding when creating an item
 */
export async function createItemWithEmbedding(itemData: {
  type: 'lost' | 'found';
  title: string;
  description: string;
  category: string;
  location_text: string;
  geo_location?: unknown;
  posted_by: string;
  campus_id: string;
  date_lost_found?: string;
  image_url?: string;
}) {
  const supabase = await createClient();

  // Generate embedding (this may take 1-3 seconds on first API call)
  console.log('Generating AI embedding...');
  const embedding = await generateItemEmbedding(
    itemData.title,
    itemData.description
  );

  // Insert item with embedding
  const { data, error } = await supabase
    .from('items')
    .insert({
      ...itemData,
      ai_text_embedding: embedding, // null if generation failed
      ai_processed_at: embedding ? new Date().toISOString() : null,
      ai_version: embedding ? 'v1' : null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create item:', error);
    return { data: null, error };
  }

  if (!embedding) {
    console.warn('Item created without AI embedding - matching features will be limited');
  }

  return { data, error: null };
}

/**
 * Example: Find similar items using cosine similarity
 */
export async function findSimilarItems(itemId: string, limit = 10) {
  const supabase = await createClient();

  // Get the item's embedding
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('ai_text_embedding, type')
    .eq('id', itemId)
    .single();

  if (itemError || !item?.ai_text_embedding) {
    console.error('Item not found or has no embedding');
    return { data: null, error: itemError };
  }

  // Find similar items of opposite type (lost -> found, found -> lost)
  const oppositeType = item.type === 'lost' ? 'found' : 'lost';

  // Use pgvector's cosine similarity operator <=>
  // Lower distance = higher similarity
  const { data: similarItems, error } = await supabase.rpc('match_items', {
    query_embedding: item.ai_text_embedding,
    match_type: oppositeType,
    match_count: limit,
    similarity_threshold: 0.5, // Only return items with >50% similarity
  });

  if (error) {
    console.error('Failed to find similar items:', error);
    return { data: null, error };
  }

  return { data: similarItems, error: null };
}

/**
 * Example: Backfill embeddings for existing items
 * Use this to generate embeddings for items created before AI was implemented
 */
export async function backfillEmbeddings(batchSize = 10) {
  const supabase = await createClient();

  // Find items without embeddings
  const { data: items, error: fetchError } = await supabase
    .from('items')
    .select('id, title, description')
    .is('ai_text_embedding', null)
    .eq('status', 'active')
    .limit(batchSize);

  if (fetchError || !items) {
    console.error('Failed to fetch items:', fetchError);
    return;
  }

  console.log(`Backfilling embeddings for ${items.length} items...`);

  for (const item of items) {
    console.log(`Processing item ${item.id}...`);
    
    const embedding = await generateItemEmbedding(item.title, item.description);

    if (embedding) {
      const { error: updateError } = await supabase
        .from('items')
        .update({
          ai_text_embedding: embedding,
          ai_processed_at: new Date().toISOString(),
          ai_version: 'v1',
        })
        .eq('id', item.id);

      if (updateError) {
        console.error(`Failed to update item ${item.id}:`, updateError);
      } else {
        console.log(`✓ Item ${item.id} updated`);
      }
    } else {
      console.warn(`✗ Failed to generate embedding for item ${item.id}`);
    }

    // Add delay to avoid rate limiting (1000 requests/hour = ~1.7 per second)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('Backfill complete!');
}

/**
 * Example: Database function for matching (create this in Supabase)
 */
export const matchItemsSQL = `
-- Create a function to find matching items by embedding similarity
CREATE OR REPLACE FUNCTION match_items(
  query_embedding vector(384),
  match_type text,
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  location_text text,
  image_url text,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    items.id,
    items.title,
    items.description,
    items.category,
    items.location_text,
    items.image_url,
    items.created_at,
    1 - (items.ai_text_embedding <=> query_embedding) AS similarity
  FROM items
  WHERE
    items.ai_text_embedding IS NOT NULL
    AND items.type = match_type
    AND items.status = 'active'
    AND items.deleted_at IS NULL
    AND (1 - (items.ai_text_embedding <=> query_embedding)) > similarity_threshold
  ORDER BY items.ai_text_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
`;

// Note: The above SQL function should be created as a migration in Phase 5.3

