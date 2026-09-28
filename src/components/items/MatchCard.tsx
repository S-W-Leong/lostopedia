'use client'

/**
 * Match Card Component
 * 
 * Displays an AI-suggested match between a lost and found item
 * Shows confidence score, match reasons, and quick actions
 */

import type { Match } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Calendar, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { MESSAGING_ENABLED } from '@/lib/constants'
import { HELP_LOST_FOUND_OFFICE_ANCHOR } from '@/lib/campus/lost-found-office'
import { organization } from '@/lib/organization/config'

interface MatchCardProps {
  match: Match
  onSendMessage?: () => void
}

export function MatchCard({ match, onSendMessage }: MatchCardProps) {
  const { item, scorePercentage, reasons } = match

  // Determine confidence level and color
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'border-found/20 bg-found text-found-foreground'
    if (score >= 60) return 'border-warning/20 bg-warning text-warning-foreground'
    return 'border-danger/20 bg-danger text-danger-foreground'
  }

  const getConfidenceLabel = (score: number) => {
    if (score >= 80) return 'High'
    if (score >= 60) return 'Medium'
    return 'Low'
  }

  return (
    <Card className="w-full max-w-full overflow-hidden transition-shadow hover:shadow-lg">
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 p-3 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4 sm:p-4">
        {/* Item Image */}
        <div className="relative h-40 w-full overflow-hidden rounded-md bg-muted sm:h-24 sm:w-24">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <MapPin className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 max-w-full overflow-hidden">
          {/* Header with confidence badge */}
          <div className="mb-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 max-w-full flex-1">
              <Link
                href={`/item/${item.id}`}
                className="text-base sm:text-lg font-semibold hover:underline truncate block"
              >
                {item.title}
              </Link>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
                {item.description}
              </p>
            </div>

            {/* Confidence Badge */}
            <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end sm:gap-0.5">
              <Badge
                className={`${getConfidenceColor(scorePercentage)} text-xs`}
              >
                {scorePercentage}%
              </Badge>
              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                {getConfidenceLabel(scorePercentage)} match
              </span>
            </div>
          </div>

          {/* Item Details */}
          <div className="mb-2 grid min-w-0 max-w-full grid-cols-1 gap-2 text-xs text-muted-foreground sm:mb-3 sm:gap-3 sm:text-sm">
            <div className="flex min-w-0 max-w-full items-center gap-1 overflow-hidden">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="min-w-0 flex-1 truncate">{item.locationText}</span>
            </div>

            {item.pickupMethod === 'office' && (
              <p className="text-xs text-muted-foreground">
                Pickup is at {organization.office.name} — see the{' '}
                <Link
                  href={`/item/${item.id}`}
                  className="text-accent hover:underline font-medium"
                >
                  listing
                </Link>{' '}
                or{' '}
                <Link
                  href={`/help#${HELP_LOST_FOUND_OFFICE_ANCHOR}`}
                  className="text-accent hover:underline font-medium"
                >
                  Help
                </Link>
                .
              </p>
            )}

            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex shrink-0 items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                <span className="sm:hidden">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: false })}</span>
              </div>

              <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="min-w-0 truncate">{item.poster.displayName}</span>
                <span className="shrink-0 text-warning">★ {item.poster.reputationScore.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Match Reasons */}
          {reasons.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {reasons.map((reason, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {reason}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            {MESSAGING_ENABLED && (
              <Button
                size="sm"
                onClick={onSendMessage}
                className="flex-1 text-xs sm:text-sm"
              >
                Send Message
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              asChild
              className="flex-1 text-xs sm:text-sm"
            >
              <Link href={`/item/${item.id}`}>
                View Details
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Detailed Score Breakdown (Optional - expandable) */}
      {/* Uncomment to show score breakdown
      <div className="border-t px-4 py-2 bg-muted/30">
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Score breakdown
          </summary>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Text similarity (50%):</span>
              <span>{(match.breakdown.textScore * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Metadata match (30%):</span>
              <span>{(match.breakdown.metadataScore * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Location proximity (20%):</span>
              <span>{(match.breakdown.proximityScore * 100).toFixed(0)}%</span>
            </div>
          </div>
        </details>
      </div>
      */}
    </Card>
  )
}

/**
 * Usage Example:
 * 
 * import { MatchCard } from '@/components/items/MatchCard'
 * 
 * function ItemMatches({ itemId }: { itemId: string }) {
 *   const [matches, setMatches] = useState<Match[]>([])
 *   const [loading, setLoading] = useState(true)
 * 
 *   useEffect(() => {
 *     fetch(`/api/matches?itemId=${itemId}&limit=10`)
 *       .then(res => res.json())
 *       .then(data => {
 *         if (data.success) {
 *           setMatches(data.matches)
 *         }
 *       })
 *       .finally(() => setLoading(false))
 *   }, [itemId])
 * 
 *   if (loading) return <div>Loading matches...</div>
 *   if (matches.length === 0) return <div>No matches found</div>
 * 
 *   return (
 *     <div className="space-y-4">
 *       <h2 className="text-2xl font-bold">Potential Matches</h2>
 *       {matches.map(match => (
 *         <MatchCard 
 *           key={match.item.id} 
 *           match={match}
 *           onSendMessage={() => {
 *             // Handle message sending
 *             router.push(`/messages/thread?itemId=${match.item.id}`)
 *           }}
 *         />
 *       ))}
 *     </div>
 *   )
 * }
 */
