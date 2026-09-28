'use client'
import * as React from 'react'

import { ArrowLeft, AlertCircle, UserX, PackageX } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { UserLink } from '@/components/ui/user-link'
import { MessageInput } from './MessageInput'
import { MessageBubble } from './MessageBubble'
import { ReputationDisplay } from '@/components/ui/reputation-display'
import { cn } from '@/lib/utils/cn'
import type { MessageWithUsers, Message } from '@/types'

export interface MessageThreadProps {
  itemId: string
  otherUserId: string
  currentUserId: string
  messages?: MessageWithUsers[]
  item?: {
    id: string
    title: string
    imageUrl: string | null
    type: 'lost' | 'found'
  }
  otherUser?: {
    id: string
    displayName: string
    avatarUrl: string | null
    reputationScore: number
  }
  loading?: boolean
  error?: string | null
  onMessageSent?: (message: Message) => void
  onRefresh?: () => void
  className?: string
}

export function MessageThread({
  itemId,
  otherUserId,
  currentUserId,
  messages = [],
  item,
  otherUser,
  loading = false,
  error = null,
  onMessageSent,
  onRefresh,
  className,
}: MessageThreadProps) {
  const router = useRouter()
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  // Mark messages as read when viewing
  React.useEffect(() => {
    if (messages.length > 0 && !loading) {
      const unreadMessages = messages.filter(
        (msg) => msg.recipientId === currentUserId && !msg.isRead
      )

      if (unreadMessages.length > 0) {
        // Mark all messages in thread as read
        fetch(`/api/messages/thread/read-all?itemId=${itemId}&userId=${otherUserId}`, {
          method: 'PATCH',
        }).catch((error) => {
          console.error('Error marking messages as read:', error)
        })
      }
    }
  }, [messages, itemId, otherUserId, currentUserId, loading])

  const handleMessageSent = (message: Message) => {
    if (onMessageSent) {
      onMessageSent(message)
    }
  }

  if (loading && messages.length === 0) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-20 w-3/4 rounded-lg" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Format error message for better UX
  const getErrorMessage = () => {
    if (error === 'ITEM_NOT_FOUND') {
      return {
        icon: PackageX,
        title: 'Item Not Available',
        message: 'This item is no longer available. You can still view the conversation history.',
      }
    }
    if (error === 'USER_NOT_FOUND') {
      return {
        icon: UserX,
        title: 'User No Longer Available',
        message: 'The other user is no longer available. You can still view the conversation history.',
      }
    }
    if (error === 'CONVERSATION_NOT_FOUND') {
      return {
        icon: AlertCircle,
        title: 'Conversation Not Found',
        message: 'This conversation could not be found or you do not have access to it.',
      }
    }
    if (error === 'RATE_LIMIT') {
      return {
        icon: AlertCircle,
        title: 'Too Many Requests',
        message: 'Please wait a moment before trying again.',
      }
    }
    if (error === 'UNAUTHORIZED') {
      return {
        icon: AlertCircle,
        title: 'Session Expired',
        message: 'Your session has expired. Please refresh the page.',
      }
    }
    return {
      icon: AlertCircle,
      title: 'Error Loading Thread',
      message: error || 'Something went wrong. Please try again.',
    }
  }

  if (error) {
    const errorInfo = getErrorMessage()
    const ErrorIcon = errorInfo.icon

    return (
      <div className={cn('flex flex-col h-full', className)}>
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/messages')}
              className="w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Messages
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <ErrorIcon className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  {errorInfo.title}
                </h3>
                <p className="text-muted-foreground">{errorInfo.message}</p>
              </div>
              {onRefresh && error !== 'RATE_LIMIT' && (
                <Button onClick={onRefresh} variant="outline" className="mt-4">
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Header with item context */}
        <CardHeader className="border-b">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/messages')}
              aria-label="Back to messages"
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              {item && (
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold truncate">
                    <Link
                      href={`/item/${item.id}`}
                      className="hover:underline focus:outline-none focus:underline"
                    >
                      {item.title}
                    </Link>
                  </h2>
                  <Badge
                    variant={item.type === 'lost' ? 'destructive' : 'default'}
                    className={cn(
                      'text-xs',
                      item.type === 'found' && 'border-found/20 bg-found text-found-foreground hover:bg-found/90'
                    )}
                  >
                    {item.type === 'lost' ? 'Lost' : 'Found'}
                  </Badge>
                </div>
              )}
              {otherUser && (
                <div className="flex items-center gap-2">
                  <UserLink userId={otherUser.id} displayName={otherUser.displayName}>
                    <Avatar
                      src={otherUser.avatarUrl}
                      alt={otherUser.displayName}
                      size="sm"
                    />
                  </UserLink>
                  <UserLink
                    userId={otherUser.id}
                    displayName={otherUser.displayName}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  />
                  <ReputationDisplay
                    score={otherUser.reputationScore}
                    variant="compact"
                    size="sm"
                    showEmoji={false}
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Messages container */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  No messages yet. Start the conversation!
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isOwnMessage = message.senderId === currentUserId
                const showSender =
                  index === 0 ||
                  messages[index - 1].senderId !== message.senderId ||
                  new Date(message.createdAt).getTime() -
                    new Date(messages[index - 1].createdAt).getTime() >
                    300000 // 5 minutes

                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={isOwnMessage}
                    showSender={showSender}
                  />
                )
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* Message input */}
        <div className="border-t p-4">
          {(!item || !otherUser) ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {!item && 'This item is no longer available. '}
              {!otherUser && 'The other user is no longer available. '}
              You can still view the conversation history.
            </div>
          ) : (
            <MessageInput
              itemId={itemId}
              recipientId={otherUserId}
              onMessageSent={handleMessageSent}
              disabled={loading || !item || !otherUser}
            />
          )}
        </div>
      </Card>
    </div>
  )
}
