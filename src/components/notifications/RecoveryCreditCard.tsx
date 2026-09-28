'use client'

import { Gift, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Notification } from '@/types'

export interface RecoveryCreditCardProps {
  notification: Notification
  linkedItemId?: string | null
  linkedItemTitle?: string
  onMarkLinkedComplete?: (itemId: string) => void
  onDismiss?: () => void
  className?: string
}

/**
 * Special notification card for recovery credit notifications.
 * Shows the credit received and optionally prompts to complete the helper's linked item.
 */
export function RecoveryCreditCard({
  notification,
  linkedItemId,
  linkedItemTitle,
  onMarkLinkedComplete,
  onDismiss,
  className,
}: RecoveryCreditCardProps) {
  const handleMarkComplete = () => {
    if (linkedItemId && onMarkLinkedComplete) {
      onMarkLinkedComplete(linkedItemId)
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-gradient-to-r from-accent/10 to-accent/5 p-4',
        !notification.isRead && 'border-accent',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-full bg-accent/20 p-2">
          <Gift className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              {notification.title}
            </h3>
            <span className="inline-flex items-center rounded-full border border-found/20 bg-found-muted px-2 py-0.5 text-xs font-medium text-found">
              +0.5 rep
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {notification.message}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Linked item prompt */}
      {linkedItemId && linkedItemTitle && (
        <div className="mt-3 pt-3 border-t border-border-muted">
          <p className="text-sm text-text-secondary mb-2">
            Mark your item as completed too?
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleMarkComplete}
              className="flex items-center gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              Complete &quot;{linkedItemTitle}&quot;
            </Button>
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
              >
                Not now
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
