'use client'
import * as React from 'react'

import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { cn } from '@/lib/utils/cn'
import { APP_CONFIG } from '@/lib/constants'
import type { Message } from '@/types'

export interface MessageInputProps {
  itemId: string
  recipientId: string
  onMessageSent: (message: Message) => void
  disabled?: boolean
  className?: string
}

export function MessageInput({
  itemId,
  recipientId,
  onMessageSent,
  disabled = false,
  className,
}: MessageInputProps) {
  const [content, setContent] = React.useState('')
  const [isSending, setIsSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [content])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedContent = content.trim()
    if (!trimmedContent || isSending || disabled) return

    if (trimmedContent.length > APP_CONFIG.maxMessageLength) {
      return
    }

    setIsSending(true)

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          recipientId,
          content: trimmedContent,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Call callback with the new message
      onMessageSent(data.message)

      // Clear input and error
      setContent('')
      setError(null)

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      
      // Handle specific error types
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        setError('Your session has expired. Please refresh the page and try again.')
      } else if (errorMessage.includes('Item not found') || errorMessage.includes('not available')) {
        setError('This item is no longer available for messaging.')
      } else if (errorMessage.includes('Recipient not found') || errorMessage.includes('User not found')) {
        setError('The recipient is no longer available.')
      } else if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        setError('Too many requests. Please wait a moment and try again.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (but allow Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const remainingChars = APP_CONFIG.maxMessageLength - content.length
  const isNearLimit = remainingChars < 50

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-2', className)}>
      {error && (
        <Alert variant="error" className="py-2">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm">{error}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-6 px-2 text-xs"
            >
              Dismiss
            </Button>
          </div>
        </Alert>
      )}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled || isSending}
          maxLength={APP_CONFIG.maxMessageLength}
          className="min-h-[60px] max-h-[200px] resize-none pr-12"
          rows={1}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          {content.length > 0 && (
            <span
              className={cn(
                'text-xs text-muted-foreground',
                isNearLimit && 'text-destructive'
              )}
            >
              {remainingChars}
            </span>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={!content.trim() || isSending || disabled}
            aria-label="Send message"
            className="h-11 w-11"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}
