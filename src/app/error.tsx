'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CONTACT_EMAIL } from '@/lib/constants'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24 bg-bg-base">
      <div className="text-center max-w-2xl mx-auto">
        {/* Error Icon */}
        <div className="mb-8 animate-fade-up">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-lost-muted mb-6">
            <AlertCircle className="h-16 w-16 text-lost" />
          </div>
        </div>

        {/* Message */}
        <div className="animate-fade-up stagger-1">
          <h1 className="text-3xl sm:text-4xl font-semibold text-text-primary mb-4">
            Something went wrong!
          </h1>
          <p className="text-lg text-text-secondary mb-2">
            We encountered an unexpected error. Don&apos;t worry, it&apos;s not your fault.
          </p>
          {error.message && (
            <p className="text-sm text-text-muted font-mono bg-surface-2 rounded px-4 py-2 mt-4 inline-block">
              {error.message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 animate-fade-up stagger-2">
          <Button size="lg" onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>

        {/* Support Message */}
        <p className="text-sm text-text-muted mt-8 animate-fade-up stagger-3">
          If this problem persists, please contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
          {error.digest && (
            <span className="block mt-2">
              Error ID: <code className="font-mono">{error.digest}</code>
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

