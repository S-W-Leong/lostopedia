'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Save, Loader2, Trash2, Mail, Phone, Calendar, Award, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { BadgesDisplay } from '@/components/profile/BadgesDisplay'
import { PasswordResetCard } from '@/components/profile/PasswordResetCard'
import { ReputationDisplay } from '@/components/ui/reputation-display'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

import {
  profileSchema,
  type ProfileFormData,
  validateAvatarFile,
} from '@/lib/validations/profile'
import type { UserBadge } from '@/types'

export default function ProfilePage() {
  const { user, profile, isLoading, refreshProfile } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [badges, setBadges] = useState<UserBadge[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteContext, setDeleteContext] = useState<{
    activeItemsCount: number
    conversationsCount: number
  } | null>(null)
  const [deleteItemsAndMessages, setDeleteItemsAndMessages] = useState(true)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      displayName: profile?.display_name || '',
      phone: profile?.phone || '',
    },
  })

  useEffect(() => {
    async function fetchBadges() {
      if (!user) return

      const supabase = createClient()
      const { data } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)

      if (data) {
        setBadges(data.map((b: any) => ({
          id: b.id,
          userId: b.user_id,
          badgeType: b.badge_type,
          earnedAt: b.earned_at,
        })))
      }
    }

    fetchBadges()
  }, [user])

  useEffect(() => {
    if (!deleteModalOpen) return
    setDeleteError(null)
    setDeleteConfirmText('')
    setDeleteItemsAndMessages(true)
    fetch('/api/account/delete-context')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDeleteContext({
            activeItemsCount: data.activeItemsCount ?? 0,
            conversationsCount: data.conversationsCount ?? 0,
          })
        } else {
          setDeleteContext({ activeItemsCount: 0, conversationsCount: 0 })
        }
      })
      .catch(() => setDeleteContext({ activeItemsCount: 0, conversationsCount: 0 }))
  }, [deleteModalOpen])

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return

    setError(null)
    setSuccess(null)

    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('users')
      .update({
        display_name: data.displayName,
        phone: data.phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      setError('Failed to update profile. Please try again.')
      return
    }

    await refreshProfile()
    setSuccess('Profile updated successfully!')
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file
    const validationError = validateAvatarFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSuccess(null)
    setAvatarLoading(true)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to upload image. Please try again.')
        return
      }

      await refreshProfile()
      setSuccess('Avatar updated successfully!')
    } catch {
      setError('Failed to upload avatar. Please try again.')
    } finally {
      setAvatarLoading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar_url) return

    setError(null)
    setSuccess(null)
    setAvatarLoading(true)

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to remove avatar. Please try again.')
        return
      }

      await refreshProfile()
      setSuccess('Avatar removed successfully!')
    } catch {
      setError('Failed to remove avatar. Please try again.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return
    setDeleteSubmitting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deleteItemsAndMessages,
          confirmText: deleteConfirmText,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error ?? 'Failed to delete account.')
        return
      }

      // Account deleted successfully - redirect to landing page
      // Use window.location instead of signOut() to avoid redirect errors
      window.location.href = '/?deleted=true'
    } catch (err) {
      console.error('Delete account error:', err)
      setDeleteError('Failed to delete account. Please try again.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error">
          Unable to load profile. Please try signing in again.
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-up">
      {/* Page Header */}
      <div>
        <h1 className="text-display text-3xl text-text-primary">Profile</h1>
        <p className="text-text-secondary mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" className="animate-fade-in">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="animate-fade-in">
          {success}
        </Alert>
      )}

      {/* Avatar Section */}
      <div className="card p-6">
        <h2 className="text-lg font-medium text-text-primary mb-4">Profile Photo</h2>
        
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <Avatar
              src={profile.avatar_url}
              alt={profile.display_name || 'User'}
              size="xl"
              className="transition-opacity group-hover:opacity-75"
            />
            
            {avatarLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
            
            {!avatarLoading && (
              <button
                onClick={handleAvatarClick}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="h-8 w-8 text-white" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAvatarClick}
              disabled={avatarLoading}
            >
              <Camera className="h-4 w-4" />
              Upload Photo
            </Button>
            
            {profile.avatar_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={avatarLoading}
                className="text-danger hover:text-danger hover:bg-danger/10"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            )}
            
            <p className="text-xs text-text-muted">
              JPEG, PNG, GIF, or WebP. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="card p-6">
        <h2 className="text-lg font-medium text-text-primary mb-4">Personal Information</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" required>
              Display Name
            </Label>
            <Input
              id="displayName"
              placeholder="Your name"
              error={!!errors.displayName}
              {...register('displayName')}
            />
            {errors.displayName && (
              <p className="text-sm text-danger">{errors.displayName.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+60 12-345-6789"
              error={!!errors.phone}
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-danger">{errors.phone.message}</p>
            )}
            <p className="text-xs text-text-muted">
              Optional. This may be shared when resolving item claims.
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <Button type="submit" isLoading={isSubmitting} disabled={!isDirty}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Account Info (Read-only) */}
      <div className="card p-6">
        <h2 className="text-lg font-medium text-text-primary mb-4">Account Information</h2>
        
        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-bg-overlay">
              <Mail className="h-5 w-5 text-text-muted" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Email</p>
              <p className="text-text-primary">{user.email}</p>
            </div>
          </div>

          {/* Phone (display) */}
          {profile.phone && (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-bg-overlay">
                <Phone className="h-5 w-5 text-text-muted" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Phone</p>
                <p className="text-text-primary">{profile.phone}</p>
              </div>
            </div>
          )}

          {/* Member Since */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-bg-overlay">
              <Calendar className="h-5 w-5 text-text-muted" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Member Since</p>
              <p className="text-text-primary">
                {profile.created_at ? format(new Date(profile.created_at), 'MMMM d, yyyy') : 'N/A'}
              </p>
            </div>
          </div>

          {/* Reputation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-bg-overlay">
              <Award className="h-5 w-5 text-text-muted" />
            </div>
            <div>
              <p className="text-sm text-text-muted mb-2">Reputation</p>
              <ReputationDisplay
                score={profile.reputation_score ?? 100}
                variant="detailed"
                size="md"
              />
            </div>
          </div>
        </div>
      </div>

      <PasswordResetCard email={user.email} />

      {/* Recovery Badges */}
      <div className="card p-6">
        <BadgesDisplay
          badges={badges}
          totalItemsReturned={profile.total_items_returned || 0}
        />
      </div>

      {/* Danger zone */}
      <div className="card p-6 border-danger/30">
        <h2 className="text-lg font-medium text-text-primary flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-danger" />
          Danger zone
        </h2>
        <p className="text-sm text-text-secondary mt-1 mb-4">
          Irreversible and destructive actions.
        </p>
        {profile.is_banned ? (
          <p className="text-sm text-text-secondary">
            You cannot delete your account. Contact an administrator.
          </p>
        ) : (
          <Button
            variant="outline"
            className="border-danger text-danger hover:bg-danger/10"
            onClick={() => setDeleteModalOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete my account
          </Button>
        )}
      </div>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-danger">Delete my account</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-left">
                <p>This cannot be undone. Your account and associated data will be removed.</p>
                {deleteContext && (
                  <p className="text-text-secondary">
                    You have {deleteContext.activeItemsCount} active listing
                    {deleteContext.activeItemsCount !== 1 ? 's' : ''} and{' '}
                    {deleteContext.conversationsCount} conversation
                    {deleteContext.conversationsCount !== 1 ? 's' : ''}. Decide below whether to
                    delete or keep them.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Do you want to delete your items and messages?</Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteItems"
                    checked={deleteItemsAndMessages === true}
                    onChange={() => setDeleteItemsAndMessages(true)}
                    className="rounded-full border-border"
                  />
                  <span className="text-sm">Yes, delete everything</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteItems"
                    checked={deleteItemsAndMessages === false}
                    onChange={() => setDeleteItemsAndMessages(false)}
                    className="rounded-full border-border"
                  />
                  <span className="text-sm">
                    No, keep them (attributed to &quot;Deleted User&quot;)
                  </span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <strong>DELETE</strong> to confirm
              </Label>
              <Input
                id="delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
                autoComplete="off"
              />
            </div>
            {deleteError && (
              <Alert variant="error" className="animate-fade-in">
                {deleteError}
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleteSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || deleteSubmitting}
            >
              {deleteSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete my account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
