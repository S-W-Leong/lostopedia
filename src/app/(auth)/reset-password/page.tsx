'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { resetPassword } from '@/lib/supabase/auth'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations/auth'

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError(null)
    setSuccess(false)

    const result = await resetPassword(data.email)

    if (!result.success) {
      setError(result.error?.message || 'Failed to send reset email. Please try again.')
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-found-muted rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-found" />
          </div>
          <h1 className="text-display text-3xl text-text-primary">Check your email</h1>
          <p className="text-text-secondary">
            We&apos;ve sent you a password reset link. Please check your inbox and follow the instructions.
          </p>
        </div>

        <div className="card p-6 space-y-4">
          <Alert variant="info">
            If you don&apos;t see the email, check your spam folder or request a new link.
          </Alert>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setSuccess(false)}
          >
            Send another link
          </Button>
        </div>

        <p className="text-center">
          <Link href="/login" className="text-sm text-accent hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-display text-3xl text-text-primary">Reset password</h1>
        <p className="text-text-secondary">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {/* Form */}
      <div className="card p-6 space-y-6">
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" required>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-danger">{errors.email.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            <Mail className="h-4 w-4" />
            Send Reset Link
          </Button>
        </form>
      </div>

      {/* Back to login */}
      <p className="text-center">
        <Link href="/login" className="text-sm text-accent hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

