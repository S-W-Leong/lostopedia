import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface StatsCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  link?: string
  showAlert?: boolean
  description?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  link,
  showAlert,
  description,
}: StatsCardProps) {
  const content = (
    <div className="relative p-6 bg-bg-elevated border border-border rounded-lg hover:border-accent transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="text-3xl font-bold text-text-primary mt-2">{value}</p>
          {description && (
            <p className="text-xs text-text-tertiary mt-1">{description}</p>
          )}
        </div>
        <div className="relative">
          <div className="p-3 bg-accent-muted rounded-lg">
            <Icon className="h-6 w-6 text-accent" />
          </div>
          {showAlert && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
            >
              !
            </Badge>
          )}
        </div>
      </div>
    </div>
  )

  if (link) {
    return (
      <Link href={link} className="block">
        {content}
      </Link>
    )
  }

  return content
}

