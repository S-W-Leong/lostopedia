'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface SidebarContextType {
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}

interface AdminLayoutWrapperProps {
  children: React.ReactNode
  sidebar: React.ReactNode
  header: React.ReactNode
}

export function AdminLayoutWrapper({ children, sidebar, header }: AdminLayoutWrapperProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const desktopOffset = isDesktop ? (isExpanded ? 256 : 64) : 0

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024) // lg breakpoint
    }
    
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  return (
    <SidebarContext.Provider value={{ isExpanded, setIsExpanded }}>
      <div className="min-h-screen overflow-x-hidden bg-bg-base">
        {/* Admin Header - full width, overlays sidebar */}
        {header}
        
        <div className="flex min-w-0">
          {/* Sidebar */}
          {sidebar}
          
          {/* Main Content - dynamically adjust margin based on sidebar width */}
          {/* On mobile, sidebar overlays so no margin needed */}
          {/* On desktop (lg+), margin adjusts based on sidebar hover state */}
          <main 
            className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 transition-[margin,width] duration-300 sm:px-6 lg:px-8 lg:py-8"
            style={{
              marginLeft: desktopOffset ? `${desktopOffset}px` : '0',
              width: desktopOffset ? `calc(100% - ${desktopOffset}px)` : '100%',
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
