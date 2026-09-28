import Link from "next/link"
import { MapPin, Calendar, Building2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { UserLink } from "@/components/ui/user-link"
import { cn } from "@/lib/utils/cn"
import type { ItemCard as ItemCardType } from "@/types"
import { HELP_LOST_FOUND_OFFICE_ANCHOR } from "@/lib/campus/lost-found-office"
import { organization } from '@/lib/organization/config'

interface ItemCardProps {
  item: ItemCardType
  className?: string
  showActions?: boolean
  actions?: React.ReactNode
}

export function ItemCard({
  item,
  className,
  showActions = false,
  actions,
}: ItemCardProps) {
  const isLost = item.type === "lost"
  const isFound = item.type === "found"

  return (
    <Card
      className={cn(
        'card overflow-hidden flex flex-col h-full',
        isLost ? 'card-lost' : 'card-found',
        className
      )}
    >
      <Link
        href={`/item/${item.id}`}
        className="block aspect-video w-full bg-muted relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`View details for ${item.title}`}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground bg-secondary/50">
            <span className="text-sm">No image</span>
          </div>
        )}
        <div className="absolute top-2 left-2 pointer-events-none">
            <Badge
              variant={isLost ? "destructive" : "default"}
              className={cn(
                isFound && "border-found/20 bg-found text-found-foreground hover:bg-found/90"
              )}
            >
            {item.type === "lost" ? "Lost" : "Found"}
          </Badge>
        </div>
      </Link>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <Link
            href={`/item/${item.id}`}
            className="font-semibold leading-tight hover:underline line-clamp-1"
          >
            {item.title}
          </Link>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Calendar className="h-3 w-3" />
          <span>
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {item.description}
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{item.locationText}</span>
          </div>
          {item.pickupMethod === "office" && (
            <div className="flex items-start gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0 mt-0.5" aria-hidden />
              <span>
                Held at {organization.office.name}.{" "}
                <Link
                  href={`/help#${HELP_LOST_FOUND_OFFICE_ANCHOR}`}
                  className="text-accent hover:underline font-medium"
                >
                  Hours &amp; contact
                </Link>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Avatar
              src={item.poster.avatarUrl || undefined}
              alt={item.poster.displayName}
              size="xs"
            />
            <UserLink
              userId={item.poster.id}
              displayName={item.poster.displayName}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            />
          </div>
        </div>
      </CardContent>
      {showActions && actions && (
        <CardFooter className="p-4 pt-0 border-t bg-muted/20 mt-auto">
          <div className="w-full pt-3">{actions}</div>
        </CardFooter>
      )}
    </Card>
  )
}

export function ItemCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden flex flex-col h-full">
      <div className="aspect-video w-full bg-muted animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
        <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
        <div className="h-10 bg-muted animate-pulse rounded w-full" />
      </div>
    </div>
  )
}
