/**
 * Reputation System Utilities
 *
 * Uncapped integer-based reputation system.
 * Users start at 100 points, no upper limit.
 * Falling below 0 triggers automatic account suspension.
 */

export const REPUTATION_POINTS = {
  // Starting baseline
  INITIAL: 100,

  // Positive events
  ITEM_POSTED: 2,          // Max 10/day = +20 max per day
  ITEM_COMPLETED: 5,       // Owner recovered their item
  ITEM_RETURNED: 15,       // Helper credited for returning item (BIG reward)

  // Negative events
  FLAGGED_CONTENT: -25,    // Serious penalty for rule violations
  BANNED: -1000,           // Nuclear option, ensures below 0

  // Admin adjustments
  ADMIN_MIN: -500,
  ADMIN_MAX: 500,
} as const;

export type ReputationTier = 'new' | 'active' | 'trusted' | 'veteran' | 'elite';

export interface ReputationInfo {
  score: number;
  tier: ReputationTier;
  tierName: string;
  color: string;
  emoji: string;
  nextTier?: {
    name: string;
    threshold: number;
    pointsNeeded: number;
  };
}

const TIER_THRESHOLDS: Record<ReputationTier, { min: number; name: string; color: string; emoji: string }> = {
  new: { min: 0, name: 'New', color: 'text-red-500', emoji: '🔴' },
  active: { min: 50, name: 'Active', color: 'text-yellow-500', emoji: '🟡' },
  trusted: { min: 150, name: 'Trusted', color: 'text-green-500', emoji: '🟢' },
  veteran: { min: 300, name: 'Veteran', color: 'text-blue-500', emoji: '🔵' },
  elite: { min: 500, name: 'Elite', color: 'text-purple-500', emoji: '🟣' },
};

/**
 * Get reputation tier and display info based on score
 */
export function getReputationInfo(score: number): ReputationInfo {
  let tier: ReputationTier = 'new';

  if (score >= 500) tier = 'elite';
  else if (score >= 300) tier = 'veteran';
  else if (score >= 150) tier = 'trusted';
  else if (score >= 50) tier = 'active';
  else tier = 'new';

  const tierInfo = TIER_THRESHOLDS[tier];

  // Calculate next tier progress
  let nextTier: ReputationInfo['nextTier'];
  const tierOrder: ReputationTier[] = ['new', 'active', 'trusted', 'veteran', 'elite'];
  const currentIndex = tierOrder.indexOf(tier);

  if (currentIndex < tierOrder.length - 1) {
    const nextTierKey = tierOrder[currentIndex + 1];
    const nextTierInfo = TIER_THRESHOLDS[nextTierKey];
    nextTier = {
      name: nextTierInfo.name,
      threshold: nextTierInfo.min,
      pointsNeeded: nextTierInfo.min - score,
    };
  }

  return {
    score,
    tier,
    tierName: tierInfo.name,
    color: tierInfo.color,
    emoji: tierInfo.emoji,
    nextTier,
  };
}

/**
 * Format reputation score for display
 */
export function formatReputation(score: number, includeEmoji: boolean = true): string {
  const info = getReputationInfo(score);
  const emoji = includeEmoji ? `${info.emoji} ` : '';

  if (score >= 1000) {
    return `${emoji}${(score / 1000).toFixed(1)}k pts`;
  }

  return `${emoji}${score} pts`;
}

/**
 * Get color class for reputation score
 */
export function getReputationColor(score: number): string {
  return getReputationInfo(score).color;
}

/**
 * Check if user is at risk of being auto-banned
 * Returns warning if score is close to 0
 */
export function getReputationWarning(score: number): string | null {
  if (score < 0) return 'Account suspended - contact support';
  if (score < 20) return 'Warning: Low reputation - avoid violations';
  if (score < 50) return 'Caution: Build reputation through positive contributions';
  return null;
}

/**
 * Calculate items needed to return to reach a target score
 */
export function calculateItemsToReturn(currentScore: number, targetScore: number): number {
  const pointsNeeded = targetScore - currentScore;
  return Math.ceil(pointsNeeded / REPUTATION_POINTS.ITEM_RETURNED);
}

/**
 * Example progression scenarios for documentation/testing
 */
export const REPUTATION_SCENARIOS = {
  newUser: {
    description: 'Brand new user',
    score: 100,
  },
  activeUser: {
    description: 'Posted 5 items, completed 2',
    score: 100 + (5 * REPUTATION_POINTS.ITEM_POSTED) + (2 * REPUTATION_POINTS.ITEM_COMPLETED),
  },
  helpfulUser: {
    description: 'Helped return 10 items',
    score: 100 + (10 * REPUTATION_POINTS.ITEM_RETURNED),
  },
  communityHero: {
    description: 'Helped return 50 items',
    score: 100 + (50 * REPUTATION_POINTS.ITEM_RETURNED),
  },
  spammer: {
    description: 'New user with 4 validated flags',
    score: 100 + (4 * REPUTATION_POINTS.FLAGGED_CONTENT),
  },
} as const;
