'use client'

import { useState, useEffect } from 'react'
import { Shield, Package, Ban, Check, Star, Trash2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ReputationDisplay } from '@/components/ui/reputation-display'
import { ReputationAdjust } from '@/components/admin/ReputationAdjust'
import type { DbUser } from '@/types/database'

interface UserWithStats extends DbUser {
  itemsCount: number
  flagsCount: number
}

interface UserDetailModalProps {
  user: UserWithStats
  onClose: () => void
  onUpdate: () => void
}

interface UserDetails {
  items: Array<{
    id: string
    title: string
    type: string
    status: string
    created_at: string
  }>
  reputationEvents: Array<{
    id: string
    event_type: string
    points_change: number
    notes: string | null
    created_at: string
  }>
  flagsCount: number
}

export function UserDetailModal({ user, onClose, onUpdate }: UserDetailModalProps) {
  const [details, setDetails] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [banReason, setBanReason] = useState('')
  const [showBanForm, setShowBanForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteItemsAndMessages, setDeleteItemsAndMessages] = useState(true)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  useEffect(() => {
    loadUserDetails()
  }, [user.id])

  async function loadUserDetails() {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`)
      const data = await response.json()

      if (data.success) {
        setDetails({
          items: data.user.items,
          reputationEvents: data.user.reputationEvents,
          flagsCount: data.user.flagsCount,
        })
      }
    } catch (error) {
      console.error('Error loading user details:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleBanToggle() {
    if (!user.is_banned && !banReason.trim()) {
      alert('Please provide a ban reason')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_banned: !user.is_banned,
          banned_reason: banReason,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onUpdate()
        onClose()
      } else {
        alert(data.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }


  async function handleDeleteUser() {
    if (deleteConfirmText !== 'DELETE') return
    setDeleteSubmitting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deleteItemsAndMessages,
          confirmText: deleteConfirmText,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error ?? 'Failed to delete user.')
        return
      }
      onUpdate()
      onClose()
    } catch {
      setDeleteError('Failed to delete user. Please try again.')
    } finally {
      setDeleteSubmitting(false)
    }
  }


  return (
    <>
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            User Details
            {user.is_admin && <Shield className="h-5 w-5 text-accent" />}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Info */}
          <div className="flex items-start gap-4 p-4 bg-bg-base rounded-lg">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name || 'User'}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-accent-muted flex items-center justify-center text-2xl font-bold text-accent">
                {user.display_name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-text-primary">
                {user.display_name || 'Unknown'}
              </h3>
              <p className="text-sm text-text-secondary">{user.email}</p>
              <p className="text-sm text-text-tertiary mt-1">
                Phone: {user.phone || 'Not provided'}
              </p>
              <p className="text-sm text-text-tertiary">
                Location: {user.campus_id || 'Not set'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={user.is_banned ? 'banned' : 'active'} />
                {user.is_admin && (
                  <span className="text-xs px-2 py-1 bg-accent-muted text-accent rounded">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-bg-base rounded-lg">
              <p className="text-sm text-text-secondary mb-2">Reputation</p>
              <ReputationDisplay
                score={user.reputation_score ?? 100}
                variant="detailed"
                size="md"
              />
            </div>
            <div className="p-4 bg-bg-base rounded-lg">
              <p className="text-sm text-text-secondary">Items Posted</p>
              <p className="text-2xl font-bold text-text-primary mt-2">
                {user.itemsCount}
              </p>
            </div>
            <div className="p-4 bg-bg-base rounded-lg">
              <p className="text-sm text-text-secondary">Flags Received</p>
              <p className="text-2xl font-bold text-text-primary mt-2">
                {details?.flagsCount || 0}
              </p>
            </div>
          </div>

          {/* Reputation Adjustment */}
          <div className="p-4 bg-bg-base rounded-lg">
            <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Adjust Reputation
            </h4>
            <ReputationAdjust
              userId={user.id}
              currentScore={user.reputation_score ?? 100}
              onUpdate={() => {
                onUpdate()
                loadUserDetails()
              }}
            />
          </div>

          {/* Recent Items */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Recent Items
            </h4>
            {loading ? (
              <p className="text-sm text-text-secondary">Loading...</p>
            ) : details && details.items.length > 0 ? (
              <div className="space-y-2">
                {details.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-bg-base rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-accent-muted text-accent rounded">
                          {item.type}
                        </span>
                        <StatusBadge status={item.status as any} />
                      </div>
                    </div>
                    <p className="text-xs text-text-tertiary">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No items posted</p>
            )}
          </div>

          {/* Ban Controls */}
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
            <h4 className="text-sm font-semibold text-danger mb-3 flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Ban Controls
            </h4>

            {user.is_banned ? (
              <div className="space-y-3">
                <div className="p-3 bg-bg-elevated rounded">
                  <p className="text-sm text-text-secondary">Ban Reason:</p>
                  <p className="text-sm text-text-primary mt-1">
                    {user.banned_reason || 'No reason provided'}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Banned on: {user.banned_at ? new Date(user.banned_at).toLocaleString() : 'Unknown'}
                  </p>
                </div>
                <Button
                  onClick={handleBanToggle}
                  disabled={submitting}
                  variant="outline"
                  className="w-full"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Unban User
                </Button>
              </div>
            ) : showBanForm ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-text-secondary">
                    Ban Reason (required)
                  </label>
                  <Textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Explain why this user is being banned..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleBanToggle}
                    disabled={submitting || !banReason.trim()}
                    variant="destructive"
                    className="flex-1"
                  >
                    Confirm Ban
                  </Button>
                  <Button
                    onClick={() => {
                      setShowBanForm(false)
                      setBanReason('')
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setShowBanForm(true)}
                variant="destructive"
                className="w-full"
              >
                <Ban className="h-4 w-4 mr-2" />
                Ban User
              </Button>
            )}
          </div>

          {/* Delete user */}
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
            <h4 className="text-sm font-semibold text-danger mb-3 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Delete user
            </h4>
            <p className="text-sm text-text-secondary mb-3">
              Permanently remove this account and optionally their items and messages. Only admins
              can delete banned users.
            </p>
            <Button
              onClick={() => {
                setShowDeleteDialog(true)
                setDeleteConfirmText('')
                setDeleteError(null)
                setDeleteItemsAndMessages(true)
              }}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete user
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-danger">Delete user</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left">
              <p>
                Permanently delete this account. This cannot be undone.
              </p>
              <p className="text-text-secondary">
                User has {user.itemsCount} item{user.itemsCount !== 1 ? 's' : ''}. Choose whether
                to delete or keep them (attributed to &quot;Deleted User&quot;).
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Delete their items and messages?</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="adminDeleteItems"
                  checked={deleteItemsAndMessages === true}
                  onChange={() => setDeleteItemsAndMessages(true)}
                  className="rounded-full border-border"
                />
                <span className="text-sm">Yes, delete everything</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="adminDeleteItems"
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
            <Label htmlFor="admin-delete-confirm">
              Type <strong>DELETE</strong> to confirm
            </Label>
            <Input
              id="admin-delete-confirm"
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
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(false)}
            disabled={deleteSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteUser}
            disabled={deleteConfirmText !== 'DELETE' || deleteSubmitting}
          >
            {deleteSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Delete user'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}
