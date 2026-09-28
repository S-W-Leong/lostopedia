import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageBubble } from '../MessageBubble'
import { mockMessageWithUsers } from '@/test/mocks/messages'
import { formatDistanceToNow } from 'date-fns'

describe('MessageBubble', () => {
  it('should render message content', () => {
    render(
      <MessageBubble
        message={mockMessageWithUsers}
        isOwnMessage={true}
      />
    )

    expect(screen.getByText(mockMessageWithUsers.content)).toBeInTheDocument()
  })

  it('should show sender name for received messages', () => {
    render(
      <MessageBubble
        message={mockMessageWithUsers}
        isOwnMessage={false}
        showSender={true}
      />
    )

    expect(
      screen.getByText(mockMessageWithUsers.sender.displayName)
    ).toBeInTheDocument()
  })

  it('should show timestamp', () => {
    render(
      <MessageBubble
        message={mockMessageWithUsers}
        isOwnMessage={true}
      />
    )

    const timeAgo = formatDistanceToNow(new Date(mockMessageWithUsers.createdAt), {
      addSuffix: true,
    })
    expect(screen.getByText(new RegExp(timeAgo))).toBeInTheDocument()
  })

  it('should show read status for own messages', () => {
    const readMessage = {
      ...mockMessageWithUsers,
      isRead: true,
      readAt: new Date().toISOString(),
    }

    const { container } = render(
      <MessageBubble
        message={readMessage}
        isOwnMessage={true}
      />
    )

    // Check for read indicator (CheckCheck2 icon should be present)
    // The icon is rendered as SVG, so we check for its presence in the container
    const readIndicator = container.querySelector('svg')
    expect(readIndicator).toBeInTheDocument()
  })

  it('should not show sender name when showSender is false', () => {
    render(
      <MessageBubble
        message={mockMessageWithUsers}
        isOwnMessage={false}
        showSender={false}
      />
    )

    expect(
      screen.queryByText(mockMessageWithUsers.sender.displayName)
    ).not.toBeInTheDocument()
  })

  it('should apply different styling for own vs received messages', () => {
    const { container: ownContainer } = render(
      <MessageBubble
        message={mockMessageWithUsers}
        isOwnMessage={true}
      />
    )

    const { container: receivedContainer } = render(
      <MessageBubble
        message={mockMessageWithUsers}
        isOwnMessage={false}
      />
    )

    // Own messages use bg-primary, received use bg-muted (see MessageBubble.tsx)
    const ownBubble = ownContainer.querySelector('[class*="bg-primary"]')
    const receivedBubble = receivedContainer.querySelector('[class*="bg-muted"]')

    expect(ownBubble).toBeInTheDocument()
    expect(receivedBubble).toBeInTheDocument()
  })
})

