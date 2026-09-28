import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface UserLinkProps {
  userId: string
  displayName: string
  className?: string
  children?: React.ReactNode
}

/**
 * A link component that navigates to a user's public profile
 * Use this whenever displaying a username that should be clickable
 */
export function UserLink({ userId, displayName, className, children }: UserLinkProps) {
  return (
    <Link
      href={`/user/${userId}`}
      className={cn(
        'hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded',
        className
      )}
    >
      {children || displayName}
    </Link>
  )
}
