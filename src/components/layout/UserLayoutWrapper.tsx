'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface SidebarContextType {
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}

interface UserLayoutWrapperProps {
  children: React.ReactNode
  sidebar: React.ReactNode
  header: React.ReactNode
}

export function UserLayoutWrapper({ children, sidebar, header }: UserLayoutWrapperProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024) // lg breakpoint
    }

    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Close the mobile drawer on navigation so it never lingers over the new page
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const previous = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = previous
      }
    }
  }, [mobileOpen])

  return (
    <SidebarContext.Provider value={{ isExpanded, setIsExpanded, mobileOpen, setMobileOpen }}>
      <div className="min-h-screen bg-bg-base">
        {/* User Header - minimal, only notifications and profile */}
        {header}

        <div className="flex">
          {/* Sidebar */}
          {sidebar}

          {/* Main Content - dynamically adjust margin based on sidebar width */}
          {/* On mobile, sidebar overlays so no margin needed */}
          {/* On desktop (lg+), margin adjusts based on sidebar hover state */}
          <main
            className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 transition-all duration-300"
            style={{
              marginLeft: isDesktop ? (isExpanded ? '256px' : '64px') : '0'
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
