'use client'

import * as React from 'react'
import { Bell, MessageSquare, Clock, AlertCircle, Gift } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

export interface NotificationItemProps {
  notification: Notification
  onClick?: (notification: Notification) => void
  className?: string
}

const notificationIcons = {
  new_message: MessageSquare,
  item_expiring_soon: Clock,
  item_expired: AlertCircle,
  match_found: Bell,
  item_flagged: AlertCircle,
  welcome: Bell,
  recovery_credit: Gift,
}

export const NotificationItem = React.forwardRef<HTMLButtonElement, NotificationItemProps>(
  ({ notification, onClick, className }, ref) => {
    const Icon = notificationIcons[notification.type] || Bell

    const handleClick = () => {
      onClick?.(notification)
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={cn(
          'flex min-h-11 w-full items-start gap-3 rounded-md p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base',
          'hover:bg-bg-overlay',
          !notification.isRead && 'bg-accent-muted/30',
          className
        )}
      >
        <div
          className={cn(
            'mt-0.5 flex-shrink-0',
            !notification.isRead && 'text-accent'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'text-sm font-medium text-text-primary',
                !notification.isRead && 'font-semibold'
              )}
            >
              {notification.title}
            </p>
            {!notification.isRead && (
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
            {notification.message}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
      </button>
    )
  }
)
NotificationItem.displayName = 'NotificationItem'
