import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as messages from '../route'
import * as count from '../unread-count/route'
import * as thread from '../thread/route'
import * as threadRead from '../thread/read-all/route'
import * as messageRead from '../[id]/read/route'
import * as notifications from '../../notifications/route'
import * as notificationRead from '../../notifications/[id]/read/route'
import * as notificationsRead from '../../notifications/read-all/route'

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/ratelimit', () => ({ rateLimiters: {} }))
vi.mock('@/lib/constants', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/constants')>(),
  MESSAGING_ENABLED: false,
  NOTIFICATIONS_ENABLED: false,
}))

describe('disabled communication APIs', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['message list', messages.GET],
    ['message send', messages.POST],
    ['message count', count.GET],
    ['thread', thread.GET],
    ['thread read', threadRead.PATCH],
    ['message read', messageRead.PATCH],
    ['notification list', notifications.GET],
    ['notification read', notificationRead.PATCH],
    ['notifications read all', notificationsRead.PATCH],
  ])('%s returns 404 without contacting Supabase', async (_name, handler) => {
    const response = await handler(new NextRequest('http://localhost/api/test'), {
      params: Promise.resolve({ id: 'test-id' }),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ success: false })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
})
