import { LucideIcon } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  className?: string
  iconClassName?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconClassName,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      <div className={cn(
        'mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-2',
        iconClassName
      )}>
        <Icon className="h-10 w-10 text-text-muted" />
      </div>
      
      <h3 className="text-xl font-semibold text-text-primary mb-2">
        {title}
      </h3>
      
      <p className="text-text-secondary max-w-md mb-6">
        {description}
      </p>
      
      {action && (
        action.href ? (
          <a href={action.href}>
            <Button size="lg">
              {action.label}
            </Button>
          </a>
        ) : (
          <Button size="lg" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}

interface CompactEmptyStateProps {
  icon: LucideIcon
  message: string
  className?: string
}

export function CompactEmptyState({
  icon: Icon,
  message,
  className,
}: CompactEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 px-6 text-center', className)}>
      <Icon className="h-12 w-12 text-text-muted mb-3" />
      <p className="text-text-secondary">
        {message}
      </p>
    </div>
  )
}

