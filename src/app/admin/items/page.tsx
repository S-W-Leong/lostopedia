'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Package, AlertTriangle, Image as ImageIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ItemActionsMenu } from '@/components/admin/ItemActionsMenu'
import { PaginationFooter } from '@/components/admin/PaginationFooter'
import { ReputationDisplay } from '@/components/ui/reputation-display'
import { Badge } from '@/components/ui/badge'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { ITEM_CATEGORIES, CATEGORY_LABELS } from '@/lib/constants'
import type { ItemType, ItemStatus, ItemCategory } from '@/lib/constants'

interface ItemWithPoster {
  id: string
  type: ItemType
  title: string
  description: string
  category: ItemCategory
  image_url: string | null
  location_text: string
  pickup_method: string | null
  status: ItemStatus
  created_at: string
  posted_by: string
  flag_count: number
  is_flagged: boolean
  flagsCount?: number
  date_lost_found: string | null
  removed_by: string | null
  removed_at: string | null
  removed_reason: string | null
  removed_flag_id: string | null
  poster: {
    id: string
    display_name: string | null
    email: string
    avatar_url: string | null
    reputation_score: number
    is_banned: boolean
  }
}

type StatusFilter = 'all' | ItemStatus

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'removed', label: 'Removed' },
]

const STATUS_FILTER_LABELS: Record<ItemStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  expired: 'Expired',
  flagged: 'Flagged',
  removed: 'Removed',
}

const tableHeaderClass =
  'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary sm:px-6'
const tableCellClass = 'px-4 py-4 sm:px-6'
const stickyActionsHeaderClass =
  'sticky right-0 z-20 w-20 border-l border-border bg-bg-base text-right'
const stickyActionsCellClass =
  'sticky right-0 z-10 w-20 border-l border-border bg-bg-elevated text-right group-hover:bg-bg-overlay'
const PAGE_SIZE = 25

export default function ItemsModerationPage() {
  const [items, setItems] = useState<ItemWithPoster[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  const debouncedSearch = useDebounce(search, 500)
  const lastQueryRef = useRef('')

  const loadItems = useCallback(async (page = currentPage) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: ((page - 1) * PAGE_SIZE).toString(),
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }

      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter)
      }

      const response = await fetch(`/api/admin/items?${params}`)
      const data = await response.json()

      if (data.success) {
        let filteredItems = data.items
        if (debouncedSearch) {
          const searchLower = debouncedSearch.toLowerCase()
          filteredItems = filteredItems.filter((item: ItemWithPoster) =>
            item.title.toLowerCase().includes(searchLower) ||
            item.description.toLowerCase().includes(searchLower) ||
            item.poster.display_name?.toLowerCase().includes(searchLower) ||
            item.poster.email.toLowerCase().includes(searchLower)
          )
        }

        setItems(filteredItems)
        setTotalItems(data.total)
      }
    } catch (error) {
      console.error('Error loading items:', error)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, currentPage, debouncedSearch, statusFilter, typeFilter])

  useEffect(() => {
    const queryKey = [debouncedSearch, typeFilter, statusFilter, categoryFilter].join('|')

    if (lastQueryRef.current !== queryKey && currentPage !== 1) {
      setCurrentPage(1)
      return
    }

    lastQueryRef.current = queryKey
    loadItems(currentPage)
  }, [categoryFilter, currentPage, debouncedSearch, loadItems, statusFilter, typeFilter])

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Items Moderation</h1>
        <p className="mt-1 text-text-secondary">
          Manage items, review flagged content, and moderate posts
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search items"
            className="pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'lost' | 'found')}
          aria-label="Filter items by type"
          className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 focus:ring-offset-bg-base sm:w-auto"
        >
          <option value="all">All Types</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter items by category"
          className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 focus:ring-offset-bg-base sm:w-auto"
        >
          <option value="all">All Categories</option>
          {ITEM_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="inline-flex min-h-11 min-w-max items-center rounded-lg border border-border bg-bg-overlay p-1 text-text-secondary">
          {STATUS_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={cn(
                'inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus:ring-offset-2 focus:ring-offset-bg-base',
                statusFilter === option.value
                  ? 'bg-bg-elevated text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
              aria-pressed={statusFilter === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-bg-elevated">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-text-secondary">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-text-tertiary" />
            <p className="text-text-secondary">
              {statusFilter !== 'all'
                ? `No ${STATUS_FILTER_LABELS[statusFilter].toLowerCase()} items`
                : 'No items found'}
            </p>
            {statusFilter === 'removed' ? (
              <p className="mt-2 text-xs text-text-tertiary">
                Items removed through flag review appear here
              </p>
            ) : statusFilter === 'flagged' ? (
              <p className="mt-2 text-xs text-text-tertiary">
                This view shows items currently marked as flagged for moderation
              </p>
            ) : statusFilter === 'all' ? (
              <p className="mt-2 text-xs text-text-tertiary">
                Items can only be removed through flag review
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {items.map((item) => (
                <article key={item.id} className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="h-14 w-14 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded bg-bg-base">
                          <ImageIcon className="h-6 w-6 text-text-tertiary" />
                        </div>
                      )}
                      <div className="min-w-0 space-y-2">
                        <p className="line-clamp-2 text-sm font-semibold text-text-primary">
                          {item.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={item.status} />
                          <Badge
                            variant={item.type === 'lost' ? 'destructive' : 'default'}
                            className={item.type === 'found' ? 'border-found/20 bg-found text-xs text-found-foreground' : 'text-xs'}
                          >
                            {item.type}
                          </Badge>
                          {item.flag_count > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              {item.flag_count}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <ItemActionsMenu item={item} onUpdate={loadItems} />
                    </div>
                  </div>

                  <p className="line-clamp-2 text-xs leading-5 text-text-secondary">
                    {item.description}
                  </p>

                  <dl className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-bg-base px-3 py-2">
                      <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">Category</dt>
                      <dd className="mt-1 text-sm font-medium text-text-primary">
                        {CATEGORY_LABELS[item.category]}
                      </dd>
                    </div>
                    <div className="rounded-md bg-bg-base px-3 py-2">
                      <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">Created</dt>
                      <dd className="mt-1 text-sm font-medium text-text-primary">
                        {new Date(item.created_at).toLocaleDateString()}
                      </dd>
                    </div>
                    <div className="rounded-md bg-bg-base px-3 py-2">
                      <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">Poster</dt>
                      <dd className="mt-1 text-sm font-medium text-text-primary">
                        {item.poster.display_name || 'Unknown'}
                      </dd>
                    </div>
                    <div className="rounded-md bg-bg-base px-3 py-2">
                      <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">Reputation</dt>
                      <dd className="mt-1">
                        <ReputationDisplay
                          score={item.poster.reputation_score}
                          variant="compact"
                          size="sm"
                        />
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[42rem] lg:min-w-[56rem] xl:min-w-[68rem]">
                <thead className="border-b border-border bg-bg-base">
                  <tr>
                    <th className={tableHeaderClass}>
                      Item
                    </th>
                    <th className={cn(tableHeaderClass, 'hidden md:table-cell')}>
                      Type
                    </th>
                    <th className={cn(tableHeaderClass, 'hidden xl:table-cell')}>
                      Category
                    </th>
                    <th className={cn(tableHeaderClass, 'hidden lg:table-cell')}>
                      Poster
                    </th>
                    <th className={tableHeaderClass}>
                      Status
                    </th>
                    <th className={cn(tableHeaderClass, 'hidden md:table-cell')}>
                      Flags
                    </th>
                    <th className={cn(tableHeaderClass, 'hidden xl:table-cell')}>
                      Created
                    </th>
                    <th className={cn(tableHeaderClass, stickyActionsHeaderClass)}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-bg-overlay"
                    >
                      <td className={tableCellClass}>
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="h-12 w-12 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded bg-bg-base">
                              <ImageIcon className="h-6 w-6 text-text-tertiary" />
                            </div>
                          )}
                          <div className="max-w-[14rem] sm:max-w-xs">
                            <p className="line-clamp-1 text-sm font-medium text-text-primary">
                              {item.title}
                            </p>
                            <p className="line-clamp-1 text-xs text-text-tertiary">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={cn(tableCellClass, 'hidden whitespace-nowrap md:table-cell')}>
                        <Badge
                          variant={item.type === 'lost' ? 'destructive' : 'default'}
                          className={item.type === 'found' ? 'border-found/20 bg-found text-xs text-found-foreground' : 'text-xs'}
                        >
                          {item.type}
                        </Badge>
                      </td>
                      <td className={cn(tableCellClass, 'hidden whitespace-nowrap xl:table-cell')}>
                        <span className="text-sm text-text-primary">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      </td>
                      <td className={cn(tableCellClass, 'hidden whitespace-nowrap lg:table-cell')}>
                        <div>
                          <p className="text-sm text-text-primary">
                            {item.poster.display_name || 'Unknown'}
                          </p>
                          <ReputationDisplay
                            score={item.poster.reputation_score}
                            variant="compact"
                            size="sm"
                          />
                        </div>
                      </td>
                      <td className={cn(tableCellClass, 'whitespace-nowrap')}>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.status} />
                          {item.status === 'removed' && item.is_flagged && (
                            <Badge variant="outline" className="text-xs">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Via Flag
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className={cn(tableCellClass, 'hidden whitespace-nowrap md:table-cell')}>
                        {item.flag_count > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {item.flag_count}
                          </Badge>
                        ) : (
                          <span className="text-sm text-text-tertiary">0</span>
                        )}
                      </td>
                      <td className={cn(tableCellClass, 'hidden whitespace-nowrap xl:table-cell')}>
                        <p className="text-sm text-text-secondary">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className={cn(tableCellClass, stickyActionsCellClass, 'whitespace-nowrap')}>
                        <ItemActionsMenu item={item} onUpdate={loadItems} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && items.length > 0 && (
          <PaginationFooter
            totalItems={totalItems}
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            itemLabel="items"
            loading={loading}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

    </div>
  )
}
