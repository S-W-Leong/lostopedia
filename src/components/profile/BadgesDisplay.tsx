'use client'

import { RECOVERY_BADGES } from '@/lib/constants'
import type { UserBadge } from '@/types'

interface BadgesDisplayProps {
  badges: UserBadge[]
  totalItemsReturned?: number
  compact?: boolean
}

export function BadgesDisplay({
  badges,
  totalItemsReturned = 0,
  compact = false
}: BadgesDisplayProps) {
  const earnedBadgeTypes = new Set(badges.map(b => b.badgeType))

  if (compact) {
    // Compact mode: just show earned badges inline
    const earnedBadges = RECOVERY_BADGES.filter(b => earnedBadgeTypes.has(b.type))

    if (earnedBadges.length === 0) return null

    return (
      <div className="flex items-center gap-1">
        {earnedBadges.map(badge => (
          <span
            key={badge.type}
            title={badge.name}
            className="text-lg"
          >
            {badge.icon}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">
          Recovery Badges
        </h3>
        <span className="text-sm text-text-secondary">
          Helped return {totalItemsReturned} item{totalItemsReturned !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {RECOVERY_BADGES.map(badge => {
          const earned = earnedBadgeTypes.has(badge.type)
          const badgeData = badges.find(b => b.badgeType === badge.type)

          return (
            <div
              key={badge.type}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                earned
                  ? 'bg-accent/10 border-accent'
                  : 'bg-bg-overlay border-border-muted opacity-50'
              }`}
              title={
                earned && badgeData
                  ? `Earned on ${new Date(badgeData.earnedAt).toLocaleDateString()}`
                  : `Unlock at ${badge.threshold} returns`
              }
            >
              <span className="text-xl">{badge.icon}</span>
              <div>
                <p className={`text-sm font-medium ${
                  earned ? 'text-text-primary' : 'text-text-muted'
                }`}>
                  {badge.name}
                </p>
                <p className="text-xs text-text-muted">
                  {earned ? 'Earned' : `${badge.threshold} returns`}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
