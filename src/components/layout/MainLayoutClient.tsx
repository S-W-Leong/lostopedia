'use client'

import { usePathname } from 'next/navigation'
import { UserSidebar } from '@/components/layout/UserSidebar'
import { MinimalUserHeader } from '@/components/layout/MinimalUserHeader'
import { UserLayoutWrapper } from '@/components/layout/UserLayoutWrapper'

// Routes that should NOT have the sidebar (only minimal header)
const NO_SIDEBAR_ROUTES: string[] = []

interface MainLayoutClientProps {
  children: React.ReactNode
}

export function MainLayoutClient({ children }: MainLayoutClientProps) {
  const pathname = usePathname()
  const shouldShowSidebar = !NO_SIDEBAR_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))

  if (shouldShowSidebar) {
    return (
      <UserLayoutWrapper
        header={<MinimalUserHeader />}
        sidebar={<UserSidebar />}
      >
        {children}
      </UserLayoutWrapper>
    )
  }

  // For routes without sidebar, just show minimal header
  return (
    <div className="min-h-screen bg-bg-base">
      <MinimalUserHeader />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
