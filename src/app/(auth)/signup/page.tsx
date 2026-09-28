'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert } from '@/components/ui/alert'
import { PasswordStrength } from '@/components/ui/password-strength'
import { signUp } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'
import { signUpSchema, type SignUpFormData } from '@/lib/validations/auth'
import { organization } from '@/lib/organization/config'
import { registrationDescription } from '@/lib/organization/registration'

export default function SignUpPage() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return
      router.replace('/dashboard')
      router.refresh()
    })
    return () => {
      cancelled = true
    }
  }, [router])

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      acceptTerms: false,
    },
  })

  const password = useWatch({ control, name: 'password', defaultValue: '' })

  const onSubmit = async (data: SignUpFormData) => {
    setError(null)

    const result = await signUp(data.email, data.password, data.displayName)

    if (!result.success) {
      setError(result.error?.message || 'Failed to create account. Please try again.')
      return
    }

    if (result.redirectTo) {
      router.push(result.redirectTo)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-display text-3xl text-text-primary">Create account</h1>
        <p className="text-text-secondary">
          Join {organization.name} to help find lost items
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
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" required>
              Full Name
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              error={!!errors.displayName}
              {...register('displayName')}
            />
            {errors.displayName && (
              <p className="text-sm text-danger">{errors.displayName.message}</p>
            )}
          </div>

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
            <Label htmlFor="password" required>
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
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
            <PasswordStrength password={password} />
            {errors.password && (
              <p className="text-sm text-danger">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" required>
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                error={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-danger">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Terms */}
          <div className="space-y-2">
            <Checkbox
              id="acceptTerms"
              label={
                <span>
                  I agree to the{' '}
                  <Link href="/terms" className="text-accent hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-accent hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              }
              error={!!errors.acceptTerms}
              {...register('acceptTerms')}
            />
            {errors.acceptTerms && (
              <p className="text-sm text-danger">{errors.acceptTerms.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            <UserPlus className="h-4 w-4" />
            Create Account
          </Button>
        </form>
      </div>

      {/* Sign in link */}
      <p className="text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
