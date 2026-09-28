import * as React from 'react'
import { cn } from '@/lib/utils/cn'

interface SelectionCardOption<T extends string> {
  value: T
  title: React.ReactNode
  description: React.ReactNode
  activeClassName: string
}

interface SelectionCardRadioGroupProps<T extends string> {
  name: string
  legend: string
  value: T | undefined
  onChange: (value: T) => void
  options: SelectionCardOption<T>[]
  error?: string
  className?: string
  layoutClassName?: string
  legendClassName?: string
}

export function SelectionCardRadioGroup<T extends string>({
  name,
  legend,
  value,
  onChange,
  options,
  error,
  className,
  layoutClassName,
  legendClassName,
}: SelectionCardRadioGroupProps<T>) {
  return (
    <fieldset className={cn('space-y-3', className)}>
      <legend className={cn('text-sm font-medium text-text-primary', legendClassName)}>{legend}</legend>
      <div className={cn('flex flex-col gap-4 sm:flex-row', layoutClassName)}>
        {options.map((option) => {
          const inputId = `${name}-${option.value}`
          const checked = value === option.value

          return (
            <div
              key={option.value}
              className="flex-1 rounded-lg focus-within:ring-2 focus-within:ring-ring/30 focus-within:ring-offset-2 focus-within:ring-offset-bg-base"
            >
              <input
                id={inputId}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <label
                htmlFor={inputId}
                className={cn(
                  'flex min-h-11 cursor-pointer rounded-lg border-2 border-border bg-bg-elevated p-4 text-left transition-[background-color,border-color,box-shadow] hover:border-border-hover',
                  checked && option.activeClassName
                )}
              >
                <div>
                  <div className="mb-1 text-lg font-semibold text-text-primary">{option.title}</div>
                  <div className="text-sm text-text-secondary">{option.description}</div>
                </div>
              </label>
            </div>
          )
        })}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </fieldset>
  )
}
