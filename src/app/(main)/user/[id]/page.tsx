'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, AlertTriangle, Mail, Phone } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Alert } from '@/components/ui/alert'
import { ReputationDisplay } from '@/components/ui/reputation-display'
import { BadgesDisplay } from '@/components/profile/BadgesDisplay'
import { ItemCard } from '@/components/items/ItemCard'
import type { UserBadge, ItemCard as ItemCardType } from '@/types'

interface PublicProfile {
  id: string
  displayName: string
  avatarUrl: string | null
  reputationScore: number
  totalItemsReturned: number
  isBanned: boolean
  bannedReason: string | null
  email: string
  phone: string | null
  isAdmin: boolean
}

interface PublicProfileData {
  profile: PublicProfile
  badges: Array<{
    id: string
    badge_type: string
    earned_at: string
  }>
  stats: {
    totalItemsPosted: number
    activeItems: number
  }
  recentItems: ItemCardType[]
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [data, setData] = useState<PublicProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      if (!userId) return

      try {
        const response = await fetch(`/api/users/${userId}/public`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          setError(result.error || 'Failed to load profile')
          setIsLoading(false)
          return
        }

        setData(result.data)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('An unexpected error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchProfile()
    }
  }, [userId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <strong>Error:</strong> {error || 'Profile not found'}
        </Alert>
        <div className="mt-6">
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const { profile, badges, stats, recentItems } = data
  const transformedBadges: UserBadge[] = badges.map(b => ({
    id: b.id,
    userId: profile.id,
    badgeType: b.badge_type as UserBadge['badgeType'],
    earnedAt: b.earned_at,
  }))
  const contactMethods = [
    {
      id: 'email',
      label: 'Email',
      value: profile.email,
      href: `mailto:${profile.email}`,
      icon: Mail,
    },
    ...(profile.phone
      ? [
          {
            id: 'phone',
            label: 'Phone',
            value: profile.phone,
            href: `tel:${profile.phone}`,
            icon: Phone,
          },
        ]
      : []),
  ]
  const statBlocks = [
    { label: 'Items posted', value: stats.totalItemsPosted },
    { label: 'Active listings', value: stats.activeItems },
    { label: 'Items returned', value: profile.totalItemsReturned },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-up">
      {/* Back Button */}
      <Button
        onClick={() => router.back()}
        variant="ghost"
        size="sm"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Profile Header */}
      <div className="card overflow-hidden">
        <div className="px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            <div className="flex items-center gap-5 sm:gap-6 lg:w-52 lg:flex-col lg:items-start lg:gap-4">
              <div className="relative shrink-0">
                <div className="absolute -inset-2 rounded-full bg-accent/10 blur-md" />
                <Avatar
                  src={profile.avatarUrl || undefined}
                  alt={profile.displayName}
                  size="2xl"
                  className="relative ring-4 ring-bg-base shadow-sm"
                />
              </div>

              <div className="min-w-0 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                  Community Profile
                </p>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-display text-3xl text-text-primary sm:text-4xl">
                    {profile.displayName}
                  </h1>
                  {profile.isAdmin && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                      Admin
                    </span>
                  )}
                </div>
                {transformedBadges.length > 0 && (
                  <BadgesDisplay badges={transformedBadges} compact />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-6">
              {profile.isBanned && (
                <Alert variant="error">
                  <AlertTriangle className="h-4 w-4" />
                  <div>
                    <strong>Account Suspended</strong>
                    {profile.bannedReason && (
                      <p className="mt-1 text-sm">Reason: {profile.bannedReason}</p>
                    )}
                  </div>
                </Alert>
              )}

              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-text-muted">Reputation</p>
                  <ReputationDisplay
                    score={profile.reputationScore}
                    variant="detailed"
                    size="md"
                  />
                </div>

                <div className="space-y-3 border-t border-border/80 pt-5">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-text-muted">Contact</p>
                    <div className="flex flex-col gap-3">
                      {contactMethods.map((method) => {
                        const Icon = method.icon

                        return (
                          <a
                            key={method.id}
                            href={method.href}
                            className="flex items-start gap-3 rounded-2xl border border-border bg-bg-base/70 px-4 py-3 text-sm text-text-primary transition-colors hover:border-accent/40 hover:text-accent"
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                            <span className="shrink-0 text-text-muted">{method.label}</span>
                            <span className="min-w-0 break-all font-medium text-text-primary">
                              {method.value}
                            </span>
                          </a>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/80 bg-bg-overlay/40 px-6 py-5 sm:px-8 lg:px-10">
          <div className="grid gap-5 sm:grid-cols-3">
            {statBlocks.map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className="text-sm text-text-muted">{stat.label}</p>
                <p className="text-2xl font-semibold text-text-primary">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recovery Badges */}
      {transformedBadges.length > 0 && (
        <div className="card p-6">
          <BadgesDisplay
            badges={transformedBadges}
            totalItemsReturned={profile.totalItemsReturned}
          />
        </div>
      )}

      {/* Recent Items */}
      {recentItems.length > 0 && (
        <div>
          <h2 className="text-display text-2xl text-text-primary mb-4">
            Recent Items
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {recentItems.length === 0 && !profile.isBanned && (
        <div className="card p-8 text-center">
          <p className="text-text-muted">No items posted yet</p>
        </div>
      )}
    </div>
  )
}
