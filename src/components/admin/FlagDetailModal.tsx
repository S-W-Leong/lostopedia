'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, User, Package, Ban, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/admin/StatusBadge'
import type { FlagReason } from '@/lib/constants'

interface FlagWithDetails {
  id: string
  flaggable_type: string
  flaggable_id: string
  reason: FlagReason
  description: string | null
  status: 'pending' | 'reviewed' | 'dismissed'
  created_at: string
  review_notes: string | null
  reviewed_at: string | null
  reporter: {
    id: string
    display_name: string | null
    email: string
    avatar_url: string | null
    reputation_score: number
  }
  reviewer?: {
    id: string
    display_name: string | null
    email: string
  } | null
  content?: {
    id: string
    title: string
    description: string
    type: string
    category: string
    image_url: string | null
    status: string
    created_at: string
    posted_by: string
    poster: {
      id: string
      display_name: string | null
      email: string
      avatar_url: string | null
      reputation_score: number
      is_banned: boolean
    }
  } | null
}

interface FlagDetailModalProps {
  flag: FlagWithDetails
  onClose: () => void
  onUpdate: () => void
}

const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  spam: 'Spam or misleading content',
  inappropriate_content: 'Inappropriate or offensive content',
  scam: 'Suspected scam or fraudulent activity',
  duplicate: 'Duplicate posting',
  harassment: 'Harassment or bullying',
  fake_item: 'Fake or incorrect item information',
  other: 'Other reason',
}

export function FlagDetailModal({ flag: initialFlag, onClose, onUpdate }: FlagDetailModalProps) {
  const [flag, setFlag] = useState<FlagWithDetails>(initialFlag)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reviewNotes, setReviewNotes] = useState(flag.review_notes || '')
  const [shouldRemoveItem, setShouldRemoveItem] = useState(false)

  useEffect(() => {
    loadFlagDetails()
  }, [initialFlag.id])

  async function loadFlagDetails() {
    try {
      const response = await fetch(`/api/flags/${initialFlag.id}`)
      const data = await response.json()

      if (data.success) {
        setFlag(data.flag)
        setReviewNotes(data.flag.review_notes || '')
      }
    } catch (error) {
      console.error('Error loading flag details:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(status: 'reviewed' | 'dismissed', removeItem: boolean = false) {
    setSubmitting(true)
    try {
      const body: any = {
        status,
        review_notes: reviewNotes.trim() || null,
      }

      // Add action_taken if we're removing the item
      if (removeItem && status === 'reviewed') {
        body.action_taken = 'item_removed'
      }

      const response = await fetch(`/api/flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        onUpdate()
        onClose()
      } else {
        alert(data.error || 'Failed to update flag')
      }
    } catch (error) {
      console.error('Error updating flag:', error)
      alert('Failed to update flag')
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger" />
              Flag Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Flag Info */}
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge variant="destructive" className="mb-2">
                    {FLAG_REASON_LABELS[flag.reason]}
                  </Badge>
                  <p className="text-sm text-text-primary">
                    {flag.description || 'No additional details provided'}
                  </p>
                </div>
                <StatusBadge status={flag.status} />
              </div>
              <div className="text-xs text-text-tertiary">
                Reported on {new Date(flag.created_at).toLocaleString()}
              </div>
            </div>

            {/* Reporter Info */}
            <div className="p-4 bg-bg-base rounded-lg">
              <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Reported By
              </h4>
              <div className="flex items-center gap-3">
                {flag.reporter.avatar_url ? (
                  <img
                    src={flag.reporter.avatar_url}
                    alt={flag.reporter.display_name || 'User'}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-accent-muted flex items-center justify-center text-accent font-medium">
                    {flag.reporter.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {flag.reporter.display_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-text-secondary">{flag.reporter.email}</p>
                </div>
              </div>
            </div>

            {/* Flagged Content */}
            {loading ? (
              <p className="text-sm text-text-secondary">Loading content...</p>
            ) : flag.content ? (
              <div className="p-4 bg-bg-base rounded-lg">
                <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Flagged Item
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item Image */}
                  <div>
                    {flag.content.image_url ? (
                      <img
                        src={flag.content.image_url}
                        alt={flag.content.title}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-48 bg-bg-elevated rounded-lg flex items-center justify-center">
                        <p className="text-text-tertiary">No image</p>
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium text-text-primary">{flag.content.title}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={flag.content.type === 'lost' ? 'destructive' : 'default'}>
                          {flag.content.type}
                        </Badge>
                        <StatusBadge status={flag.content.status as any} />
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-3">
                      {flag.content.description}
                    </p>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-text-tertiary">
                        Posted by {flag.content.poster.display_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {new Date(flag.content.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Poster Info */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-text-secondary mb-2">Item Poster</p>
                  <div className="flex items-center gap-3">
                    {flag.content.poster.avatar_url ? (
                      <img
                        src={flag.content.poster.avatar_url}
                        alt={flag.content.poster.display_name || 'User'}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-accent-muted flex items-center justify-center text-accent font-medium">
                        {flag.content.poster.display_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary">
                          {flag.content.poster.display_name || 'Unknown'}
                        </p>
                        {flag.content.poster.is_banned && (
                          <Badge variant="destructive" className="text-xs">Banned</Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary">{flag.content.poster.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-bg-base rounded-lg">
                <p className="text-sm text-text-tertiary">Content no longer available</p>
              </div>
            )}

            {/* Review Notes */}
            <div>
              <label className="text-sm font-medium text-text-primary">Admin notes (optional)</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add internal notes about your review..."
                className="mt-2"
                rows={3}
                disabled={flag.status !== 'pending'}
              />
              {flag.reviewed_at && (
                <p className="text-xs text-text-tertiary mt-1">
                  Reviewed on {new Date(flag.reviewed_at).toLocaleString()}
                  {flag.reviewer && ` by ${flag.reviewer.display_name || flag.reviewer.email}`}
                </p>
              )}
            </div>

            {/* Flag Review Options */}
            {flag.status === 'pending' && flag.content && flag.content.status !== 'removed' && (
              <div className="space-y-3 pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remove-item"
                    checked={shouldRemoveItem}
                    onChange={(e) => setShouldRemoveItem(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent focus:ring-offset-0"
                  />
                  <label htmlFor="remove-item" className="text-sm text-text-primary cursor-pointer">
                    Remove the reported item
                  </label>
                </div>
                
                {shouldRemoveItem && (
                  <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg">
                    <p className="text-xs text-danger font-medium">
                      ⚠️ This will hide the item from all users. You can restore it later if needed.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {flag.status === 'pending' && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={() => handleUpdateStatus('dismissed', false)}
                  disabled={submitting}
                  variant="outline"
                  className="flex-1"
                >
                  Dismiss Flag
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('reviewed', shouldRemoveItem)}
                  disabled={submitting}
                  variant={shouldRemoveItem ? 'destructive' : 'default'}
                  className="flex-1"
                >
                  {shouldRemoveItem ? (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      Approve & Remove Item
                    </>
                  ) : (
                    'Mark as Reviewed'
                  )}
                </Button>
              </div>
            )}

            {/* View Full Item Button */}
            {flag.content && (
              <div className="pt-2">
                <a
                  href={`/item/${flag.content.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                >
                  <Eye className="h-4 w-4" />
                  View full item page
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </>
  )
}

