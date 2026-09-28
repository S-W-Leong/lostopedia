'use client'

import { useState } from 'react'
import { KeyRound, Mail } from 'lucide-react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { resetPassword } from '@/lib/supabase/auth'

interface PasswordResetCardProps {
  email?: string | null
}

export function PasswordResetCard({ email }: PasswordResetCardProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasEmail = Boolean(email)

  const handleResetRequest = async () => {
    if (!email) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await resetPassword(email)

      if (!result.success) {
        setError(result.error?.message || 'Failed to send reset email. Please try again.')
        return
      }

      setSuccess(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted">
          <KeyRound className="h-5 w-5 text-accent" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-text-primary">Password &amp; Security</h2>
          <p className="text-sm text-text-secondary">
            Request a secure password reset link by email instead of changing it directly here.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-lg bg-bg-overlay p-4">
          <p className="text-sm text-text-muted">Reset email destination</p>
          <p className="mt-1 text-sm font-medium text-text-primary">
            {email || 'No account email is available right now.'}
          </p>
        </div>

        {!hasEmail && (
          <Alert variant="error">
            We couldn&apos;t find your account email. Please refresh the page or sign in again.
          </Alert>
        )}

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {success && email && (
          <Alert variant="success">
            We&apos;ve sent a password reset link to {email}. Open the email and continue on the
            reset screen to choose a new password.
          </Alert>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-secondary">
            {success
              ? 'Need another email? You can request a fresh reset link.'
              : 'We’ll email you a reset link that opens the existing secure recovery flow.'}
          </p>

          <Button
            type="button"
            onClick={handleResetRequest}
            disabled={!hasEmail || isSubmitting}
            isLoading={isSubmitting}
          >
            <Mail className="h-4 w-4" />
            {success ? 'Send another link' : 'Email me a reset link'}
          </Button>
        </div>
      </div>
    </div>
  )
}
