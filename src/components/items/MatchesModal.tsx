'use client'

/**
 * Matches Modal Component
 * 
 * Displays AI-suggested matches for an item in a modal dialog
 * Triggered by item owner clicking "Find Matches" button
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { AlertCircle, Sparkles } from 'lucide-react'
import { MatchCard } from './MatchCard'
import { MatchCardSkeletonList } from './MatchCardSkeleton'
import type { Match } from '@/types'
import { MESSAGING_ENABLED } from '@/lib/constants'

interface MatchesModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: string
  itemTitle: string
}

export function MatchesModal({ isOpen, onClose, itemId, itemTitle }: MatchesModalProps) {
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch matches when modal opens
  const fetchMatches = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/matches?itemId=${itemId}&limit=3`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          const resetHeader = response.headers.get('X-RateLimit-Reset')
          const resetMs = resetHeader ? Number(resetHeader) : NaN
          const resetTime = Number.isFinite(resetMs) ? new Date(resetMs).toLocaleTimeString() : null
          throw new Error(
            resetTime
              ? `Too many match requests. Please try again after ${resetTime}.`
              : 'Too many match requests. Please try again later.'
          )
        }
        throw new Error(data.error || 'Failed to fetch matches')
      }

      if (data.success) {
        setMatches(data.matches || [])
      } else {
        throw new Error(data.error || 'Failed to fetch matches')
      }
    } catch (err) {
      console.error('Error fetching matches:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch matches')
      setMatches([])
    } finally {
      setIsLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    if (isOpen && itemId) {
      fetchMatches()
    }
  }, [fetchMatches, isOpen, itemId])

  const handleSendMessage = (matchItemId: string, matchPosterId: string) => {
    // Close modal first
    onClose()
    // Navigate to message thread
    router.push(`/messages/thread?itemId=${matchItemId}&userId=${matchPosterId}`)
  }

  const handleClose = () => {
    onClose()
    // Reset state when closing
    setTimeout(() => {
      setMatches([])
      setError(null)
    }, 300) // Wait for dialog animation
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[min(95vw,56rem)] max-w-none overflow-hidden p-0">
        <div className="flex max-h-[min(90vh,48rem)] flex-col">
          <DialogHeader className="shrink-0 border-b px-4 pb-4 pt-6 pr-12 sm:px-6 sm:pb-5 sm:pt-6 sm:pr-14">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-xl sm:text-2xl">Potential Matches</DialogTitle>
              <Badge variant="secondary" className="border-match/20 bg-match-muted text-match">
                <Sparkles className="mr-1 h-3 w-3" />
                AI Powered
              </Badge>
            </div>
            <DialogDescription className="text-sm sm:text-base">
              AI-suggested items that might match &quot;{itemTitle}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-4 py-4 sm:px-6">
            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Searching for matches...</p>
                <MatchCardSkeletonList count={3} />
              </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <Alert variant="error" className="mb-4 flex-wrap gap-3">
                <AlertCircle className="h-4 w-4" />
                <div className="min-w-0 flex-1">
                  <strong>Failed to load matches:</strong> {error}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchMatches}
                  className="w-full sm:ml-auto sm:w-auto"
                >
                  Try Again
                </Button>
              </Alert>
            )}

            {/* Empty State */}
            {!isLoading && !error && matches.length === 0 && (
              <div className="rounded-lg border-2 border-dashed bg-muted/30 py-12 text-center">
                <div className="mb-3 text-muted-foreground">
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-medium">
                  No potential matches found
                </h3>
                <div className="mx-auto max-w-md space-y-2 px-4 text-sm text-muted-foreground">
                  <p>
                    Our AI couldn&apos;t find any matching items right now. This could be because:
                  </p>
                  <ul className="mt-3 space-y-1 text-left">
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>No opposite-type items have been posted yet</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>Existing items are still being processed for AI matching</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>No items match your description closely enough</span>
                    </li>
                  </ul>
                  <p className="mt-4 text-xs">
                    <strong>Tip:</strong> Try checking back later or updating your item description with more specific details to improve matching accuracy.
                  </p>
                </div>
              </div>
            )}

            {/* Success State - Display Matches */}
            {!isLoading && !error && matches.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Found {matches.length} potential {matches.length === 1 ? 'match' : 'matches'}
                </p>
                {matches.map((match) => (
                  <MatchCard
                    key={match.item.id}
                    match={match}
                    onSendMessage={MESSAGING_ENABLED ? () => handleSendMessage(match.item.id, match.item.postedBy) : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 flex-col-reverse justify-end gap-2 border-t px-4 py-4 sm:flex-row sm:px-6">
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Close
            </Button>
            {!isLoading && matches.length > 0 && (
              <Button variant="ghost" onClick={fetchMatches} className="w-full sm:w-auto">
                Refresh Matches
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
