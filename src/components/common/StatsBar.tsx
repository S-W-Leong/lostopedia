'use client'

import { useEffect, useState } from 'react'
import { Package, CheckCircle, Users } from 'lucide-react'

interface PublicStats {
  totalItems: number
  itemsRecovered: number
  totalUsers: number
}

interface StatsBarProps {
  stats: PublicStats
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="mt-8 flex flex-wrap gap-4 justify-center items-center animate-fade-up stagger-4">
      <StatBadge
        icon={<Package className="h-4 w-4" />}
        value={stats.totalItems}
        label="items posted"
        color="accent"
      />
      <span className="hidden sm:inline text-text-muted">•</span>
      <StatBadge
        icon={<CheckCircle className="h-4 w-4" />}
        value={stats.itemsRecovered}
        label="recovered"
        color="found"
      />
      <span className="hidden sm:inline text-text-muted">•</span>
      <StatBadge
        icon={<Users className="h-4 w-4" />}
        value={stats.totalUsers}
        label="active users"
        color="match"
      />
    </div>
  )
}

interface StatBadgeProps {
  icon: React.ReactNode
  value: number
  label: string
  color: 'accent' | 'found' | 'match'
}

function StatBadge({ icon, value, label, color }: StatBadgeProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Count up animation over 1.5 seconds
    let start = 0
    const duration = 1500
    const increment = value / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  const colorClasses = {
    accent: 'text-accent',
    found: 'text-found',
    match: 'text-match',
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className={colorClasses[color]}>{icon}</span>
      <span className="font-semibold text-text-primary tabular-nums">{count}</span>
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  )
}
