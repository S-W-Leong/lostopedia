'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { safePostAuthRedirectPath } from '@/lib/auth/post-auth-redirect'
import { signIn } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'
import { signInSchema, type SignInFormData } from '@/lib/validations/auth'
import { organization } from '@/lib/organization/config'
import { registrationDescription } from '@/lib/organization/registration'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = safePostAuthRedirectPath(searchParams.get('redirect'))

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  })

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return
      router.replace(redirectTo)
      router.refresh()
    })
    return () => {
      cancelled = true
    }
  }, [router, redirectTo])

  const onSubmit = async (data: SignInFormData) => {
    setError(null)

    const result = await signIn(data.email, data.password)

    if (!result.success) {
      setError(result.error?.message || 'Failed to sign in. Please try again.')
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-display text-3xl text-text-primary">Welcome back</h1>
        <p className="text-text-secondary">
          Sign in to your account to continue
        </p>
        <p className="text-sm text-text-tertiary">
          {registrationDescription(organization.registration)}
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
              placeholder="member@example.org"
              autoComplete="email"
              error={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-danger">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" required>
                Password
              </Label>
              <Link
                href="/reset-password"
                className="text-sm text-accent hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                error={!!errors.password}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-danger">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </form>
      </div>

      {/* Sign up link */}
      <p className="text-center text-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-accent hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-display text-3xl text-text-primary">Welcome back</h1>
        <p className="text-text-secondary">Loading...</p>
      </div>
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 rounded bg-surface-2" />
          <div className="h-10 rounded bg-surface-2" />
          <div className="h-10 rounded bg-surface-2" />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
