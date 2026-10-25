import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNotificationCount } from '../useNotificationCount'
import { useUnreadCount } from '../useUnreadCount'
import { useNotifications } from '../useNotifications'
import { useMessages } from '../useMessages'
import { useMessageThread } from '../useMessageThread'
import { useRealtimeMessages } from '../useRealtimeMessages'
import { useRealtimeNotifications } from '../useRealtimeNotifications'

const mocks = vi.hoisted(() => {
  const channel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() }
  return { createClient: vi.fn(() => ({ channel: vi.fn(() => channel), removeChannel: vi.fn() })) }
})
vi.mock('@/lib/constants', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/constants')>(),
  MESSAGING_ENABLED: false,
  NOTIFICATIONS_ENABLED: false,
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: mocks.createClient }))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('disabled communication features', () => {
  it('does not subscribe when Realtime hooks are called directly', () => {
    renderHook(() => {
      useRealtimeMessages({ userId: 'user-1', enabled: true })
      useRealtimeNotifications({ userId: 'user-1', enabled: true })
    })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('makes no requests or subscriptions even when authenticated and explicitly refreshed', async () => {
    vi.useFakeTimers()
    const requestPermission = vi.fn()
    vi.stubGlobal('Notification', { permission: 'default', requestPermission })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)
    const { result } = renderHook(() => ({
      notifications: useNotifications({ enabled: true, userId: 'user-1', limit: 15 }),
      notificationCount: useNotificationCount({ enabled: true, userId: 'user-1' }),
      messageCount: useUnreadCount({ enabled: true, userId: 'user-1' }),
      inbox: useMessages({ userId: 'user-1' }),
      thread: useMessageThread('item-1', 'user-2', 'user-1'),
    }))

    await act(async () => {
      await result.current.notifications.refreshNotifications()
      await result.current.notifications.markAsRead('notification-1')
      await result.current.notifications.markAllAsRead()
      await result.current.notificationCount.refreshCount()
      await result.current.messageCount.refreshCount()
      await result.current.inbox.refreshConversations()
      await result.current.inbox.sendMessage('item-1', 'user-2', 'hello')
      await result.current.thread.refreshThread()
      await result.current.thread.sendMessage('hello')
      await result.current.thread.markAsRead()
      window.dispatchEvent(new Event('notificationsUpdated'))
      for (const hook of Object.values(result.current)) hook.startPolling()
      await vi.advanceTimersByTimeAsync(600_000)
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(requestPermission).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
    for (const hook of Object.values(result.current)) {
      expect(hook.loading).toBe(false)
      expect(hook.isPolling).toBe(false)
    }
  })
})
