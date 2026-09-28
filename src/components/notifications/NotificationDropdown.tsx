'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { NotificationItem } from './NotificationItem'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

export interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
  triggerRef?: React.RefObject<HTMLButtonElement | null>
  className?: string
}

export function NotificationDropdown({
  isOpen,
  onClose,
  triggerRef,
  className,
}: NotificationDropdownProps) {
  const router = useRouter()
  const markAllButtonRef = React.useRef<HTMLButtonElement>(null)
  const firstItemRef = React.useRef<HTMLButtonElement>(null)
  const { user } = useAuth()
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    startPolling,
    stopPolling,
  } = useNotifications({ 
    limit: 15,
    userId: user?.id ?? null,
    useRealtime: true,
    enabled: !!user,
  })

  // Start polling when dropdown is open
  React.useEffect(() => {
    if (isOpen) {
      startPolling()
    } else {
      stopPolling()
    }
    return () => {
      stopPolling()
    }
  }, [isOpen, startPolling, stopPolling])

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
      onClose()
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const handleOpenAutoFocus = (event: Event) => {
    event.preventDefault()
    requestAnimationFrame(() => {
      if (unreadCount > 0) {
        markAllButtonRef.current?.focus()
        return
      }
      firstItemRef.current?.focus()
    })
  }

  const handleCloseAutoFocus = (event: Event) => {
    event.preventDefault()
    triggerRef?.current?.focus()
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-10 bg-transparent" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={handleOpenAutoFocus}
          onCloseAutoFocus={handleCloseAutoFocus}
          className={cn(
            'fixed right-4 top-20 z-20 w-[calc(100vw-2rem)] max-w-96 rounded-xl border border-border bg-bg-elevated shadow-lg outline-none',
            className
          )}
        >
          <div className="border-b border-border p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-text-secondary" />
                <DialogPrimitive.Title className="text-sm font-semibold text-text-primary">
                  Notifications
                </DialogPrimitive.Title>
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="flex h-5 min-w-5 items-center justify-center px-1.5 text-xs"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  ref={markAllButtonRef}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="whitespace-nowrap px-3"
                >
                  <CheckCheck className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Mark all read</span>
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto sm:max-h-[400px]">
            {loading ? (
              <div className="space-y-3 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="mt-0.5 h-4 w-4 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12">
                <Bell className="mb-4 h-12 w-12 text-text-tertiary" />
                <p className="text-center text-sm text-text-secondary">
                  No notifications yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border p-2">
                {notifications.map((notification, index) => (
                  <NotificationItem
                    key={notification.id}
                    ref={index === 0 && unreadCount === 0 ? firstItemRef : undefined}
                    notification={notification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
