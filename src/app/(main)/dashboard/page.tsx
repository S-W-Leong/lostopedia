'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import {
  PlusCircle,
  MagnifyingGlass,
  Package,
  ChatCircle,
} from '@phosphor-icons/react'
import { ArrowRight, Star, CheckCircle, Clock, Award, BookOpen, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import type { UserStats } from '@/types'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { MESSAGING_ENABLED } from '@/lib/constants'

interface DashboardStats {
  stats: UserStats
  profile: {
    reputationScore: number
    totalItemsRecovered: number
    totalItemsReturned: number
  }
  expiringSoon: number
}

export default function DashboardPage() {
  const { profile, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch stats on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/stats')
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch stats')
        }

        setStats(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching stats:', err)
        setError(err instanceof Error ? err.message : 'Failed to load stats')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const quickActions = [
    {
      icon: PlusCircle,
      label: 'Post Item',
      description: 'Lost or found something? Let others know.',
      href: '/post',
      color: 'text-accent',
      bgColor: 'bg-accent-muted',
    },
    {
      icon: MagnifyingGlass,
      label: 'Search Items',
      description: 'Browse all lost and found items.',
      href: '/search',
      color: 'text-found',
      bgColor: 'bg-found-muted',
    },
    {
      icon: Package,
      label: 'My Items',
      description: 'Manage your posted items.',
      href: '/my-items',
      color: 'text-lost',
      bgColor: 'bg-lost-muted',
    },
    ...(MESSAGING_ENABLED ? [{
      icon: ChatCircle,
      label: 'Messages',
      description: 'View your conversations.',
      href: '/messages',
      color: 'text-match',
      bgColor: 'bg-match-muted',
    }] : []),
  ]

  const hasActivity = stats && (
    stats.stats.totalItems > 0 ||
    (MESSAGING_ENABLED && stats.stats.unreadMessages > 0) ||
    stats.expiringSoon > 0
  )

  return (
    <motion.div
      className="space-y-8"
      variants={staggerContainer}
      initial="visible"
      animate="visible"
    >
      {/* Welcome Header */}
      <motion.div variants={staggerItem}>
        <h1 className="text-display-hero text-3xl text-text-primary">
          {authLoading ? (
            <span className="animate-pulse">Welcome back</span>
          ) : (
            <>Welcome back, {profile?.display_name?.split(' ')[0] || 'User'}!</>
          )}
        </h1>
        <p className="text-text-secondary mt-1">
          Here&apos;s what&apos;s happening with your items
        </p>
      </motion.div>

      {/* Getting Started */}
      <motion.div variants={staggerItem}>
      <Link
        href="/help"
        className="card p-5 group hover:border-accent transition-colors flex items-center gap-4"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-muted shrink-0">
          <BookOpen className="h-6 w-6 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-medium text-text-primary group-hover:text-accent transition-colors">
            Getting Started
          </h2>
          <p className="text-sm text-text-muted mt-0.5">
            New here? Read the user guide to post items, use available features safely, and build your reputation.
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-text-muted group-hover:text-accent transition-colors shrink-0" />
      </Link>
      </motion.div>

      {/* Quick Stats */}
      {!isLoading && stats && (
        <motion.div key="stats" variants={staggerItem} initial="hidden" animate="visible">
        <div>
          <h2 className="text-lg font-medium text-text-primary mb-4">Your Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Items */}
            <Link href="/my-items" className="card p-5 group hover:border-accent transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-semibold text-text-primary">
                    {stats.stats.totalItems}
                  </p>
                  <p className="text-sm text-text-muted mt-1">Total Items Posted</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent-muted">
                    <Package className="h-6 w-6 text-accent" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-text-muted group-hover:text-accent transition-colors shrink-0" />
                </div>
              </div>
            </Link>

            {/* Active Items */}
            <Link href="/my-items" className="card p-5 group hover:border-accent transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-semibold text-text-primary">
                    {stats.stats.activeItems}
                  </p>
                  <p className="text-sm text-text-muted mt-1">Active Items</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-lost-muted">
                    <Clock className="h-6 w-6 text-lost" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-text-muted group-hover:text-accent transition-colors shrink-0" />
                </div>
              </div>
            </Link>

            {/* Items Recovered */}
            <Link href="/my-items" className="card p-5 group hover:border-accent transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-semibold text-text-primary">
                    {stats.profile.totalItemsRecovered}
                  </p>
                  <p className="text-sm text-text-muted mt-1">Items Recovered</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-found-muted">
                    <CheckCircle className="h-6 w-6 text-found" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-text-muted group-hover:text-accent transition-colors shrink-0" />
                </div>
              </div>
            </Link>

            {/* Items Returned */}
            <Link href="/my-items" className="card p-5 group hover:border-accent transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-semibold text-text-primary">
                    {stats.profile.totalItemsReturned}
                  </p>
                  <p className="text-sm text-text-muted mt-1">Items Returned</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-match-muted">
                    <Award className="h-6 w-6 text-match" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-text-muted group-hover:text-accent transition-colors shrink-0" />
                </div>
              </div>
            </Link>
          </div>

          {/* Reputation Score */}
          <div className="card p-5 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent-muted">
                  <Star className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Reputation Score</p>
                  <p className="text-2xl font-semibold text-text-primary">
                    {stats.profile.reputationScore.toFixed(1)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-text-secondary">
                Keep helping others to increase your reputation!
              </p>
            </div>
          </div>
        </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && (
        <motion.div key="loading" variants={staggerItem} initial="hidden" animate="visible">
          <div>
            <h2 className="text-lg font-medium text-text-primary mb-4">Your Stats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="h-16 bg-surface-2 rounded" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Activity */}
      {!isLoading && stats && (
        <motion.div key="activity" variants={staggerItem} initial="hidden" animate="visible">
        <div>
          <h2 className="text-lg font-medium text-text-primary mb-4">Recent Activity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Unread Messages */}
            {MESSAGING_ENABLED && (
            <Link href="/messages" className="card p-5 group hover:border-accent transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-found-muted">
                    <MessageSquare className="h-5 w-5 text-found" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-text-primary">
                      {stats.stats.unreadMessages}
                    </p>
                    <p className="text-sm text-text-muted">Unread Messages</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-text-muted group-hover:text-accent transition-colors" />
              </div>
            </Link>
            )}

            {/* Items Expiring Soon */}
            <Link href="/my-items?expiring=true" className="card p-5 group hover:border-accent transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-lost-muted">
                    <Clock className="h-5 w-5 text-lost" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-text-primary">
                      {stats.expiringSoon}
                    </p>
                    <p className="text-sm text-text-muted">Expiring Soon</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-text-muted group-hover:text-accent transition-colors" />
              </div>
            </Link>

            {/* Completed Items */}
            <Link href="/my-items?status=completed" className="card p-5 group hover:border-accent transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-match-muted">
                    <CheckCircle className="h-5 w-5 text-match" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-text-primary">
                      {stats.stats.completedItems}
                    </p>
                    <p className="text-sm text-text-muted">Completed Items</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-text-muted group-hover:text-accent transition-colors" />
              </div>
            </Link>
          </div>
        </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={staggerItem}>
      <div>
        <h2 className="text-lg font-medium text-text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="card p-5 group hover:border-accent transition-colors"
              >
                <div className={`inline-flex p-2.5 rounded-lg ${action.bgColor} mb-3`}>
                  <Icon size={20} weight="duotone" className={action.color} />
                </div>
                <h3 className="font-medium text-text-primary group-hover:text-accent transition-colors">
                  {action.label}
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  {action.description}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
      </motion.div>

      {/* Empty State - Conditional */}
      {!isLoading && !hasActivity && (
        <motion.div className="card p-8 text-center" variants={staggerItem}>
          <div className="mx-auto w-16 h-16 bg-accent-muted rounded-full flex items-center justify-center mb-4">
            <Package size={32} weight="duotone" className="text-accent shrink-0" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No items posted yet
          </h3>
          <p className="text-text-secondary max-w-md mx-auto mb-6">
            Start by posting a lost or found item. Our AI will help match your items with potential owners.
          </p>
          <Link href="/post">
            <Button>
              <PlusCircle size={16} weight="duotone" className="shrink-0" />
              Post Your First Item
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Error State */}
      {error && (
        <motion.div className="card p-6 border-lost" variants={staggerItem}>
          <p className="text-sm text-lost">Failed to load dashboard stats: {error}</p>
        </motion.div>
      )}
    </motion.div>
  )
}
