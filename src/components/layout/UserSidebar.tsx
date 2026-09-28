'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Search,
  Map,
  PlusCircle,
  Package,
  MessageSquare,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSidebar } from './UserLayoutWrapper'
import { Badge } from '@/components/ui/badge'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { useAuth } from '@/hooks/useAuth'
import { MESSAGING_ENABLED } from '@/lib/constants'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact: boolean
  protected: boolean
  showBadge?: boolean
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true, protected: true },
  { href: '/search', label: 'Browse', icon: Search, exact: true, protected: false },
  { href: '/map', label: 'Map', icon: Map, exact: true, protected: false },
  { href: '/post', label: 'Post Item', icon: PlusCircle, exact: true, protected: true },
  { href: '/my-items', label: 'My Items', icon: Package, exact: false, protected: true },
  ...(MESSAGING_ENABLED ? [{ href: '/messages', label: 'Messages', icon: MessageSquare, exact: false, protected: true, showBadge: true } as NavItem] : []),
]

export function UserSidebar() {
  const pathname = usePathname()
  const { profile, isLoading } = useAuth()
  const isGuest = !isLoading && !profile
  const navItems = isGuest ? ALL_NAV_ITEMS.filter((i) => !i.protected) : ALL_NAV_ITEMS

  const [isHovered, setIsHovered] = useState(false)
  const { setIsExpanded, mobileOpen, setMobileOpen } = useSidebar()
  const { unreadCount } = useUnreadCount({ enabled: !!profile, userId: profile?.id ?? '' })

  // Sidebar is collapsed by default on desktop, expands on hover
  // On mobile, always expanded when open
  const isExpanded = mobileOpen || isHovered

  // Update context when hover state changes
  useEffect(() => {
    setIsExpanded(isExpanded)
  }, [isExpanded, setIsExpanded])

  return (
    <>
      {/* Backdrop for mobile (drawer is toggled from the header hamburger) */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 top-16 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] bg-bg-elevated border-r border-border transition-transform duration-300 lg:transition-all',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0',
          // On desktop, use hover state; on mobile, always expanded when open
          'lg:w-16',
          isExpanded && 'lg:w-64'
        )}
        style={{ overflowY: 'hidden' }}
      >
        <nav className="flex flex-col h-full p-4">
          <div className="space-y-1 overflow-y-auto flex-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`)
              const showBadge = item.showBadge && unreadCount > 0

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center rounded-lg text-sm font-medium transition-colors group relative',
                    // When collapsed, center the icon; when expanded, add horizontal padding
                    isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5',
                    isActive
                      ? 'bg-accent-muted text-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-overlay'
                  )}
                  title={isExpanded ? undefined : item.label}
                >
                  <div className="relative flex-shrink-0">
                    <Icon className="h-5 w-5" />
                    {showBadge && (
                      <Badge
                        variant="destructive"
                        className={cn(
                          'absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs',
                          !isExpanded && 'h-4 min-w-4 px-0.5 text-[10px]'
                        )}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </div>
                  <span className={cn(
                    'transition-opacity duration-200 whitespace-nowrap',
                    isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                  )}>
                    {item.label}
                  </span>
                  {/* Tooltip for collapsed state */}
                  {!isExpanded && (
                    <span className="absolute left-full ml-2 px-2 py-1 text-xs text-text-primary bg-bg-elevated border border-border rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      {item.label}
                      {showBadge && (
                        <Badge
                          variant="destructive"
                          className="ml-1 h-4 min-w-4 flex items-center justify-center px-1 text-[10px]"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>
      </aside>
    </>
  )
}
