'use client'

import { useState, useEffect } from 'react'
import { ItemsMap } from '@/components/maps/ItemsMap'
import { Button } from '@/components/ui/button'
import { FilterChip } from '@/components/ui/filter-chip'
import { NativeSelect } from '@/components/ui/native-select'
import { ITEM_CATEGORIES, CATEGORY_LABELS } from '@/lib/constants'
import type { ItemCard, PaginatedResponse } from '@/types'
import type { ItemCategory, ItemType } from '@/lib/constants'
import { MapPin, Filter, X } from 'lucide-react'

export default function MapPage() {
  const [items, setItems] = useState<ItemCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<ItemType | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true)

      // Build search params
      const params = new URLSearchParams()
      if (selectedType !== 'all') params.set('type', selectedType)
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      params.set('limit', '500') // Get more items for map view
      params.set('sortBy', 'newest')

      try {
        const response = await fetch(`/api/search?${params}`)
        const data: PaginatedResponse<ItemCard> = await response.json()

        if (data.success) {
          setItems(data.items)
        } else {
          console.error('Failed to fetch items:', data)
          setItems([])
        }
      } catch (error) {
        console.error('Error fetching items:', error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [selectedType, selectedCategory])

  // Count items with geo locations
  const itemsWithLocation = items.filter(
    (item) => item.geoLocation?.latitude && item.geoLocation?.longitude
  )

  const handleClearFilters = () => {
    setSelectedType('all')
    setSelectedCategory('all')
  }

  const hasActiveFilters = selectedType !== 'all' || selectedCategory !== 'all'

  return (
    // Break out of the main content padding so the map fills the viewport edge-to-edge
    <div className="flex flex-col h-[calc(100dvh-4rem)] -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3 sm:py-4">
        <div className="container mx-auto">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-accent shrink-0" />
                Item Map
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? (
                  'Loading items...'
                ) : (
                  <>
                    Showing{' '}
                    <span className="font-medium text-foreground">
                      {itemsWithLocation.length}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium text-foreground">
                      {items.length}
                    </span>{' '}
                    items with location data
                  </>
                )}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              aria-label={showFilters ? 'Hide map filters' : 'Show map filters'}
              className="lg:hidden"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filters - Always visible on desktop, toggleable on mobile */}
          <div
            className={`flex flex-wrap gap-3 ${showFilters ? 'block' : 'hidden'} lg:flex`}
          >
            {/* Type Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('all')}
              >
                All
              </Button>
              <Button
                variant={selectedType === 'lost' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('lost')}
                className={selectedType === 'lost' ? 'bg-lost text-lost-foreground hover:bg-lost/90' : undefined}
              >
                Lost
              </Button>
              <Button
                variant={selectedType === 'found' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('found')}
                className={
                  selectedType === 'found'
                    ? 'bg-found text-found-foreground hover:bg-found/90'
                    : ''
                }
              >
                Found
              </Button>
            </div>

            {/* Category Filter */}
            <NativeSelect
              aria-label="Category"
              className="w-[180px]"
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

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
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
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : itemsWithLocation.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center p-4">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">No items with location</h3>
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Items with location data will appear here'}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-3"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <ItemsMap items={itemsWithLocation} className="w-full h-full" />
        )}
      </div>

      {/* Legend */}
      <div className="border-t bg-background px-4 py-2">
        <div className="container mx-auto flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-lost" />
            <span className="text-muted-foreground">Lost Items</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-found" />
            <span className="text-muted-foreground">Found Items</span>
          </div>
        </div>
      </div>
    </div>
  )
}
