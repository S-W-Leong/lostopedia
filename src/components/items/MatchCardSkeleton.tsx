/**
 * Skeleton loader for MatchCard component
 * Displays loading placeholders while matches are being fetched
 */

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function MatchCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Image Skeleton */}
        <Skeleton className="w-24 h-24 flex-shrink-0 rounded-md" />

        {/* Content Skeleton */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header with title and badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>

          {/* Details row */}
          <div className="flex gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>

          {/* Match reasons (badges) */}
          <div className="flex gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-28" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Container to show multiple skeleton cards
 */
export function MatchCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <MatchCardSkeleton key={index} />
      ))}
    </div>
  )
}

