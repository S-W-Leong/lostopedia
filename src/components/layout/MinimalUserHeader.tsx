'use client'

import { useState } from 'react'
import { Bell, User, LogOut, Shield, LogIn, HelpCircle, Menu } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { signOut } from '@/lib/supabase/auth'
import { useAuth } from '@/hooks/useAuth'
import { useNotificationCount } from '@/hooks/useNotificationCount'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { useSidebar } from './UserLayoutWrapper'
import { organization } from '@/lib/organization/config'

export function MinimalUserHeader() {
  const { profile, isLoading } = useAuth()
  const { unreadCount: notificationCount } = useNotificationCount({ enabled: !!profile, userId: profile?.id ?? '' })
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false)
  const { mobileOpen, setMobileOpen } = useSidebar()
  const isGuest = !isLoading && !profile

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg-elevated/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
        {/* Left: mobile drawer toggle + logo */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-overlay transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo: always links to landing page */}
          <Link href="/" className="flex items-center gap-2 group">
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
        </div>

        {/* Right side: Guest = Login/Sign up; Logged in = Notifications + User Menu */}
        <div className="flex items-center gap-2">
          {isGuest ? (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-overlay rounded-md transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Log in
              </Link>
              <Link
                href="/signup"
                className="btn btn-primary text-sm px-4 py-2"
              >
                Sign up
              </Link>
            </div>
          ) : (
            <>
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationMenuOpen(!notificationMenuOpen)}
                  className="relative p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-overlay transition-colors"
                  aria-label="Notifications"
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
                />
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-bg-overlay transition-colors"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || 'User'}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-accent-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-accent" />
                    </div>
                  )}
                  <span className="text-sm text-text-primary hidden lg:block max-w-[120px] truncate">
                    {isLoading ? '...' : profile?.display_name || 'User'}
                  </span>
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-bg-elevated shadow-lg z-20 animate-fade-in">
                      <div className="p-2">
                        <Link
                          href="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-overlay rounded-md transition-colors"
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>
                        <Link
                          href="/help"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-overlay rounded-md transition-colors"
                        >
                          <HelpCircle className="h-4 w-4" />
                          Help & Support
                        </Link>
                        {profile?.is_admin && (
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-overlay rounded-md transition-colors"
                          >
                            <Shield className="h-4 w-4" />
                            Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-md transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
