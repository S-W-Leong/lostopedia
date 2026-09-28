import { X } from 'lucide-react'
import { Badge } from './badge'
import { cn } from '@/lib/utils/cn'

interface FilterChipProps {
  label: string
  removeLabel: string
  onRemove: () => void
  className?: string
}

export function FilterChip({ label, removeLabel, onRemove, className }: FilterChipProps) {
  return (
    <Badge variant="secondary" className={cn('gap-1.5 pr-1', className)}>
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-base hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </Badge>
  )
}
