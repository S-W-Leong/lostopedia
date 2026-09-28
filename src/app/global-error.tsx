'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center px-6 py-24 bg-black text-white">
          <div className="text-center max-w-2xl mx-auto">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/10 mb-6">
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-semibold mb-4">
              Application Error
            </h1>
            <p className="text-lg text-gray-400 mb-8">
              A critical error occurred. Please refresh the page to continue.
            </p>

            <button
              onClick={reset}
              className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Refresh Page
            </button>

            {error.digest && (
              <p className="text-sm text-gray-500 mt-8">
                Error ID: <code className="font-mono">{error.digest}</code>
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}

