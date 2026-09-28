'use client'
import * as React from 'react'
import { Suspense } from 'react'
import { motion } from 'motion/react'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FilterChip } from '@/components/ui/filter-chip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NativeSelect } from '@/components/ui/native-select'
import { ItemCard, ItemCardSkeleton } from '@/components/items/ItemCard'
import { ITEM_CATEGORIES, CATEGORY_LABELS, APP_CONFIG } from '@/lib/constants'
import { parseSearchDateRange } from '@/lib/search-date-params'
import type { ItemCard as ItemCardType, PaginatedResponse } from '@/types'
import type { ItemCategory, ItemType } from '@/lib/constants'

function SearchPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Parse URL params
  const initialQuery = searchParams.get('q') || ''
  const initialType = searchParams.get('type') as ItemType | null
  const initialCategory = searchParams.get('category') as ItemCategory | null
  const initialSort = searchParams.get('sortBy') || 'newest'
  const initialPage = parseInt(searchParams.get('page') || '1')
  const initialDateFrom = searchParams.get('dateFrom') || ''
  const initialDateTo = searchParams.get('dateTo') || ''

  // State
  const [searchQuery, setSearchQuery] = React.useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = React.useState(initialQuery)
  const [selectedType, setSelectedType] = React.useState<ItemType | 'all'>(initialType || 'all')
  const [selectedCategory, setSelectedCategory] = React.useState<ItemCategory | 'all'>(
    initialCategory || 'all'
  )
  const [dateFrom, setDateFrom] = React.useState(initialDateFrom)
  const [dateTo, setDateTo] = React.useState(initialDateTo)
  const [sortBy, setSortBy] = React.useState(initialSort)
  const [currentPage, setCurrentPage] = React.useState(initialPage)
  const [items, setItems] = React.useState<ItemCardType[]>([])
  const [totalItems, setTotalItems] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [showFilters, setShowFilters] = React.useState(false)

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setCurrentPage(1) // Reset to first page on new search
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const dateRangeParsed = React.useMemo(
    () => parseSearchDateRange(dateFrom || null, dateTo || null),
    [dateFrom, dateTo]
  )
  const dateRangeInvalid = !dateRangeParsed.ok

  // Fetch items whenever filters change
  React.useEffect(() => {
    const fetchItems = async () => {
      setLoading(true)

      if (dateRangeInvalid) {
        setItems([])
        setTotalItems(0)
        setLoading(false)
        return
      }

      const range = dateRangeParsed.ok ? dateRangeParsed : { dateFrom: null, dateTo: null }

      // Build search params
      const params = new URLSearchParams()
      if (debouncedQuery) params.set('q', debouncedQuery)
      if (selectedType !== 'all') params.set('type', selectedType)
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (range.dateFrom) params.set('dateFrom', range.dateFrom)
      if (range.dateTo) params.set('dateTo', range.dateTo)
      params.set('sortBy', sortBy)
      params.set('limit', String(APP_CONFIG.itemsPerPage))
      params.set('offset', String((currentPage - 1) * APP_CONFIG.itemsPerPage))

      try {
        const response = await fetch(`/api/search?${params}`)
        const data: PaginatedResponse<ItemCardType> = await response.json()

        if (data.success) {
          setItems(data.items)
          setTotalItems(data.total)
        } else {
          console.error('Search failed:', data)
          setItems([])
          setTotalItems(0)
        }
      } catch (error) {
        console.error('Error fetching items:', error)
        setItems([])
        setTotalItems(0)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [
    debouncedQuery,
    selectedType,
    selectedCategory,
    dateFrom,
    dateTo,
    sortBy,
    currentPage,
    dateRangeInvalid,
    dateRangeParsed,
  ])

  // Update URL when filters change
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery) params.set('q', debouncedQuery)
    if (selectedType !== 'all') params.set('type', selectedType)
    if (selectedCategory !== 'all') params.set('category', selectedCategory)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (sortBy !== 'newest') params.set('sortBy', sortBy)
    if (currentPage > 1) params.set('page', String(currentPage))

    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [debouncedQuery, selectedType, selectedCategory, dateFrom, dateTo, sortBy, currentPage, pathname, router])

  // Calculate pagination
  const totalPages = Math.ceil(totalItems / APP_CONFIG.itemsPerPage)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  // Handle filter clear
  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedType('all')
    setSelectedCategory('all')
    setDateFrom('')
    setDateTo('')
    setSortBy('newest')
    setCurrentPage(1)
  }

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery ||
    selectedType !== 'all' ||
    selectedCategory !== 'all' ||
    dateFrom ||
    dateTo ||
    sortBy !== 'newest'

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-text-primary">Browse Items</h1>
        <p className="text-text-secondary">
          Search for lost and found items in your community
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search items by title, description, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          aria-label={showFilters ? 'Hide filters' : 'Show filters'}
          className="lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar - Desktop & Mobile */}
        <aside
          className={`lg:w-64 lg:block ${showFilters ? 'block' : 'hidden'} space-y-6`}
        >
          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Active Filters</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="px-3"
              >
                Clear All
              </Button>
            </div>
          )}

          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <div className="flex gap-2">
              <Button
                variant={selectedType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('all')}
                className="flex-1"
              >
                All
              </Button>
              <Button
                variant={selectedType === 'lost' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('lost')}
                className={selectedType === 'lost' ? 'flex-1 bg-lost text-lost-foreground hover:bg-lost/90' : 'flex-1'}
              >
                Lost
              </Button>
              <Button
                variant={
                  selectedType === 'found'
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() => setSelectedType('found')}
                className={
                  selectedType === 'found'
                    ? 'flex-1 bg-found text-found-foreground hover:bg-found/90'
                    : 'flex-1'
                }
              >
                Found
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <NativeSelect
              aria-label="Category"
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value as ItemCategory | 'all')
              }
            >
              <option value="all">All Categories</option>
              {ITEM_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* Posted date (listing created_at, UTC) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Posted date</label>
            <p className="text-xs text-muted-foreground">UTC calendar days. Leave blank for any time.</p>
            <div className="flex flex-col gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Posted on or after"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Posted on or before"
              />
            </div>
            {!dateRangeParsed.ok && (
              <p className="text-xs text-destructive">{dateRangeParsed.error}</p>
            )}
          </div>

          {/* Sort Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort By</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                {debouncedQuery && (
                  <SelectItem value="relevance">Most Relevant</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {loading ? (
                'Loading...'
              ) : (
                <>
                  Showing{' '}
                  <span className="font-medium text-foreground">
                    {items.length}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium text-foreground">
                    {totalItems}
                  </span>{' '}
                  items
                </>
              )}
            </p>
          </div>
        </aside>

        {/* Results */}
        <main className="flex-1">
          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {searchQuery && (
                <FilterChip
                  label={`Search: "${searchQuery}"`}
                  removeLabel="Remove search filter"
                  onRemove={() => setSearchQuery('')}
                />
              )}
              {selectedType !== 'all' && (
                <FilterChip
                  label={selectedType === 'lost' ? 'Lost' : 'Found'}
                  removeLabel="Remove type filter"
                  onRemove={() => setSelectedType('all')}
                />
              )}
              {selectedCategory !== 'all' && (
                <FilterChip
                  label={CATEGORY_LABELS[selectedCategory]}
                  removeLabel="Remove category filter"
                  onRemove={() => setSelectedCategory('all')}
                />
              )}
              {dateFrom && (
                <FilterChip
                  label={`Posted from ${dateFrom}`}
                  removeLabel="Remove posted-from date"
                  onRemove={() => {
                    setDateFrom('')
                    setCurrentPage(1)
                  }}
                />
              )}
              {dateTo && (
                <FilterChip
                  label={`Posted until ${dateTo}`}
                  removeLabel="Remove posted-until date"
                  onRemove={() => {
                    setDateTo('')
                    setCurrentPage(1)
                  }}
                />
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <ItemCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && items.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <MagnifyingGlass size={32} weight="duotone" className="text-muted-foreground shrink-0" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search query'
                  : 'No items have been posted yet'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {/* Results Grid */}
          {!loading && items.length > 0 && (
            <>
              <motion.div
                className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {items.map((item) => (
                  <motion.div key={item.id} variants={staggerItem}>
                    <ItemCard item={item} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    disabled={!hasPrevPage}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    disabled={!hasNextPage}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}

              {/* Results Info */}
              <p className="text-center text-sm text-muted-foreground mt-4">
                Page {currentPage} of {totalPages} • {totalItems} total items
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function SearchPageFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse rounded-lg bg-muted h-10 w-64 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPageContent />
    </Suspense>
  )
}
