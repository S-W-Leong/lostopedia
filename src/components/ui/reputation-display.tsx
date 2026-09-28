/**
 * Reputation Display Component
 *
 * Displays user reputation with tier badge and score
 * Supports different sizes and layouts
 */

import { getReputationInfo } from '@/lib/utils/reputation'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ReputationDisplayProps {
  score: number
  /** Display variant */
  variant?: 'default' | 'compact' | 'detailed'
  /** Size of the display */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show the emoji */
  showEmoji?: boolean
  /** Additional CSS classes */
  className?: string
}

export function ReputationDisplay({
  score,
  variant = 'default',
  size = 'md',
  showEmoji = true,
  className,
}: ReputationDisplayProps) {
  const info = getReputationInfo(score)

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  // Compact: Just emoji + score
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1', sizeClasses[size], className)}>
        {showEmoji && <span>{info.emoji}</span>}
        <span className={info.color}>{score} pts</span>
      </div>
    )
  }

  // Detailed: Emoji + Tier badge + Score + Next tier info
  if (variant === 'detailed') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center gap-2">
          {showEmoji && <span className="text-2xl">{info.emoji}</span>}
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={cn(info.color, 'font-semibold')}>
                {info.tierName}
              </Badge>
              <span className={cn('font-bold', info.color, sizeClasses[size])}>
                {score} pts
              </span>
            </div>
            {info.nextTier && (
              <p className="text-xs text-muted-foreground mt-1">
                {info.nextTier.pointsNeeded} pts to {info.nextTier.name}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default: Emoji + Tier + Score
  return (
    <div className={cn('flex items-center gap-1.5', sizeClasses[size], className)}>
      {showEmoji && <span>{info.emoji}</span>}
      <Badge variant="secondary" className={cn(info.color, 'text-xs')}>
        {info.tierName}
      </Badge>
      <span className={cn('font-medium', info.color)}>
        {score} pts
      </span>
    </div>
  )
}

/**
 * Reputation Tier Badge (Just the tier, no score)
 */
export function ReputationTierBadge({ score, className }: { score: number; className?: string }) {
  const info = getReputationInfo(score)

  return (
    <Badge variant="secondary" className={cn(info.color, className)}>
      {info.emoji} {info.tierName}
    </Badge>
  )
}

/**
 * Simple reputation score (no tier, just colored points)
 */
export function ReputationScore({ score, className }: { score: number; className?: string }) {
  const info = getReputationInfo(score)

  return (
    <span className={cn(info.color, 'font-medium', className)}>
      {score} pts
    </span>
  )
}
