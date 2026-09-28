'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle, Package, Eye, Ban } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { FlagDetailModal } from '@/components/admin/FlagDetailModal'
import { PaginationFooter } from '@/components/admin/PaginationFooter'
import type { FlagReason, ItemStatus, ItemType, ItemCategory } from '@/lib/constants'

interface FlagWithContent {
  id: string
  flaggable_type: string
  flaggable_id: string
  reason: FlagReason
  description: string | null
  status: 'pending' | 'reviewed' | 'dismissed'
  action_taken: 'none' | 'item_removed' | 'user_warned' | 'user_banned' | null
  created_at: string
  review_notes: string | null
  reviewed_at: string | null
  reporter: {
    id: string
    display_name: string | null
    email: string
    avatar_url: string | null
    reputation_score: number
  }
  content?: {
    id: string
    title: string
    description: string
    type: ItemType
    category: ItemCategory
    image_url: string | null
    status: ItemStatus
    created_at: string
    posted_by: string
    poster: {
      id: string
      display_name: string | null
      email: string
      avatar_url: string | null
      reputation_score: number
      is_banned: boolean
    }
  } | null
}

type TabType = 'pending' | 'reviewed' | 'dismissed'

const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  spam: 'Spam',
  inappropriate_content: 'Inappropriate Content',
  scam: 'Scam',
  duplicate: 'Duplicate',
  harassment: 'Harassment',
  fake_item: 'Fake Item',
  other: 'Other',
}

const PAGE_SIZE = 25

export default function FlagsReviewPage() {
  const [flags, setFlags] = useState<FlagWithContent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [selectedFlag, setSelectedFlag] = useState<FlagWithContent | null>(null)
  const [totalFlags, setTotalFlags] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  const lastTabRef = useRef(activeTab)

  const loadFlags = useCallback(async (page = currentPage) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: activeTab,
        limit: PAGE_SIZE.toString(),
        offset: ((page - 1) * PAGE_SIZE).toString(),
      })

      const response = await fetch(`/api/flags?${params}`)
      const data = await response.json()

      if (data.success) {
        setFlags(data.flags)
        setTotalFlags(data.total)
      }
    } catch (error) {
      console.error('Error loading flags:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, currentPage])

  useEffect(() => {
    if (lastTabRef.current !== activeTab && currentPage !== 1) {
      lastTabRef.current = activeTab
      setCurrentPage(1)
      return
    }

    lastTabRef.current = activeTab
    loadFlags(currentPage)
  }, [activeTab, currentPage, loadFlags])

  async function handleQuickAction(flagId: string, action: 'reviewed' | 'dismissed') {
    try {
      const response = await fetch(`/api/flags/${flagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      })

      const data = await response.json()

      if (data.success) {
        loadFlags(currentPage)
      } else {
        alert(data.error || 'Failed to update flag')
      }
    } catch (error) {
      console.error('Error updating flag:', error)
      alert('Failed to update flag')
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Flags Review</h1>
        <p className="text-text-secondary mt-1">
          Review and manage user-reported content
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="min-w-0">
        <div className="w-full overflow-x-auto">
          <TabsList className="flex min-w-max">
          <TabsTrigger value="pending">Pending Flags</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-6 min-w-0">
          {/* Flags Table */}
          <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-bg-elevated">
            {loading ? (
              <div className="p-12 text-center">
                <p className="text-text-secondary">Loading flags...</p>
              </div>
            ) : flags.length === 0 ? (
              <div className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
                <p className="text-text-secondary">No {activeTab} flags found</p>
              </div>
            ) : (
              <div className="min-w-0 overflow-x-auto">
                <table className="min-w-[78rem] w-full">
                  <thead className="bg-bg-base border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Reporter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Action Taken
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {flags.map((flag) => (
                      <tr
                        key={flag.id}
                        className="hover:bg-bg-overlay transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {flag.content ? (
                              <>
                                {flag.content.image_url ? (
                                  <img
                                    src={flag.content.image_url}
                                    alt={flag.content.title}
                                    className="h-12 w-12 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded bg-bg-base flex items-center justify-center">
                                    <Package className="h-6 w-6 text-text-tertiary" />
                                  </div>
                                )}
                                <div className="max-w-xs">
                                  <p className="text-sm font-medium text-text-primary line-clamp-1">
                                    {flag.content.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge
                                      variant={flag.content.type === 'lost' ? 'destructive' : 'default'}
                                      className={
                                        flag.content.type === 'found'
                                          ? 'text-xs border-found/20 bg-found text-found-foreground'
                                          : 'text-xs'
                                      }
                                    >
                                      {flag.content.type}
                                    </Badge>
                                    <StatusBadge status={flag.content.status} />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-text-tertiary">Item deleted</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-text-primary">
                            {flag.reporter.display_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {flag.reporter.email}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="destructive" className="text-xs">
                            {FLAG_REASON_LABELS[flag.reason]}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-text-secondary line-clamp-2 max-w-xs">
                            {flag.description || 'No description provided'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-text-secondary">
                            {new Date(flag.created_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={flag.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {flag.action_taken === 'item_removed' && (
                            <Badge variant="destructive" className="text-xs">
                              <Ban className="h-3 w-3 mr-1" />
                              Item Removed
                            </Badge>
                          )}
                          {flag.action_taken === 'user_warned' && (
                            <Badge variant="outline" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              User Warned
                            </Badge>
                          )}
                          {flag.action_taken === 'user_banned' && (
                            <Badge variant="destructive" className="text-xs">
                              <Ban className="h-3 w-3 mr-1" />
                              User Banned
                            </Badge>
                          )}
                          {(!flag.action_taken || flag.action_taken === 'none') && (
                            <span className="text-sm text-text-tertiary">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedFlag(flag)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-overlay hover:text-text-primary"
                              title="View Details"
                              aria-label={`View details for flag ${flag.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {flag.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAction(flag.id, 'reviewed')}
                                  className="min-h-11 rounded-md bg-accent px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-accent-hover"
                                >
                                  Mark Reviewed
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAction(flag.id, 'dismissed')}
                                  className="min-h-11 rounded-md bg-bg-overlay px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
                                >
                                  Dismiss
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Info */}
                {!loading && flags.length > 0 && (
                  <PaginationFooter
                    totalItems={totalFlags}
                    currentPage={currentPage}
                    pageSize={PAGE_SIZE}
                    itemLabel="flags"
                    loading={loading}
                    onPageChange={setCurrentPage}
                  />
                )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Flag Detail Modal */}
      {selectedFlag && (
        <FlagDetailModal
          flag={selectedFlag}
          onClose={() => setSelectedFlag(null)}
          onUpdate={loadFlags}
        />
      )}
    </div>
  )
}
