'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageThread } from '@/components/messages/MessageThread'
import { useMessageThread } from '@/hooks/useMessageThread'
import type { Message } from '@/types'

function MessageThreadPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const itemId = searchParams.get('itemId')
  const userId = searchParams.get('userId')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)
    })
  }, [supabase, router])

  // Validate query params
  useEffect(() => {
    if (!itemId || !userId) {
      router.push('/messages')
    }
  }, [itemId, userId, router])

  // Use the useMessageThread hook for polling, Realtime, and data management
  const {
    messages,
    item,
    otherUser,
    loading,
    error,
    refreshThread,
    startPolling,
    stopPolling,
  } = useMessageThread(itemId, userId, currentUserId)

  // Handle authentication errors
  useEffect(() => {
    if (error === 'UNAUTHORIZED') {
      router.push('/login')
    }
  }, [error, router])

  // Start polling when user is authenticated and params are valid
  useEffect(() => {
    if (currentUserId && itemId && userId && !loading && error !== 'UNAUTHORIZED') {
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [currentUserId, itemId, userId, loading, error, startPolling, stopPolling])

  // Handle new message sent (MessageInput handles the API call, hook will poll for updates)
  const handleMessageSent = useCallback(
    (_message: Message) => {
      // MessageInput already sent the message via API
      // The hook will pick it up on the next poll
      // We could trigger an immediate refresh here, but polling will handle it
    },
    []
  )

  if (!itemId || !userId || !currentUserId) {
    return null
  }

  return (
    <div className="container max-w-4xl mx-auto py-4 sm:py-8">
      <div className="h-[calc(100dvh-8rem)] sm:h-[calc(100vh-12rem)] sm:min-h-[600px]">
        <MessageThread
          itemId={itemId}
          otherUserId={userId}
          currentUserId={currentUserId}
          messages={messages}
          item={item || undefined}
          otherUser={otherUser || undefined}
          loading={loading}
          error={error}
          onMessageSent={handleMessageSent}
          onRefresh={refreshThread}
          className="h-full"
        />
      </div>
    </div>
  )
}

function ThreadPageFallback() {
  return (
    <div className="container max-w-4xl mx-auto py-4 sm:py-8">
      <div className="h-[calc(100dvh-8rem)] sm:h-[calc(100vh-12rem)] sm:min-h-[600px] animate-pulse rounded-lg bg-muted" />
    </div>
  )
}export default function MessageThreadPage() {
  return (
    <Suspense fallback={<ThreadPageFallback />}>
      <MessageThreadPageContent />
    </Suspense>
  )
}