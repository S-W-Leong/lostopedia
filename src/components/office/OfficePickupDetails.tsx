import Link from 'next/link'
import { Clock, ExternalLink, HelpCircle, Mail, MapPin, Phone } from 'lucide-react'
import {
  HELP_LOST_FOUND_OFFICE_ANCHOR,
  LOST_FOUND_OFFICE,
} from '@/lib/campus/lost-found-office'
import { cn } from '@/lib/utils/cn'

const helpHref = `/help#${HELP_LOST_FOUND_OFFICE_ANCHOR}`

export interface OfficePickupDetailsProps {
  variant: 'compact' | 'full'
  className?: string
  showHelpLink?: boolean
}

export function OfficePickupDetails({ variant, className, showHelpLink = true }: OfficePickupDetailsProps) {
  const isCompact = variant === 'compact'

  return (
    <div
      className={cn(
        isCompact ? 'space-y-2.5 text-sm' : 'space-y-3 text-sm',
        isCompact ? 'text-inherit' : 'text-text-secondary',
        className
      )}
    >
      <p className={cn('font-medium', isCompact ? 'text-inherit' : 'text-text-primary')}>
        {LOST_FOUND_OFFICE.department}
      </p>
      <p
        className={cn(
          'leading-relaxed',
          isCompact ? 'text-inherit opacity-90' : 'text-text-secondary'
        )}
      >
        {LOST_FOUND_OFFICE.buildingLine}
      </p>
      {(LOST_FOUND_OFFICE.phoneDisplay || LOST_FOUND_OFFICE.email) && (
        <div className={cn('space-y-1.5', !isCompact && 'rounded-lg border border-border/60 bg-muted/20 p-3')}>
          {LOST_FOUND_OFFICE.phoneDisplay && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              {LOST_FOUND_OFFICE.telHref ? (
                <a href={LOST_FOUND_OFFICE.telHref} className="text-accent hover:underline font-medium">
                  {LOST_FOUND_OFFICE.phoneDisplay}
                </a>
              ) : <span>{LOST_FOUND_OFFICE.phoneDisplay}</span>}
            </p>
          )}
          {LOST_FOUND_OFFICE.email && (
            <p className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <a href={`mailto:${LOST_FOUND_OFFICE.email}`} className="text-accent hover:underline break-all font-medium">
                {LOST_FOUND_OFFICE.email}
              </a>
            </p>
          )}
        </div>
      )}
      {LOST_FOUND_OFFICE.hoursLine && (
        <p className={cn('flex flex-wrap items-center gap-2', isCompact && 'opacity-90')}>
          <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span>{LOST_FOUND_OFFICE.hoursLine}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {showHelpLink && (
        <Link
          href={helpHref}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-muted/50"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          Full details in Help
        </Link>
        )}
        {LOST_FOUND_OFFICE.mapsUrl ? (
          <a
            href={LOST_FOUND_OFFICE.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-muted/50"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Open in Maps
            <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  )
}
