'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Search,
  PlusCircle,
  MessageSquare,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Package,
  Map,
  Shield,
  HelpCircle,
} from 'lucide-react'
import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/lib/supabase/auth'
import { useAuth } from '@/hooks/useAuth'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { useNotificationCount } from '@/hooks/useNotificationCount'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { MESSAGING_ENABLED } from '@/lib/constants'
import { organization } from '@/lib/organization/config'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/search', label: 'Browse', icon: Search },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/post', label: 'Post Item', icon: PlusCircle },
  { href: '/my-items', label: 'My Items', icon: Package },
  ...(MESSAGING_ENABLED ? [{ href: '/messages', label: 'Messages', icon: MessageSquare }] : []),
]

export function Header() {
  const pathname = usePathname()
  const { profile, isLoading } = useAuth()
  const countEnabled = Boolean(profile) && !isLoading
  const { unreadCount } = useUnreadCount({ enabled: MESSAGING_ENABLED && countEnabled, userId: profile?.id ?? '' })
  const { unreadCount: notificationCount } = useNotificationCount({ enabled: countEnabled, userId: profile?.id ?? '' })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false)
  const notificationTriggerRef = useRef<HTMLButtonElement>(null)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-elevated/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center transition-transform group-hover:scale-105">
              <Image
                src={organization.logoPath}
                alt={`${organization.name} logo`}
                width={36}
                height={36}
                className="w-9 h-9"
              />
            </div>
            <span className="text-display text-xl text-text-primary hidden sm:block">
              {organization.name}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const showBadge = item.href === '/messages' && unreadCount > 0
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-muted text-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-overlay'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {showBadge && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                ref={notificationTriggerRef}
                type="button"
                onClick={() => setNotificationMenuOpen(!notificationMenuOpen)}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-overlay hover:text-text-primary"
                aria-label="Notifications"
                aria-haspopup="dialog"
                aria-expanded={notificationMenuOpen}
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </button>
              <NotificationDropdown
                isOpen={notificationMenuOpen}
                onClose={() => setNotificationMenuOpen(false)}
                triggerRef={notificationTriggerRef}
              />
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-2 rounded-md px-2 transition-colors hover:bg-bg-overlay sm:px-3"
                  aria-label={isLoading ? 'Open user menu' : `Open menu for ${profile?.display_name || 'User'}`}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || 'User'}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted">
                      <User className="h-4 w-4 text-accent" />
                    </div>
                  )}
                  <span className="hidden max-w-[120px] truncate text-sm text-text-primary lg:block">
                    {isLoading ? '...' : profile?.display_name || 'User'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help">
                    <HelpCircle className="h-4 w-4" />
                    Help & Support
                  </Link>
                </DropdownMenuItem>
                {profile?.is_admin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-danger focus:bg-danger/10 focus:text-danger"
                  onSelect={(event) => {
                    event.preventDefault()
                    void handleSignOut()
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-overlay hover:text-text-primary md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-bg-elevated animate-fade-in">
          <nav className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const showBadge = item.href === '/messages' && unreadCount > 0
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-muted text-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-overlay'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                  {showBadge && (
                    <Badge
                      variant="destructive"
                      className="ml-auto h-5 min-w-5 flex items-center justify-center px-1.5 text-xs"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
