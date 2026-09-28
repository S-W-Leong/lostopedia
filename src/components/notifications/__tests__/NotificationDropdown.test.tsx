'use client'

import * as React from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/test/utils'
import { NotificationDropdown } from '../NotificationDropdown'
import type { Notification } from '@/types'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  },
  useNotificationsReturn: {
    notifications: [] as Notification[],
    total: 0,
    unreadCount: 0,
    loading: false,
    error: null,
    markAsRead: vi.fn(async () => true),
    markAllAsRead: vi.fn(async () => 0),
    refreshNotifications: vi.fn(async () => {}),
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    isPolling: false,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}))

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => mocks.useNotificationsReturn,
}))

function NotificationDropdownHarness() {
  const [isOpen, setIsOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  return (
    <div>
      <button ref={triggerRef} type="button" onClick={() => setIsOpen(true)}>
        Open notifications
      </button>
      <NotificationDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
      />
    </div>
  )
}

describe('NotificationDropdown', () => {
  beforeEach(() => {
    mocks.router.push.mockReset()
    mocks.useNotificationsReturn.notifications = [
      {
        id: 'notif-1',
        userId: 'user-1',
        type: 'new_message',
        title: 'New message',
        message: 'Someone replied to your item.',
        relatedItemId: 'item-1',
        relatedMessageId: 'message-1',
        actionUrl: '/messages/thread?itemId=item-1&userId=user-2',
        isRead: false,
        readAt: null,
        createdAt: new Date('2026-03-31T08:00:00.000Z').toISOString(),
      },
    ]
    mocks.useNotificationsReturn.total = 1
    mocks.useNotificationsReturn.unreadCount = 1
    mocks.useNotificationsReturn.loading = false
    mocks.useNotificationsReturn.error = null
    mocks.useNotificationsReturn.markAsRead.mockClear()
    mocks.useNotificationsReturn.markAllAsRead.mockClear()
    mocks.useNotificationsReturn.startPolling.mockClear()
    mocks.useNotificationsReturn.stopPolling.mockClear()
  })

  it('opens as a dialog, focuses the primary action, and restores focus on close', async () => {
    const user = userEvent.setup()

    render(<NotificationDropdownHarness />)

    const trigger = screen.getByRole('button', { name: /open notifications/i })
    await user.click(trigger)

    const dialog = await screen.findByRole('dialog', { name: /notifications/i })
    const markAllButton = screen.getByRole('button', { name: /mark all read/i })

    expect(dialog).toBeInTheDocument()
    await waitFor(() => {
      expect(markAllButton).toHaveFocus()
    })

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /notifications/i })).not.toBeInTheDocument()
    })
    expect(trigger).toHaveFocus()
  })

  it('focuses the first notification when there is no unread summary action', async () => {
    const user = userEvent.setup()
    mocks.useNotificationsReturn.notifications = [
      {
        ...mocks.useNotificationsReturn.notifications[0],
        id: 'notif-2',
        isRead: true,
        readAt: new Date('2026-03-31T09:00:00.000Z').toISOString(),
      },
    ]
    mocks.useNotificationsReturn.unreadCount = 0

    render(<NotificationDropdownHarness />)

    await user.click(screen.getByRole('button', { name: /open notifications/i }))

    const notificationButton = await screen.findByRole('button', { name: /new message/i })

    await waitFor(() => {
      expect(notificationButton).toHaveFocus()
    })
  })
})
