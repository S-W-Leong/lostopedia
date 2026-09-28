'use client'

import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReportButtonProps {
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function ReportButton({ 
  onClick, 
  disabled = false,
  variant = 'ghost',
  size = 'sm'
}: ReportButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      size={size}
      className="gap-2"
    >
      <Flag className="h-4 w-4" />
      Report
    </Button>
  )
}

