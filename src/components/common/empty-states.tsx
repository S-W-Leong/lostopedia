/**
 * Pre-configured empty state components for common scenarios
 */

import { Package, Search, MessageSquare, Inbox, Filter, MapPin } from 'lucide-react'
import { EmptyState, CompactEmptyState } from '@/components/ui/empty-state'

// No items posted by user
export function NoItemsPosted() {
  return (
    <EmptyState
      icon={Package}
      title="No items yet"
      description="You haven't posted any items. Start by posting a lost or found item to help your community."
      action={{
        label: 'Post Item',
        href: '/post',
      }}
    />
  )
}

// No search results
export function NoSearchResults() {
  return (
    <EmptyState
      icon={Search}
      title="No items found"
      description="We couldn't find any items matching your search. Try adjusting your filters or search terms."
    />
  )
}

// No messages/conversations
export function NoMessages() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No messages yet"
      description="You don't have any conversations. Start by messaging someone about their item."
      action={{
        label: 'Browse Items',
        href: '/search',
      }}
    />
  )
}

// No messages in thread
export function NoMessagesInThread() {
  return (
    <CompactEmptyState
      icon={Inbox}
      message="No messages yet. Start the conversation!"
    />
  )
}

// No matches found
export function NoMatches() {
  return (
    <EmptyState
      icon={Search}
      title="No matches found"
      description="We couldn't find any potential matches for this item. Try again later as new items are posted daily."
    />
  )
}

// No items on map
export function NoItemsOnMap() {
  return (
    <EmptyState
      icon={MapPin}
      title="No items in this area"
      description="There are currently no items reported in this location. Adjust the filters or zoom out to see more."
    />
  )
}

// Filtered results empty
export function NoFilteredResults() {
  return (
    <EmptyState
      icon={Filter}
      title="No items match these filters"
      description="Try removing some filters to see more results."
    />
  )
}

// Generic empty list
export function EmptyList({ message = "Nothing to show" }: { message?: string }) {
  return (
    <CompactEmptyState
      icon={Inbox}
      message={message}
    />
  )
}

