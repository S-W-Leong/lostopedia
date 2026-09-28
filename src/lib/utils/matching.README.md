# AI Matching System

This module implements the AI-powered matching algorithm that suggests potential matches between lost and found items.

## Algorithm Overview

The matching system uses a **three-factor scoring model** as defined in PRD Section 5.1.4:

```
Final Score = (Text Score × 50%) + (Metadata Score × 30%) + (Proximity Score × 20%)
```

### Scoring Components

#### 1. Text Score (50% weight)
Measures semantic similarity using pgvector cosine distance:
- **Source**: AI text embeddings (384-dimensional vectors)
- **Method**: Cosine distance from pgvector's `<=>` operator
- **Range**: 0 to 1 (higher is more similar)
- **Formula**: `similarity = 1 - cosine_distance`

#### 2. Metadata Score (30% weight)
Combines category and temporal matching:
- **Category Match** (70% of metadata score):
  - Same category: +0.7
  - Different category: 0
- **Date Proximity** (30% of metadata score):
  - Within 7 days: +0.15
  - Within 30 days: +0.10
  - Within 90 days: +0.05
  - No date info: +0.1 (neutral)

#### 3. Proximity Score (20% weight)
Distance-based scoring using geolocation:
- **< 100m**: 1.0 (nearly same location)
- **100-500m**: 0.8 (very close)
- **500m-1km**: 0.6 (nearby)
- **1-5km**: 0.4 (in the area)
- **> 5km**: 0.2 (far)
- **No location**: 0.5 (neutral)

## Usage

### Basic Usage

```typescript
import { calculateMatchScores, generateMatchReasons } from '@/lib/utils/matching'

// Calculate all scores at once
const scores = calculateMatchScores(sourceItem, candidateItem)

// Generate human-readable reasons
const reasons = generateMatchReasons(sourceItem, candidateItem, scores)

console.log(`Match confidence: ${scores.finalScore * 100}%`)
console.log('Reasons:', reasons)
```

### Individual Score Calculation

```typescript
import {
  calculateTextScore,
  calculateMetadataScore,
  calculateProximityScore,
  calculateFinalScore,
} from '@/lib/utils/matching'

// Calculate each component separately
const textScore = calculateTextScore(cosineDistance)
const metadataScore = calculateMetadataScore(sourceItem, candidateItem)
const proximityScore = calculateProximityScore(sourceGeo, candidateGeo)

// Combine with weights
const finalScore = calculateFinalScore(textScore, metadataScore, proximityScore)
```

### API Endpoint

```typescript
// GET /api/matches?itemId={uuid}&limit={number}

const response = await fetch(`/api/matches?itemId=${itemId}&limit=10`)
const data = await response.json()

// Response structure:
{
  success: true,
  matches: [
    {
      item: ItemWithPoster,
      score: 0.87,                    // 0-1 range
      scorePercentage: 87,            // 0-100 range
      breakdown: {
        textScore: 0.92,
        metadataScore: 0.85,
        proximityScore: 0.80,
      },
      reasons: [
        "Very similar description",
        "Same category: Electronics",
        "Found nearby (250m away)"
      ]
    },
    // ... more matches
  ],
  scannedCount: 143,      // Total items considered
  candidateCount: 23,     // Items that passed initial filtering
}
```

## Configuration

All thresholds and weights are exported as constants:

```typescript
import { MATCHING_CONFIG } from '@/lib/utils/matching'

console.log(MATCHING_CONFIG)
// {
//   weights: { TEXT: 0.5, METADATA: 0.3, PROXIMITY: 0.2 },
//   metadataWeights: { CATEGORY: 0.7, DATE: 0.3 },
//   dateThresholds: { WEEK: { days: 7, score: 0.15 }, ... },
//   distanceThresholds: { VERY_CLOSE: { maxKm: 0.1, score: 1.0 }, ... },
//   defaultLimit: 10,
//   maxCandidates: 100,
// }
```

## Examples

### Example 1: High Confidence Match

```typescript
Source Item: Lost black iPhone 14 Pro near library
Candidate: Found iPhone 14 Pro in Main Library

Scores:
- Text Score: 0.94 (very similar descriptions)
- Metadata Score: 0.85 (same category + within 2 days)
- Proximity Score: 1.0 (found at nearly same location)
- Final Score: 0.925 → 93%

Reasons:
- "Very similar description"
- "Same category: Electronics"
- "Found within 2 days"
- "Found at nearly the same location"
```

### Example 2: Medium Confidence Match

```typescript
Source Item: Lost blue Nike backpack
Candidate: Found backpack near cafeteria

Scores:
- Text Score: 0.68 (similar but less specific)
- Metadata Score: 0.75 (same category, no date)
- Proximity Score: 0.6 (500m away)
- Final Score: 0.665 → 67%

Reasons:
- "Similar description"
- "Same category: Bags"
- "Found nearby (0.5km away)"
```

### Example 3: Low Confidence Match

```typescript
Source Item: Lost wallet with cards
Candidate: Found phone case

Scores:
- Text Score: 0.35 (different items mentioned)
- Metadata Score: 0.1 (different categories, no date)
- Proximity Score: 0.2 (far away)
- Final Score: 0.23 → 23%

Reasons:
- "Potentially related item"
```

## Testing

```typescript
import { calculateMatchScores } from '@/lib/utils/matching'

// Mock items for testing
const sourceItem = {
  category: 'electronics',
  date_lost_found: '2024-01-15',
  geo_location: 'POINT(101.7260 3.2153)',
}

const candidateItem = {
  category: 'electronics',
  date_lost_found: '2024-01-16',
  geo_location: 'POINT(101.7265 3.2155)',
  cosine_distance: 0.15,
}

const scores = calculateMatchScores(sourceItem, candidateItem)
expect(scores.finalScore).toBeGreaterThan(0.8) // High confidence
```

## Performance

- **pgvector index**: Enables fast similarity search on 24+ items
- **Candidate limit**: Processes max 100 candidates to keep response time low
- **Average response time**: < 500ms for typical queries
- **Scalability**: O(n log n) where n is number of opposite-type items

## Future Enhancements

1. **Machine Learning**: Train weights based on successful recoveries
2. **Image Embeddings**: Add visual similarity when images available
3. **User Feedback**: Learn from match accept/reject patterns
4. **Caching**: Cache match results for 1 hour to reduce computation
5. **Real-time Updates**: Notify users when new high-confidence matches appear

