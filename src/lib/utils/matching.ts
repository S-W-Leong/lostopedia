/**
 * AI Matching Utilities
 * 
 * Functions for calculating match scores between lost and found items
 * Based on the scoring algorithm from PRD Section 5.1.4:
 * 
 * Final Score = (textScore × 50%) + (metadataScore × 30%) + (proximityScore × 20%)
 */

import { calculateDistance, parsePostGISPoint } from './geo'

// ============================================
// Type Definitions
// ============================================

export interface MatchScores {
  textScore: number
  metadataScore: number
  proximityScore: number
  finalScore: number
}

export interface ItemForMatching {
  category: string
  date_lost_found: string | null
  geo_location: any
  title?: string
  description?: string
}

// ============================================
// Scoring Constants (from PRD)
// ============================================

const WEIGHTS = {
  TEXT: 0.5,      // 50%
  METADATA: 0.3,  // 30%
  PROXIMITY: 0.2, // 20%
} as const

const METADATA_WEIGHTS = {
  CATEGORY: 0.7,  // 70% of metadata score
  DATE: 0.3,      // 30% of metadata score
} as const

const DATE_THRESHOLDS = {
  WEEK: { days: 7, score: 0.15 },
  MONTH: { days: 30, score: 0.10 },
  QUARTER: { days: 90, score: 0.05 },
} as const

const DISTANCE_THRESHOLDS = {
  VERY_CLOSE: { maxKm: 0.1, score: 1.0 },   // < 100m
  CLOSE: { maxKm: 0.5, score: 0.8 },        // 100-500m
  NEARBY: { maxKm: 1, score: 0.6 },         // 500m-1km
  AREA: { maxKm: 5, score: 0.4 },           // 1-5km
  FAR: { score: 0.2 },                      // > 5km
} as const

// ============================================
// Scoring Functions
// ============================================

/**
 * Calculate text similarity score (0-1) using cosine distance from pgvector
 * 
 * @param cosineDistance - Cosine distance from pgvector <=> operator (0-2)
 * @returns Similarity score between 0 and 1
 * 
 * Note: pgvector's <=> returns cosine distance (0 = identical, 2 = opposite)
 * We convert this to similarity: similarity = 1 - distance
 */
export function calculateTextScore(cosineDistance: number | null): number {
  if (cosineDistance === null) {
    return 0.5 // Neutral score if no embedding
  }
  
  // Convert cosine distance (0-2) to similarity (0-1)
  const cosineSimilarity = 1 - cosineDistance
  
  // Ensure we're in valid range
  return Math.max(0, Math.min(1, cosineSimilarity))
}

/**
 * Calculate metadata matching score (0-1) based on category and date proximity
 * 
 * @param sourceItem - The source item to match against
 * @param candidateItem - The candidate item being evaluated
 * @returns Metadata score between 0 and 1
 */
export function calculateMetadataScore(
  sourceItem: ItemForMatching,
  candidateItem: ItemForMatching
): number {
  let score = 0

  // Category match: 70% of metadata score
  if (sourceItem.category === candidateItem.category) {
    score += METADATA_WEIGHTS.CATEGORY
  }

  // Date proximity: 30% of metadata score
  if (sourceItem.date_lost_found && candidateItem.date_lost_found) {
    const sourceDate = new Date(sourceItem.date_lost_found)
    const candidateDate = new Date(candidateItem.date_lost_found)
    const daysDiff = Math.abs(
      (sourceDate.getTime() - candidateDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysDiff <= DATE_THRESHOLDS.WEEK.days) {
      score += DATE_THRESHOLDS.WEEK.score
    } else if (daysDiff <= DATE_THRESHOLDS.MONTH.days) {
      score += DATE_THRESHOLDS.MONTH.score
    } else if (daysDiff <= DATE_THRESHOLDS.QUARTER.days) {
      score += DATE_THRESHOLDS.QUARTER.score
    }
  } else {
    // If no date info, give neutral score (1/3 of date weight)
    score += 0.1
  }

  return score
}

/**
 * Calculate proximity score (0-1) based on distance between locations
 * 
 * @param sourceGeo - Source item geo_location (PostGIS format)
 * @param candidateGeo - Candidate item geo_location (PostGIS format)
 * @returns Proximity score between 0 and 1
 */
export function calculateProximityScore(
  sourceGeo: any,
  candidateGeo: any
): number {
  // Parse geo locations
  const sourceLoc = parsePostGISPoint(sourceGeo)
  const candidateLoc = parsePostGISPoint(candidateGeo)

  // If either location is missing, return neutral score
  if (!sourceLoc || !candidateLoc) {
    return 0.5
  }

  // Calculate distance in kilometers
  const distanceKm = calculateDistance(
    sourceLoc.latitude,
    sourceLoc.longitude,
    candidateLoc.latitude,
    candidateLoc.longitude
  )

  // Score based on distance (as per PRD Section 5.1.4)
  if (distanceKm < DISTANCE_THRESHOLDS.VERY_CLOSE.maxKm) {
    return DISTANCE_THRESHOLDS.VERY_CLOSE.score
  }
  if (distanceKm < DISTANCE_THRESHOLDS.CLOSE.maxKm) {
    return DISTANCE_THRESHOLDS.CLOSE.score
  }
  if (distanceKm < DISTANCE_THRESHOLDS.NEARBY.maxKm) {
    return DISTANCE_THRESHOLDS.NEARBY.score
  }
  if (distanceKm < DISTANCE_THRESHOLDS.AREA.maxKm) {
    return DISTANCE_THRESHOLDS.AREA.score
  }
  return DISTANCE_THRESHOLDS.FAR.score
}

/**
 * Calculate final weighted score combining all components
 * 
 * @param textScore - Text similarity score (0-1)
 * @param metadataScore - Metadata matching score (0-1)
 * @param proximityScore - Location proximity score (0-1)
 * @returns Final weighted score between 0 and 1
 */
export function calculateFinalScore(
  textScore: number,
  metadataScore: number,
  proximityScore: number
): number {
  return (
    textScore * WEIGHTS.TEXT +
    metadataScore * WEIGHTS.METADATA +
    proximityScore * WEIGHTS.PROXIMITY
  )
}

/**
 * Calculate all scores for a match
 * 
 * @param sourceItem - The source item
 * @param candidateItem - The candidate item
 * @param cosineDistance - Optional cosine distance from pgvector
 * @returns Object with all score components
 */
export function calculateMatchScores(
  sourceItem: ItemForMatching,
  candidateItem: ItemForMatching & { cosine_distance?: number | null },
): MatchScores {
  const textScore = calculateTextScore(candidateItem.cosine_distance ?? null)
  const metadataScore = calculateMetadataScore(sourceItem, candidateItem)
  const proximityScore = calculateProximityScore(
    sourceItem.geo_location,
    candidateItem.geo_location
  )
  const finalScore = calculateFinalScore(textScore, metadataScore, proximityScore)

  return {
    textScore,
    metadataScore,
    proximityScore,
    finalScore,
  }
}

// ============================================
// Match Reasons Generator
// ============================================

/**
 * Generate human-readable match reasons explaining why items match
 * 
 * @param sourceItem - The source item
 * @param candidateItem - The candidate item
 * @param scores - The calculated match scores
 * @returns Array of reason strings
 */
export function generateMatchReasons(
  sourceItem: ItemForMatching,
  candidateItem: ItemForMatching,
  scores: Pick<MatchScores, 'textScore' | 'metadataScore' | 'proximityScore'>
): string[] {
  const reasons: string[] = []

  // Text similarity
  if (scores.textScore > 0.8) {
    reasons.push('Very similar description')
  } else if (scores.textScore > 0.6) {
    reasons.push('Similar description')
  }

  // Category
  if (sourceItem.category === candidateItem.category) {
    const categoryLabel = sourceItem.category.charAt(0).toUpperCase() + 
                         sourceItem.category.slice(1)
    reasons.push(`Same category: ${categoryLabel}`)
  }

  // Date proximity
  if (sourceItem.date_lost_found && candidateItem.date_lost_found) {
    const daysDiff = Math.abs(
      (new Date(sourceItem.date_lost_found).getTime() - 
       new Date(candidateItem.date_lost_found).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysDiff <= 7) {
      const daysRounded = Math.ceil(daysDiff)
      reasons.push(
        daysRounded === 0 
          ? 'Found on the same day' 
          : `Found within ${daysRounded} day${daysRounded > 1 ? 's' : ''}`
      )
    }
  }

  // Location proximity
  const sourceLoc = parsePostGISPoint(sourceItem.geo_location)
  const candidateLoc = parsePostGISPoint(candidateItem.geo_location)
  
  if (sourceLoc && candidateLoc) {
    const distanceKm = calculateDistance(
      sourceLoc.latitude,
      sourceLoc.longitude,
      candidateLoc.latitude,
      candidateLoc.longitude
    )
    
    if (distanceKm < 0.1) {
      reasons.push('Found at nearly the same location')
    } else if (distanceKm < 0.5) {
      reasons.push(`Found nearby (${Math.round(distanceKm * 1000)}m away)`)
    } else if (distanceKm < 1) {
      reasons.push(`Found nearby (${distanceKm.toFixed(1)}km away)`)
    } else if (distanceKm < 5) {
      reasons.push(`Found in the area (${distanceKm.toFixed(1)}km away)`)
    }
  }

  // If no strong reasons, add a generic one
  if (reasons.length === 0 && scores.textScore > 0.4) {
    reasons.push('Potentially related item')
  }

  return reasons
}

// ============================================
// Export Configuration
// ============================================

export const MATCHING_CONFIG = {
  weights: WEIGHTS,
  metadataWeights: METADATA_WEIGHTS,
  dateThresholds: DATE_THRESHOLDS,
  distanceThresholds: DISTANCE_THRESHOLDS,
  defaultLimit: 10,
  maxCandidates: 100,
} as const

