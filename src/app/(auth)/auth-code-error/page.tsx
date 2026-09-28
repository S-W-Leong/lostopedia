import Link from 'next/link'
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

export function getAuthCodeErrorMessage(reason?: string): string {
  if (reason === 'expired_link') {
    return 'This verification link has expired. Please request a new email and try again.'
  }
  if (reason === 'missing_pkce_state') {
    return 'This link must be completed in the same browser where it was requested. Please request a new link in this browser.'
  }
  return 'The verification link is invalid or could not be completed. Please request a new verification email.'
}

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-danger-muted rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-danger" />
        </div>
        <h1 className="text-display text-3xl text-text-primary">Verification Error</h1>
        <p className="text-text-secondary">
          There was a problem verifying your email address
        </p>
      </div>

      {/* Content */}
      <div className="card p-6 space-y-4">
        <Alert variant="error">
          {getAuthCodeErrorMessage(reason)}
        </Alert>

        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            <strong className="text-text-primary">Common causes:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>The link has expired (verification links are valid for 24 hours)</li>
            <li>The link has already been used</li>
            <li>The link was copied incorrectly</li>
          </ul>
        </div>

        <div className="pt-4 border-t border-border space-y-3">
          <Button variant="default" className="w-full" asChild>
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/signup">
              <Mail className="h-4 w-4" />
              Create New Account
            </Link>
          </Button>
        </div>
      </div>

      {/* Support link */}
      <p className="text-center text-sm text-text-muted">
        Need help?{' '}
        <Link href="/support" className="text-accent hover:underline">
          Contact support
        </Link>
      </p>
    </div>
  )
}
