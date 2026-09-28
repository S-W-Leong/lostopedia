import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

export type NativeSelectProps = React.ComponentPropsWithoutRef<'select'>

/** Native select styled like SelectTrigger; avoids Radix Select body scroll lock. */
const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, ...props }, ref) => (
    <div className={cn('relative w-full', className)}>
      <select
        ref={ref}
        className={cn(
          'flex min-h-11 w-full cursor-pointer appearance-none rounded-md border border-input bg-bg-elevated px-3 py-2 pr-10 text-sm text-text-primary shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring/30 focus:ring-offset-2 focus:ring-offset-bg-base',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        {...props}
      />
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50"
        aria-hidden
      />
    </div>
  )
)
NativeSelect.displayName = 'NativeSelect'

export { NativeSelect }
