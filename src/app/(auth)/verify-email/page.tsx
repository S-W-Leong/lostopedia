import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { organization } from '@/lib/organization/config'

export default function VerifyEmailPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-accent-muted rounded-full flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-accent" />
        </div>
        <h1 className="text-display text-3xl text-text-primary">Verify your email</h1>
        <p className="text-text-secondary">
          We&apos;ve sent a verification link to your email address
        </p>
      </div>

      {/* Content */}
      <div className="card p-6 space-y-4">
        <Alert variant="info">
          Please click the link in the email to verify your account and start using {organization.name}.
        </Alert>

        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            <strong className="text-text-primary">Didn&apos;t receive the email?</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Check your spam or junk folder</li>
            <li>Make sure you entered the correct email address</li>
            <li>Wait a few minutes and try again</li>
          </ul>
        </div>

        <div className="pt-4 border-t border-border">
          <Link href="/login">
            <Button variant="secondary" className="w-full">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
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
