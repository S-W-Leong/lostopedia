'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { CheckCircle } from 'lucide-react'

export function AccountDeletedNotification() {
  const searchParams = useSearchParams()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (searchParams.get('deleted') === 'true') {
      setShow(true)

      // Clean up URL after showing message
      const url = new URL(window.location.href)
      url.searchParams.delete('deleted')
      window.history.replaceState({}, '', url.toString())

      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        setShow(false)
      }, 8000)

      return () => clearTimeout(timer)
    }
  }, [searchParams])

  if (!show) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-fade-in">
      <Alert variant="success" className="shadow-lg">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
          <div>
            <p className="font-medium">Account deleted successfully</p>
            <p className="text-sm text-text-secondary mt-1">
              Your account and associated data have been removed.
            </p>
          </div>
        </div>
      </Alert>
    </div>
  )
}
