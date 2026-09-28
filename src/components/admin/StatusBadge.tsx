import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusType = 
  | 'active' 
  | 'banned' 
  | 'flagged' 
  | 'removed' 
  | 'completed'
  | 'expired'
  | 'pending'
  | 'reviewed'
  | 'dismissed'

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

const statusConfig: Record<StatusType, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  banned: { label: 'Banned', variant: 'destructive' },
  flagged: { label: 'Flagged', variant: 'destructive' },
  removed: { label: 'Removed', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'secondary' },
  expired: { label: 'Expired', variant: 'outline' },
  pending: { label: 'Pending', variant: 'outline' },
  reviewed: { label: 'Reviewed', variant: 'secondary' },
  dismissed: { label: 'Dismissed', variant: 'outline' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <Badge 
      variant={config.variant}
      className={cn('text-xs', className)}
    >
      {config.label}
    </Badge>
  )
}

