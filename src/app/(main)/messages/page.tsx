'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConversationList } from '@/components/messages/ConversationList'
import { useMessages } from '@/hooks/useMessages'
import { Button } from '@/components/ui/button'

export default function MessagesPage() {
  const router = useRouter()
  const supabase = createClient()
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

  // Use the useMessages hook for realtime updates and data management
  const {
    conversations,
    loading,
    error,
    refreshConversations,
    startPolling,
    stopPolling,
  } = useMessages({ userId: currentUserId, useRealtime: true })

  // Handle authentication errors
  useEffect(() => {
    if (error === 'UNAUTHORIZED') {
      router.push('/login')
    }
  }, [error, router])

  // Start polling when user is authenticated
  useEffect(() => {
    if (currentUserId) {
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [currentUserId, startPolling, stopPolling])

  const handleConversationClick = useCallback((itemId: string, userId: string) => {
    router.push(`/messages/thread?itemId=${itemId}&userId=${userId}`)
  }, [router])

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && error !== 'UNAUTHORIZED' && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center justify-between">
              <span>
                {error === 'RATE_LIMIT'
                  ? 'Too many requests. Please wait a moment.'
                  : error}
              </span>
              {error !== 'RATE_LIMIT' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshConversations}
                  className="ml-2 h-6 px-2 text-xs"
                >
                  Retry
                </Button>
              )}
            </div>
          )}
          <ConversationList
            conversations={conversations}
            onConversationClick={handleConversationClick}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  )
}

