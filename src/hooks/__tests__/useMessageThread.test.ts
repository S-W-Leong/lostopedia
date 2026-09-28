import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMessageThread } from '../useMessageThread'
import { mockFetch, mockFetchError, setupGlobalMocks } from '@/test/utils'
import { mockMessages } from '@/test/mocks/messages'

describe('useMessageThread', () => {
  beforeEach(() => {
    setupGlobalMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch thread data on mount', async () => {
    const mockResponse = {
      success: true,
      messages: mockMessages,
      item: {
        id: 'item-1',
        title: 'Lost iPhone 13',
        imageUrl: 'https://example.com/item.jpg',
        type: 'lost',
      },
      otherUser: {
        id: 'user-2',
        displayName: 'Jane Smith',
        avatarUrl: 'https://example.com/avatar2.jpg',
        reputationScore: 85,
      },
    }

    global.fetch = mockFetch(mockResponse)

    const { result } = renderHook(() => useMessageThread('item-1', 'user-2'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Hook auto-marks as read, so isRead/readAt may differ from mockMessages
    expect(result.current.messages).toHaveLength(mockMessages.length)
    expect(result.current.messages.map((m) => ({ id: m.id, content: m.content }))).toEqual(
      mockMessages.map((m) => ({ id: m.id, content: m.content }))
    )
    expect(result.current.item).toEqual(mockResponse.item)
    expect(result.current.otherUser).toEqual(mockResponse.otherUser)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    global.fetch = mockFetchError('Failed to fetch thread', 500)

    const { result } = renderHook(() => useMessageThread('item-1', 'user-2'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.messages).toEqual([])
    expect(result.current.error).toBe('Failed to fetch thread')
  })

  it('should handle authentication errors', async () => {
    global.fetch = mockFetchError('Unauthorized', 401)

    const { result } = renderHook(() => useMessageThread('item-1', 'user-2'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('UNAUTHORIZED')
  })

  it('should handle item not found errors', async () => {
    global.fetch = mockFetchError('Item not found', 404)

    const { result } = renderHook(() => useMessageThread('item-1', 'user-2'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('ITEM_NOT_FOUND')
  })

  it('should handle user not found errors', async () => {
    global.fetch = mockFetchError('User not found', 404)

    const { result } = renderHook(() => useMessageThread('item-1', 'user-2'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('USER_NOT_FOUND')
  })

  it('should send a message', async () => {
    const mockResponse = {
      success: true,
      messages: mockMessages,
      item: {
        id: 'item-1',
        title: 'Lost iPhone 13',
        imageUrl: 'https://example.com/item.jpg',
        type: 'lost',
      },
      otherUser: {
        id: 'user-2',
        displayName: 'Jane Smith',
        avatarUrl: 'https://example.com/avatar2.jpg',
        reputationScore: 85,
      },
    }

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
      if (url.includes('/api/messages/thread')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse),
        } as Response)
      } else if (url.includes('/api/messages') && !url.includes('thread')) {
        // POST to send message
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockSendResponse),
        } as Response)
      }
      return Promise.reject(new Error('Unexpected URL'))
    }) as typeof fetch

    const { result } = renderHook(() => useMessageThread('item-1', 'user-2'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Send message
    await result.current.sendMessage('New message')

    // Initial GET + mark-as-read PATCH + POST send + fetchThread after send (+ optional polling)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/messages',
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('New message') })
      )
    })
  })

  it('should refresh thread', async () => {
    const mockResponse = {
      success: true,
      messages: mockMessages,
      item: {
        id: 'item-1',
        title: 'Lost iPhone 13',
        imageUrl: 'https://example.com/item.jpg',
        type: 'lost',
      },
      otherUser: {
        id: 'user-2',
        displayName: 'Jane Smith',
        avatarUrl: 'https://example.com/avatar2.jpg',
        reputationScore: 85,
      },
    }

    global.fetch = mockFetch(mockResponse)

    const { result } = renderHook(() => useMessageThread('item-1', 'user-2'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Refresh
    result.current.refreshThread()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Initial fetch + mark-as-read + refresh (+ optional polling)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/messages/thread'),
      expect.anything()
    )
  })

  it('should start and stop polling', async () => {
    const mockResponse = {
      success: true,
      messages: mockMessages,
      item: {
        id: 'item-1',
        title: 'Lost iPhone 13',
        imageUrl: 'https://example.com/item.jpg',
        type: 'lost',
      },
      otherUser: {
        id: 'user-2',
        displayName: 'Jane Smith',
        avatarUrl: 'https://example.com/avatar2.jpg',
        reputationScore: 85,
      },
    }

    global.fetch = mockFetch(mockResponse)

    const { result } = renderHook(() => useMessageThread('item-1', 'user-2'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    result.current.startPolling()
    await waitFor(() => {
      expect(result.current.isPolling).toBe(true)
    })

    result.current.stopPolling()
    await waitFor(() => {
      expect(result.current.isPolling).toBe(false)
    })
  })

  it('should not fetch if itemId or otherUserId is null', async () => {
    const { result } = renderHook(() => useMessageThread(null, null))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Missing required parameters')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

