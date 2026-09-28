/**
 * AI Matching API
 * 
 * Finds potential matches between lost and found items using:
 * - Text similarity (50% weight) via pgvector
 * - Metadata matching (30% weight) - category, date proximity
 * - Location proximity (20% weight) via PostGIS
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Match, ItemWithPoster } from '@/types'
import { parsePostGISPoint } from '@/lib/utils/geo'
import { calculateMatchScores, generateMatchReasons } from '@/lib/utils/matching'
import { rateLimiters } from '@/lib/ratelimit'
import { z } from 'zod'

// ============================================
// Request Validation
// ============================================

const matchQuerySchema = z.object({
  itemId: z.string().uuid('Invalid item ID format'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
})

// ============================================
// Main API Handler
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limit matches by user (transparent to user via message + headers)
    const rateLimit = await rateLimiters.matches(user.id)
    if (!rateLimit.success) {
      const resetTime = new Date(rateLimit.reset).toLocaleTimeString()
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded for match requests. Please try again after ${resetTime}.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      )
    }

    // Validate query parameters
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      itemId: searchParams.get('itemId'),
      limit: searchParams.get('limit'),
    }

    const validationResult = matchQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters',
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { itemId, limit } = validationResult.data

    // ============================================
    // Step 1: Fetch the source item
    // ============================================

    const { data: sourceItem, error: sourceError } = await supabase
      .from('items')
      .select('id, type, category, date_lost_found, geo_location, ai_text_embedding')
      .eq('id', itemId)
      .single()

    if (sourceError || !sourceItem) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    // Check if item has AI embedding
    if (!(sourceItem as any).ai_text_embedding) {
      return NextResponse.json(
        { 
          success: true, 
          matches: [],
          scannedCount: 0,
          candidateCount: 0,
          message: 'Item does not have AI embeddings yet. Matches will be available once processing completes.'
        },
        { status: 200 }
      )
    }

    // Determine opposite type
    const sourceItemData = sourceItem as any
    const oppositeType = sourceItemData.type === 'lost' ? 'found' : 'lost'

    // ============================================
    // Step 2: Query candidate items using pgvector
    // ============================================

    // Pre-filter candidates for the fallback path only.
    // This query is NOT similarity-ordered; the match_items_by_embedding RPC below does the real ranking.
    // If the RPC fails, we score this unordered candidate set client-side instead.
    const { data: candidateItems, error: candidatesError } = await supabase
      .from('items')
      .select(`
        id,
        type,
        title,
        description,
        category,
        image_url,
        pickup_method,
        location_text,
        geo_location,
        location_precision,
        date_lost_found,
        created_at,
        expires_at,
        status,
        posted_by,
        poster:users!posted_by (
          id,
          display_name,
          avatar_url,
          reputation_score
        )
      `)
      .eq('type', oppositeType)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .not('ai_text_embedding', 'is', null)
      .neq('posted_by', user.id) // Exclude user's own items
      .limit(100) // arbitrary cap for the fallback path

    if (candidatesError) {
      console.error('Error fetching candidate items:', candidatesError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch candidate matches' },
        { status: 500 }
      )
    }

    const scannedCount = candidateItems?.length || 0

    if (!candidateItems || candidateItems.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          matches: [],
          scannedCount: 0,
          candidateCount: 0,
          message: 'No matching items found'
        },
        { status: 200 }
      )
    }

    // ============================================
    // Step 3: Calculate scores for each candidate
    // ============================================

    // Try to use RPC function for vector similarity if available
    // Otherwise fall back to client-side scoring
    let rankedItems = null
    try {
      const embeddingStr = `[${sourceItemData.ai_text_embedding.join(',')}]`
      
      const { data, error: rankError } = await supabase.rpc(
        'match_items_by_embedding',
        // @ts-ignore - Supabase type inference issue
        {
          query_embedding: embeddingStr,
          match_type: oppositeType,
          match_status: 'active',
          exclude_user_id: user.id,
          match_limit: 100
        }
      )
      
      // Only use RPC results if successful
      if (!rankError && data) {
        rankedItems = data
      }
    } catch (_rpcError) {
      // RPC function doesn't exist yet, will fall back to client-side scoring
      console.log('RPC function not available, using client-side scoring')
    }

    // If RPC function doesn't exist or failed, fall back to client-side scoring
    const itemsToScore = rankedItems || candidateItems

    const scoredMatches = itemsToScore.map((candidate: any) => {
      // Add cosine_distance to candidate for scoring
      const candidateWithDistance = {
        ...candidate,
        cosine_distance: candidate.similarity 
          ? 1 - candidate.similarity 
          : candidate.cosine_distance || null,
      }

      // Calculate all scores using utility function
      const scores = calculateMatchScores(sourceItem, candidateWithDistance)
      
      // Generate reasons
      const reasons = generateMatchReasons(sourceItem, candidate, scores)

      // Transform to ItemWithPoster format
      const item: ItemWithPoster = {
        id: candidate.id,
        type: candidate.type,
        title: candidate.title,
        description: candidate.description,
        category: candidate.category,
        imageUrl: candidate.image_url,
        imageMetadata: candidate.image_metadata,
        locationText: candidate.location_text,
        pickupMethod: candidate.pickup_method ?? null,
        geoLocation: parsePostGISPoint(candidate.geo_location),
        locationPrecision: candidate.location_precision || 'approximate',
        dateLostFound: candidate.date_lost_found,
        createdAt: candidate.created_at,
        updatedAt: candidate.updated_at,
        status: candidate.status,
        completedAt: candidate.completed_at,
        expiresAt: candidate.expires_at,
        postedBy: candidate.posted_by,
        campusId: candidate.campus_id,
        isFlagged: candidate.is_flagged || false,
        flagCount: candidate.flag_count || 0,
        poster: {
          id: candidate.poster?.id || candidate.posted_by,
          displayName: candidate.poster?.display_name || 'Unknown User',
          avatarUrl: candidate.poster?.avatar_url || null,
          reputationScore: candidate.poster?.reputation_score || 5.0,
        },
      }

      const match: Match = {
        item,
        score: scores.finalScore,
        scorePercentage: Math.round(scores.finalScore * 100),
        breakdown: {
          textScore: scores.textScore,
          metadataScore: scores.metadataScore,
          proximityScore: scores.proximityScore,
        },
        reasons,
      }

      return match
    })

    // ============================================
    // Step 4: Sort and return top matches
    // ============================================

    // Sort by final score (descending) and take top N
    const topMatches = scoredMatches
      .sort((a: Match, b: Match) => b.score - a.score)
      .slice(0, limit)

    return NextResponse.json(
      {
        success: true,
        matches: topMatches,
        scannedCount,
        candidateCount: scoredMatches.length,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '30',
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.reset),
        },
      }
    )

  } catch (error) {
    console.error('Error in matches API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
