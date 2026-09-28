import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationCount } from '../useNotificationCount'
import { useUnreadCount } from '../useUnreadCount'

const realtime = vi.hoisted(() => ({
  notificationOptions: null as null | Record<string, unknown>,
  messageOptions: null as null | Record<string, unknown>,
}))

vi.mock('../useRealtimeNotifications', () => ({
  useRealtimeNotifications: (options: Record<string, unknown>) => {
    realtime.notificationOptions = options
  },
}))

vi.mock('../useRealtimeMessages', () => ({
  useRealtimeMessages: (options: Record<string, unknown>) => {
    realtime.messageOptions = options
  },
}))

describe('count hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    realtime.notificationOptions = null
    realtime.messageOptions = null
  })

  it('fetches notification count once initially and refreshes on a Realtime event', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, unreadCount: 2 }),
    } as Response)

    renderHook(() => useNotificationCount({ enabled: true, userId: 'user-1' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    await act(async () => {
      const onNewNotification = realtime.notificationOptions?.onNewNotification as () => void
      onNewNotification()
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('fetches unread messages once initially and makes no guest requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, count: 1 }),
    } as Response)

    const signedIn = renderHook(() => useUnreadCount({ enabled: true, userId: 'user-1' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    signedIn.unmount()

    renderHook(() => useUnreadCount({ enabled: false, userId: '' }))
    await act(async () => Promise.resolve())
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
