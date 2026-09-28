'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Package,
  AlertTriangle,
  KeyRound,
  Menu,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSidebar } from './AdminLayoutWrapper'

type AdminNavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  exact?: boolean
}

const navItems: AdminNavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users,
  },
  {
    href: '/admin/items',
    label: 'Items',
    icon: Package,
  },
  {
    href: '/admin/flags',
    label: 'Flags',
    icon: AlertTriangle,
  },
]

const adminAutomationNavItems: AdminNavItem[] =
  process.env.NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED === 'true'
    ? [
        {
          href: '/admin/automation-tokens',
          label: 'Automation Tokens',
          icon: KeyRound,
        },
      ]
    : []

const visibleNavItems = [...navItems, ...adminAutomationNavItems]

export function AdminSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const { setIsExpanded } = useSidebar()

  // Sidebar is collapsed by default on desktop, expands on hover
  // On mobile, always expanded when open
  const isExpanded = mobileOpen || isHovered

  // Update context when hover state changes
  useEffect(() => {
    setIsExpanded(isExpanded)
  }, [isExpanded, setIsExpanded])

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 rounded-lg bg-bg-elevated border border-border shadow-lg hover:bg-bg-overlay transition-colors"
        aria-label="Toggle menu"
      >
        {mobileOpen ? (
          <X className="h-5 w-5 text-text-primary" />
        ) : (
          <Menu className="h-5 w-5 text-text-primary" />
        )}
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] bg-bg-elevated border-r border-border transition-all duration-300',
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
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              const isActive = item.exact 
                ? pathname === item.href 
                : pathname.startsWith(item.href) && pathname !== '/admin'
              
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
                  <Icon className="h-5 w-5 flex-shrink-0" />
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
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Back to Main App */}
          <div className="mt-auto pt-4 border-t border-border">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-overlay transition-colors group relative"
              title={isExpanded ? undefined : 'Back to App'}
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
              <span className={cn(
                'transition-opacity duration-200 whitespace-nowrap',
                isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
              )}>
                Back to App
              </span>
              {/* Tooltip for collapsed state */}
              {!isExpanded && (
                <span className="absolute left-full ml-2 px-2 py-1 text-xs text-text-primary bg-bg-elevated border border-border rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Back to App
                </span>
              )}
            </Link>
          </div>
        </nav>
      </aside>
    </>
  )
}
