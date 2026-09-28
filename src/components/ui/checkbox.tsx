'use client'
import * as React from 'react'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode
  error?: boolean
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, checked: controlledChecked, onChange, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(props.defaultChecked || false)
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    
    // Use controlled value if provided, otherwise use internal state
    const isControlled = controlledChecked !== undefined
    const checked = isControlled ? controlledChecked : internalChecked

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalChecked(e.target.checked)
      }
      onChange?.(e)
    }

    const handleClick = () => {
      if (!props.disabled) {
        const input = document.getElementById(inputId) as HTMLInputElement
        if (input) {
          input.click()
        }
      }
    }

    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="checkbox"
            id={inputId}
            ref={ref}
            className="sr-only peer"
            checked={checked}
            onChange={handleChange}
            {...props}
          />
          <div
            className={cn(
              'h-4 w-4 rounded border transition-colors cursor-pointer',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-accent',
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
              checked
                ? 'bg-accent border-accent'
                : error
                  ? 'border-danger bg-transparent'
                  : 'border-border bg-transparent hover:border-border-hover',
              className
            )}
            onClick={handleClick}
          >
            {checked && (
              <Check className="absolute left-0.5 top-0.5 h-3 w-3 text-primary-foreground" />
            )}
          </div>
        </div>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm cursor-pointer select-none',
              error ? 'text-danger' : 'text-text-secondary',
              props.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {label}
          </label>
        )}
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
