import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageThread } from '@/components/messages/MessageThread'
import { mockMessages } from '@/test/mocks/messages'
import { mockFetch, setupGlobalMocks } from '@/test/utils'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

/**
 * Integration tests for the complete message flow
 */
describe('Message Flow Integration', () => {
  beforeEach(() => {
    setupGlobalMocks()
    // jsdom does not implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should display messages in thread', async () => {
    const mockResponse = {
      success: true,
      messages: mockMessages,
      item: {
        id: 'item-1',
        title: 'Lost iPhone 13',
        imageUrl: 'https://example.com/item.jpg',
        type: 'lost' as const,
      },
      otherUser: {
        id: 'user-2',
        displayName: 'Jane Smith',
        avatarUrl: 'https://example.com/avatar2.jpg',
        reputationScore: 85,
      },
    }

    global.fetch = mockFetch(mockResponse)

    render(
      <MessageThread
        itemId="item-1"
        otherUserId="user-2"
        currentUserId="user-1"
        messages={mockMessages}
        item={mockResponse.item}
        otherUser={mockResponse.otherUser}
        onMessageSent={vi.fn()}
      />
    )

    // Check that all messages are displayed
    for (const message of mockMessages) {
      expect(screen.getByText(message.content)).toBeInTheDocument()
    }

    // Check that item title is displayed
    expect(screen.getByText('Lost iPhone 13')).toBeInTheDocument()

    // Check that other user name is displayed (header and bubbles both show name)
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThanOrEqual(1)
  })

  it('should send a message and update thread', async () => {
    const user = userEvent.setup()
    const onMessageSent = vi.fn()

    const mockSendResponse = {
      success: true,
      message: {
        id: 'msg-new',
        itemId: 'item-1',
        senderId: 'user-1',
        recipientId: 'user-2',
        content: 'New message',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    }

    let _fetchCallCount = 0
    global.fetch = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
      _fetchCallCount++
      if (url.includes('/api/messages') && !url.includes('thread')) {
        // POST to send message
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockSendResponse),
        } as Response)
      }
      return Promise.reject(new Error('Unexpected URL'))
    }) as typeof fetch

    render(
      <MessageThread
        itemId="item-1"
        otherUserId="user-2"
        currentUserId="user-1"
        messages={mockMessages}
        item={{
          id: 'item-1',
          title: 'Lost iPhone 13',
          imageUrl: null,
          type: 'lost',
        }}
        otherUser={{
          id: 'user-2',
          displayName: 'Jane Smith',
          avatarUrl: null,
          reputationScore: 85,
        }}
        onMessageSent={onMessageSent}
      />
    )

    // Find and type in message input
    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'New message')

    // Click send button (scope to form to avoid back button)
    const form = textarea.closest('form')!
    await user.click(within(form).getByRole('button'))

    // Wait for message to be sent
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: 'item-1',
          recipientId: 'user-2',
          content: 'New message',
        }),
      })
    })

    // Check that callback was called
    await waitFor(() => {
      expect(onMessageSent).toHaveBeenCalled()
    })
  })

  it('should handle error when sending message fails', async () => {
    const user = userEvent.setup()
    const onMessageSent = vi.fn()

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ success: false, error: 'Failed to send message' }),
      } as Response)
    )

    render(
      <MessageThread
        itemId="item-1"
        otherUserId="user-2"
        currentUserId="user-1"
        messages={mockMessages}
        item={{
          id: 'item-1',
          title: 'Lost iPhone 13',
          imageUrl: null,
          type: 'lost',
        }}
        otherUser={{
          id: 'user-2',
          displayName: 'Jane Smith',
          avatarUrl: null,
          reputationScore: 85,
        }}
        onMessageSent={onMessageSent}
      />
    )

    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'Test message')
    const form = textarea.closest('form')!
    await user.click(within(form).getByRole('button'))

    // Error message should be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to send message/i)).toBeInTheDocument()
    })

    // Callback should not be called on error
    expect(onMessageSent).not.toHaveBeenCalled()
  })

  it('should display empty state when no messages', () => {
    render(
      <MessageThread
        itemId="item-1"
        otherUserId="user-2"
        currentUserId="user-1"
        messages={[]}
        item={{
          id: 'item-1',
          title: 'Lost iPhone 13',
          imageUrl: null,
          type: 'lost',
        }}
        otherUser={{
          id: 'user-2',
          displayName: 'Jane Smith',
          avatarUrl: null,
          reputationScore: 85,
        }}
        onMessageSent={vi.fn()}
      />
    )

    expect(screen.getByText(/No messages yet/i)).toBeInTheDocument()
  })

  it('should display error state', () => {
    const onRefresh = vi.fn()

    render(
      <MessageThread
        itemId="item-1"
        otherUserId="user-2"
        currentUserId="user-1"
        messages={[]}
        error="Failed to load thread"
        onRefresh={onRefresh}
        onMessageSent={vi.fn()}
      />
    )

    expect(screen.getByText(/Failed to load thread/i)).toBeInTheDocument()
    expect(screen.getByText(/Try Again/i)).toBeInTheDocument()
  })

  it('should handle retry on error', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()

    render(
      <MessageThread
        itemId="item-1"
        otherUserId="user-2"
        currentUserId="user-1"
        messages={[]}
        error="Failed to load thread"
        onRefresh={onRefresh}
        onMessageSent={vi.fn()}
      />
    )

    const retryButton = screen.getByText(/Try Again/i)
    await user.click(retryButton)

    expect(onRefresh).toHaveBeenCalled()
  })
})

