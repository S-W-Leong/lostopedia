import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMessages } from '../useMessages'
import { mockFetch, mockFetchError, setupGlobalMocks } from '@/test/utils'
import { mockConversations } from '@/test/mocks/messages'

describe('useMessages', () => {
  beforeEach(() => {
    setupGlobalMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch conversations on mount', async () => {
    const mockResponse = {
      success: true,
      conversations: mockConversations,
      total: mockConversations.length,
    }

    global.fetch = mockFetch(mockResponse)

    const { result } = renderHook(() => useMessages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.conversations).toEqual(mockConversations)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    global.fetch = mockFetchError('Failed to fetch conversations', 500)

    const { result } = renderHook(() => useMessages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.conversations).toEqual([])
    expect(result.current.error).toBe('Failed to fetch conversations')
  })

  it('should handle authentication errors', async () => {
    global.fetch = mockFetchError('Unauthorized', 401)

    const { result } = renderHook(() => useMessages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('UNAUTHORIZED')
  })

  it('should send a message', async () => {
    const mockResponse = {
      success: true,
      conversations: mockConversations,
      total: mockConversations.length,
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

    let fetchCallCount = 0
    global.fetch = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
      fetchCallCount++
      if (url.includes('/api/messages') && fetchCallCount === 1) {
        // First call is GET for conversations
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse),
        } as Response)
      } else if (url.includes('/api/messages') && fetchCallCount === 2) {
        // Second call is POST for sending message
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockSendResponse),
        } as Response)
      } else {
        // Third call is GET to refresh conversations
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse),
        } as Response)
      }
    }) as typeof fetch

    const { result } = renderHook(() => useMessages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Send message
    await result.current.sendMessage('item-1', 'user-2', 'New message')

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })
  })

  it('should refresh conversations', async () => {
    const mockResponse = {
      success: true,
      conversations: mockConversations,
      total: mockConversations.length,
    }

    global.fetch = mockFetch(mockResponse)

    const { result } = renderHook(() => useMessages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Refresh
    result.current.refreshConversations()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('should start and stop polling', async () => {
    const mockResponse = {
      success: true,
      conversations: mockConversations,
      total: mockConversations.length,
    }

    global.fetch = mockFetch(mockResponse)

    const { result } = renderHook(() => useMessages())

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
})

