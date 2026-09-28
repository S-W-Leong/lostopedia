'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import type { Conversation } from '@/types'

export interface ConversationListProps {
  conversations: Conversation[]
  onConversationClick?: (itemId: string, userId: string) => void
  loading?: boolean
  className?: string
}

export function ConversationList({
  conversations,
  onConversationClick,
  loading = false,
  className,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[...Array(5)].map((_, i) => (
          <ConversationSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">
          No conversations yet.
          <br />
          <span className="text-sm">Start a conversation from an item page.</span>
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {conversations.map((conversation) => {
        const href = `/messages/thread?itemId=${conversation.itemId}&userId=${conversation.otherUser.id}`
        const isUnread = conversation.unreadCount > 0

        return (
          <Link
            key={`${conversation.itemId}-${conversation.otherUser.id}`}
            href={href}
            onClick={(e) => {
              if (onConversationClick) {
                e.preventDefault()
                onConversationClick(conversation.itemId, conversation.otherUser.id)
              }
            }}
          >
            <Card
              className={cn(
                'hover:shadow-md transition-shadow cursor-pointer',
                isUnread && 'border-primary/50 bg-primary/5'
              )}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Item thumbnail */}
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                      {conversation.item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={conversation.item.imageUrl}
                          alt={conversation.item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          No image
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={conversation.item.type === 'lost' ? 'destructive' : 'default'}
                      className={cn(
                        'absolute -bottom-1 -right-1 text-xs',
                        conversation.item.type === 'found' &&
                          'border-found/20 bg-found text-found-foreground hover:bg-found/90'
                      )}
                    >
                      {conversation.item.type === 'lost' ? 'Lost' : 'Found'}
                    </Badge>
                  </div>

                  {/* Conversation info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Avatar
                          src={conversation.otherUser.avatarUrl}
                          alt={conversation.otherUser.displayName}
                          size="sm"
                          className="shrink-0"
                        />
                        <h3
                          className={cn(
                            'font-semibold truncate',
                            isUnread && 'text-primary'
                          )}
                        >
                          {conversation.otherUser.displayName}
                        </h3>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(
                          new Date(conversation.lastMessage.createdAt),
                          { addSuffix: true }
                        )}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                      {conversation.item.title}
                    </p>

                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm line-clamp-1',
                          isUnread ? 'font-medium text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {conversation.lastMessage.content}
                      </p>
                      {isUnread && (
                        <Badge
                          variant="default"
                          className="shrink-0 bg-primary text-primary-foreground"
                        >
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

function ConversationSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
