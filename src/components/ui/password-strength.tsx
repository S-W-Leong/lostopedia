'use client'

import { cn } from '@/lib/utils'
import { getPasswordStrength } from '@/lib/validations/auth'

interface PasswordStrengthProps {
  password: string
  className?: string
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const { score, label, color } = getPasswordStrength(password)

  if (!password) return null

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              index <= score ? color : 'bg-border'
            )}
          />
        ))}
      </div>
      <p className="text-xs text-text-muted">
        Password strength: <span className="font-medium">{label}</span>
      </p>
    </div>
  )
}

