import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageInput } from '../MessageInput'
import { mockFetch, mockFetchError, setupGlobalMocks } from '@/test/utils'
import { mockMessage } from '@/test/mocks/messages'

describe('MessageInput', () => {
  beforeEach(() => {
    setupGlobalMocks()
  })

  it('should render message input', () => {
    const onMessageSent = vi.fn()
    render(
      <MessageInput
        itemId="item-1"
        recipientId="user-2"
        onMessageSent={onMessageSent}
      />
    )

    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('should disable send button when input is empty', () => {
    const onMessageSent = vi.fn()
    render(
      <MessageInput
        itemId="item-1"
        recipientId="user-2"
        onMessageSent={onMessageSent}
      />
    )

    const sendButton = screen.getByRole('button', { name: /send message/i })
    expect(sendButton).toBeDisabled()
  })

  it('should enable send button when input has content', async () => {
    const user = userEvent.setup()
    const onMessageSent = vi.fn()
    render(
      <MessageInput
        itemId="item-1"
        recipientId="user-2"
        onMessageSent={onMessageSent}
      />
    )

    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'Hello')

    const sendButton = screen.getByRole('button', { name: /send message/i })
    expect(sendButton).not.toBeDisabled()
  })

  it('should send message on submit', async () => {
    const user = userEvent.setup()
    const onMessageSent = vi.fn()
    const mockResponse = {
      success: true,
      message: mockMessage,
    }

    global.fetch = mockFetch(mockResponse)

    render(
      <MessageInput
        itemId="item-1"
        recipientId="user-2"
        onMessageSent={onMessageSent}
      />
    )

    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'Hello, is this available?')

    const sendButton = screen.getByRole('button', { name: /send message/i })
    await user.click(sendButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: 'item-1',
          recipientId: 'user-2',
          content: 'Hello, is this available?',
        }),
      })
    })

    await waitFor(() => {
      expect(onMessageSent).toHaveBeenCalledWith(mockMessage)
    })

    // Input should be cleared
    expect(textarea).toHaveValue('')
  })

  it('should send message on Enter key', async () => {
    const user = userEvent.setup()
    const onMessageSent = vi.fn()
    const mockResponse = {
      success: true,
      message: mockMessage,
    }

    global.fetch = mockFetch(mockResponse)

    render(
      <MessageInput
        itemId="item-1"
        recipientId="user-2"
        onMessageSent={onMessageSent}
      />
    )

    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'Hello{Enter}')

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('should not send message on Shift+Enter', async () => {
    const user = userEvent.setup()
    const onMessageSent = vi.fn()

    global.fetch = vi.fn()

    render(
      <MessageInput
        itemId="item-1"
        recipientId="user-2"
        onMessageSent={onMessageSent}
      />
    )

    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'Hello{Shift>}{Enter}{/Shift}')

    // Should not send, just add newline
    expect(global.fetch).not.toHaveBeenCalled()
    expect(textarea).toHaveValue('Hello\n')
  })

  it('should show error message on send failure', async () => {
    const user = userEvent.setup()
    const onMessageSent = vi.fn()

    global.fetch = mockFetchError('Failed to send message', 500)

    render(
      <MessageInput
        itemId="item-1"
        recipientId="user-2"
        onMessageSent={onMessageSent}
      />
    )

    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'Hello')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(screen.getByText(/Failed to send message/i)).toBeInTheDocument()
    })
  })

  it('should show authentication error message', async () => {
    const user = userEvent.setup()
    const onMessageSent = vi.fn()

    global.fetch = mockFetchError('Unauthorized', 401)

    render(
      <MessageInput
        itemId="item-1"
        recipientId="user-2"
        onMessageSent={onMessageSent}
      />
    )

    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'Hello')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/session has expired/i)
      ).toBeInTheDocument()
    })
  })

  it('should show character counter when near limit', async () => {
    const user = userEvent.setup()
    const onMessageSent = vi.fn()

    render(
      <MessageInput
        itemId="item-1"
        recipientId="user-2"
        onMessageSent={onMessageSent}
      />
    )

    const textarea = screen.getByPlaceholderText('Type your message...')
    // Type near the limit (2000 chars - 50 = 1950)
    const longText = 'a'.repeat(1950)
    textarea.focus()
    await user.paste(longText)

    await waitFor(() => {
      expect(screen.getByText(/50/)).toBeInTheDocument()
    })
  })

  it('should be disabled when disabled prop is true', () => {
    const onMessageSent = vi.fn()
    render(
      <MessageInput
        itemId="item-1"
        recipientId="user-2"
        onMessageSent={onMessageSent}
        disabled={true}
      />
    )

    const textarea = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByRole('button', { name: /send message/i })

    expect(textarea).toBeDisabled()
    expect(sendButton).toBeDisabled()
  })

  it('should dismiss error message', async () => {
    const user = userEvent.setup()
    const onMessageSent = vi.fn()

    global.fetch = mockFetchError('Failed to send message', 500)

    render(
      <MessageInput
        itemId="item-1"
        recipientId="user-2"
        onMessageSent={onMessageSent}
      />
    )

    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'Hello')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(screen.getByText(/Failed to send message/i)).toBeInTheDocument()
    })

    const dismissButton = screen.getByText('Dismiss')
    await user.click(dismissButton)

    await waitFor(() => {
      expect(
        screen.queryByText(/Failed to send message/i)
      ).not.toBeInTheDocument()
    })
  })
})
