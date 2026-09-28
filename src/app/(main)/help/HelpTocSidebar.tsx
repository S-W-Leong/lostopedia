'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { TocItem } from './parseHeadings'

interface HelpTocSidebarProps {
  toc: TocItem[]
  className?: string
}

export function HelpTocSidebar({ toc, className }: HelpTocSidebarProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (toc.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSlug(entry.target.id)
            break
          }
        }
      },
      {
        rootMargin: '-80px 0% -70% 0%',
        threshold: 0,
      }
    )

    const ids = toc.map((t) => t.slug)
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [toc])

  if (toc.length === 0) return null

  const nav = (
    <nav className="space-y-1" aria-label="On this page">
      {toc.map((item) => (
        <a
          key={item.slug}
          href={`#${item.slug}`}
          onClick={() => setMobileOpen(false)}
          className={cn(
            'block rounded-md py-1.5 px-3 text-sm transition-colors',
            item.level === 2 && 'font-medium text-text-primary',
            item.level === 3 && 'pl-5 text-text-secondary',
            activeSlug === item.slug
              ? 'bg-accent-muted text-accent'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-overlay'
          )}
        >
          {item.text}
        </a>
      ))}
    </nav>
  )

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <aside
        className={cn(
          'hidden lg:block shrink-0 w-56 pt-8',
          'sticky top-24 self-start max-h-[calc(100vh-6rem)] overflow-y-auto',
          className
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 px-3">
          On this page
        </p>
        {nav}
      </aside>

      {/* Mobile: collapsible "On this page" bar */}
      <div className="lg:hidden sticky top-16 z-20 py-3 bg-bg-base border-b border-border">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center justify-between w-full text-left text-sm font-medium text-text-primary py-1"
          aria-expanded={mobileOpen}
        >
          <span>Jump to section</span>
          <span className="text-text-muted" aria-hidden>
            {mobileOpen ? '▼' : '▶'}
          </span>
        </button>
        {mobileOpen && (
          <div className="pt-2 pb-1 max-h-[50vh] overflow-y-auto">
            {nav}
          </div>
        )}
      </div>
    </>
  )
}
