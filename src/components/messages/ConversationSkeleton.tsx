import { Skeleton } from '@/components/ui/skeleton'

export function ConversationSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-4">
        {/* Item image */}
        <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <Skeleton className="h-5 w-3/4" />
          
          {/* User info */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          
          {/* Last message */}
          <Skeleton className="h-4 w-full" />
          
          {/* Timestamp */}
          <Skeleton className="h-3 w-24" />
        </div>
        
        {/* Unread badge */}
        <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
      </div>
    </div>
  )
}

export function ConversationSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  )
}

