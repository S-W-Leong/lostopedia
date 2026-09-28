'use client'

import { formatDistanceToNow } from 'date-fns'
import { Check } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils/cn'
import type { MessageWithUsers } from '@/types'

export interface MessageBubbleProps {
  message: MessageWithUsers
  isOwnMessage: boolean
  showSender?: boolean
  className?: string
}

export function MessageBubble({
  message,
  isOwnMessage,
  showSender = false,
  className,
}: MessageBubbleProps) {
  const formattedTime = formatDistanceToNow(new Date(message.createdAt), {
    addSuffix: true,
  })

  return (
    <div
      className={cn(
        'flex gap-2 group',
        isOwnMessage ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {showSender && !isOwnMessage && (
        <Avatar
          src={message.sender.avatarUrl}
          alt={message.sender.displayName}
          size="sm"
          className="shrink-0 mt-1"
        />
      )}

      <div
        className={cn(
          'flex flex-col gap-1 max-w-[70%]',
          isOwnMessage ? 'items-end' : 'items-start'
        )}
      >
        {showSender && !isOwnMessage && (
          <span className="text-xs text-muted-foreground px-2">
            {message.sender.displayName}
          </span>
        )}

        <div
          className={cn(
            'rounded-lg px-4 py-2 text-sm break-words',
            isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        <div
          className={cn(
            'flex items-center gap-1 text-xs text-muted-foreground px-2',
            isOwnMessage ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span>{formattedTime}</span>
          {isOwnMessage && (
            <span className="opacity-70">
              {message.isRead ? (
                <span className="flex items-center">
                  <Check className="h-3 w-3 -mr-1" />
                  <Check className="h-3 w-3" />
                </span>
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

