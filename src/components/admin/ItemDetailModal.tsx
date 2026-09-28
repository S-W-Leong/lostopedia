'use client'

import { useState, useEffect } from 'react'
import { organization } from '@/lib/organization/config'
import { MapPin, Calendar, User, AlertTriangle, Check, Eye, MessageSquare, Flag, Ban } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_LABELS } from '@/lib/constants'
import type { ItemType, ItemStatus, ItemCategory, FlagReason } from '@/lib/constants'

const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  spam: 'Spam or misleading content',
  inappropriate_content: 'Inappropriate or offensive content',
  scam: 'Suspected scam or fraudulent activity',
  duplicate: 'Duplicate posting',
  harassment: 'Harassment or bullying',
  fake_item: 'Fake or incorrect item information',
  other: 'Other reason',
}

interface ItemWithDetails {
  id: string
  type: ItemType
  title: string
  description: string
  category: ItemCategory
  image_url: string | null
  location_text: string
  date_lost_found: string | null
  status: ItemStatus
  created_at: string
  flag_count: number
  is_flagged: boolean
  removed_by: string | null
  removed_at: string | null
  removed_reason: string | null
  removed_flag_id: string | null
  poster: {
    id: string
    display_name: string | null
    email: string
    avatar_url: string | null
    reputation_score: number
    is_banned: boolean
  }
  flags?: Array<{
    id: string
    reason: FlagReason
    description: string | null
    status: string
    created_at: string
    reporter: {
      id: string
      display_name: string | null
      email: string
      avatar_url: string | null
    }
  }>
  messagesCount?: number
  claimant_name?: string | null
  claimant_student_id?: string | null
  claimant_recorded_by?: string | null
}

interface ItemDetailModalProps {
  item: ItemWithDetails
  onClose: () => void
  onUpdate: () => void
}

export function ItemDetailModal({ item: initialItem, onClose, onUpdate }: ItemDetailModalProps) {
  const [item, setItem] = useState<ItemWithDetails>(initialItem)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showFlagForm, setShowFlagForm] = useState(false)
  const [flagReason, setFlagReason] = useState<FlagReason>('spam')
  const [flagDescription, setFlagDescription] = useState('')
  const [removalReason, setRemovalReason] = useState<FlagReason>('spam')
  const [removalNotes, setRemovalNotes] = useState('')

  useEffect(() => {
    loadItemDetails()
  }, [initialItem.id])

  async function loadItemDetails() {
    try {
      const response = await fetch(`/api/admin/items/${initialItem.id}`)
      const data = await response.json()

      if (data.success) {
        setItem(data.item)
      }
    } catch (error) {
      console.error('Error loading item details:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore() {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/admin/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })

      const data = await response.json()

      if (data.success) {
        onUpdate()
        onClose()
      } else {
        alert(data.error || 'Failed to restore item')
      }
    } catch (error) {
      console.error('Error restoring item:', error)
      alert('Failed to restore item')
    } finally {
      setSubmitting(false)
      setShowRestoreConfirm(false)
    }
  }

  async function handleRemove() {
    if (!removalNotes.trim()) {
      alert('Please provide a reason for removing this item')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/admin/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'removed',
          removal_reason: removalReason,
          removal_notes: removalNotes.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        onUpdate()
        onClose()
      } else {
        alert(data.error || 'Failed to remove item')
      }
    } catch (error) {
      console.error('Error removing item:', error)
      alert('Failed to remove item')
    } finally {
      setSubmitting(false)
      setShowRemoveConfirm(false)
    }
  }

  async function handleCreateFlag() {
    if (!flagDescription.trim()) {
      alert('Please provide a description for the flag')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          reason: flagReason,
          description: flagDescription.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert('Flag created successfully')
        setShowFlagForm(false)
        setFlagReason('spam')
        setFlagDescription('')
        loadItemDetails()
        onUpdate()
      } else {
        alert(data.error || 'Failed to create flag')
      }
    } catch (error) {
      console.error('Error creating flag:', error)
      alert('Failed to create flag')
    } finally {
      setSubmitting(false)
    }
  }

  function renderStars(score: number) {
    const fullStars = Math.floor(score)
    const hasHalfStar = score % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className="text-accent">★</span>
        ))}
        {hasHalfStar && <span className="text-accent">☆</span>}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`empty-${i}`} className="text-text-tertiary">☆</span>
        ))}
      </div>
    )
  }

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Item Details
              {item.is_flagged && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Flagged
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Item Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image */}
              <div>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 bg-bg-base rounded-lg flex items-center justify-center">
                    <p className="text-text-tertiary">No image</p>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-text-primary">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={item.type === 'lost' ? 'destructive' : 'default'}
                    >
                      {item.type}
                    </Badge>
                    <StatusBadge status={item.status} />
                    <span className="text-sm text-text-tertiary">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-text-secondary">Description</p>
                  <p className="text-sm text-text-primary mt-1">
                    {item.description}
                  </p>
                </div>

                {item.status === 'completed' &&
                  (item.claimant_name || item.claimant_student_id) && (
                    <div className="rounded-lg border border-border bg-bg-base p-3">
                      <p className="text-sm font-medium text-text-primary mb-2">Claimed by (office handoff)</p>
                      {item.claimant_name && (
                        <p className="text-sm text-text-secondary">
                          Name: <span className="text-text-primary">{item.claimant_name}</span>
                        </p>
                      )}
                      {item.claimant_student_id && (
                        <p className="text-sm text-text-secondary mt-1">
                          {organization.claimantReference.label}:{' '}
                          <span className="text-text-primary">{item.claimant_student_id}</span>
                        </p>
                      )}
                    </div>
                  )}

                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-text-tertiary mt-0.5" />
                  <div>
                    <p className="text-sm text-text-secondary">Location</p>
                    <p className="text-sm text-text-primary">{item.location_text}</p>
                  </div>
                </div>

                {item.date_lost_found && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-text-tertiary mt-0.5" />
                    <div>
                      <p className="text-sm text-text-secondary">Date Lost/Found</p>
                      <p className="text-sm text-text-primary">
                        {new Date(item.date_lost_found).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-text-tertiary mt-0.5" />
                  <div>
                    <p className="text-sm text-text-secondary">Messages</p>
                    <p className="text-sm text-text-primary">
                      {item.messagesCount || 0} conversation(s)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Poster Info */}
            <div className="p-4 bg-bg-base rounded-lg">
              <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Posted By
              </h4>
              <div className="flex items-center gap-3">
                {item.poster.avatar_url ? (
                  <img
                    src={item.poster.avatar_url}
                    alt={item.poster.display_name || 'User'}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-accent-muted flex items-center justify-center text-accent font-medium">
                    {item.poster.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">
                      {item.poster.display_name || 'Unknown'}
                    </p>
                    {item.poster.is_banned && (
                      <Badge variant="destructive" className="text-xs">Banned</Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">{item.poster.email}</p>
                  <div className="mt-1">{renderStars(item.poster.reputation_score)}</div>
                </div>
              </div>
            </div>

            {/* Flags */}
            {loading ? (
              <p className="text-sm text-text-secondary">Loading flags...</p>
            ) : item.flags && item.flags.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                  Flags ({item.flags.length})
                </h4>
                <div className="space-y-3">
                  {item.flags.map((flag) => (
                    <div
                      key={flag.id}
                      className="p-3 bg-danger/10 border border-danger/20 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="destructive" className="text-xs">
                              {flag.reason.replace(/_/g, ' ')}
                            </Badge>
                            <StatusBadge status={flag.status as any} />
                          </div>
                          {flag.description && (
                            <p className="text-sm text-text-primary mt-2">
                              {flag.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-xs text-text-tertiary">
                              Reported by {flag.reporter.display_name || flag.reporter.email}
                            </p>
                            <span className="text-xs text-text-tertiary">•</span>
                            <p className="text-xs text-text-tertiary">
                              {new Date(flag.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Flag Creation Form */}
            {!loading && item.status !== 'removed' && (
              <div className="pt-4 border-t border-border">
                {!showFlagForm ? (
                  <Button
                    onClick={() => setShowFlagForm(true)}
                    variant="outline"
                    className="w-full"
                  >
                    {}<Flag className="h-4 w-4 mr-2" />
                    Create Flag for This Item
                  </Button>
                ) : (
                  <div className="space-y-4 p-4 bg-bg-base border border-border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-text-primary">Create Flag</h4>
                      <button
                        onClick={() => {
                          setShowFlagForm(false)
                          setFlagReason('spam')
                          setFlagDescription('')
                        }}
                        className="text-text-tertiary hover:text-text-primary"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-text-primary">Reason</label>
                      <select
                        value={flagReason}
                        onChange={(e) => setFlagReason(e.target.value as FlagReason)}
                        className="mt-1 w-full px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        {Object.entries(FLAG_REASON_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-text-primary">Description</label>
                      <Textarea
                        value={flagDescription}
                        onChange={(e) => setFlagDescription(e.target.value)}
                        placeholder="Provide details about why this item should be flagged..."
                        className="mt-1"
                        rows={3}
                        maxLength={500}
                      />
                      <p className="text-xs text-text-tertiary mt-1">
                        {flagDescription.length}/500 characters
                      </p>
                    </div>

                    <Button
                      onClick={handleCreateFlag}
                      disabled={submitting || !flagDescription.trim()}
                      className="w-full"
                    >
                      {submitting ? 'Creating Flag...' : 'Create Flag'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Admin Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-border">
              {item.status === 'removed' ? (
                <>
                  <Button
                    onClick={() => setShowRestoreConfirm(true)}
                    disabled={submitting}
                    variant="outline"
                    className="w-full"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Restore Item
                  </Button>
                  {item.removed_flag_id && (
                    <a
                      href={`/admin/flags?flagId=${item.removed_flag_id}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-accent hover:text-accent/80 border border-accent/20 hover:bg-accent/10 rounded-md transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View Removal Flag
                    </a>
                  )}
                </>
              ) : (
                <>
                  {!showRemoveConfirm ? (
                    <Button
                      onClick={() => setShowRemoveConfirm(true)}
                      disabled={submitting}
                      variant="destructive"
                      className="w-full"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Remove Item
                    </Button>
                  ) : (
                    <div className="space-y-4 p-4 bg-danger/10 border border-danger/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-danger">Remove Item</h4>
                        <button
                          onClick={() => {
                            setShowRemoveConfirm(false)
                            setRemovalReason('spam')
                            setRemovalNotes('')
                          }}
                          className="text-text-tertiary hover:text-text-primary"
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-text-primary">Reason for Removal</label>
                        <select
                          value={removalReason}
                          onChange={(e) => setRemovalReason(e.target.value as FlagReason)}
                          className="mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-danger/30 focus:ring-offset-2 focus:ring-offset-bg-base"
                          disabled={submitting}
                        >
                          {Object.entries(FLAG_REASON_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-text-primary">Notes (Required)</label>
                        <Textarea
                          value={removalNotes}
                          onChange={(e) => setRemovalNotes(e.target.value)}
                          placeholder="Provide a detailed explanation for why this item is being removed..."
                          className="mt-1"
                          rows={3}
                          maxLength={500}
                          disabled={submitting}
                        />
                        <p className="text-xs text-text-tertiary mt-1">
                          {removalNotes.length}/500 characters
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleRemove}
                          disabled={submitting || !removalNotes.trim()}
                          variant="destructive"
                          className="flex-1"
                        >
                          {submitting ? 'Removing...' : 'Confirm Removal'}
                        </Button>
                      </div>

                      <p className="text-xs text-text-secondary">
                        ⚠️ This action will immediately remove the item from public view. The poster may be notified.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Removal Info */}
            {item.removed_at && (
              <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-danger mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-danger">Item Removed</p>
                    <p className="text-xs text-text-secondary mt-1">
                      Removed on {new Date(item.removed_at).toLocaleString()}
                    </p>
                    {item.removed_reason && (
                      <p className="text-xs text-text-secondary mt-1">
                        <strong>Reason:</strong> {item.removed_reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        onConfirm={handleRestore}
        title="Restore Item"
        description="Are you sure you want to restore this item? It will be visible to users again."
        confirmText="Restore"
      />
    </>
  )
}
