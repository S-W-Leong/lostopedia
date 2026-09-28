'use client'

import { useState } from 'react'
import { organization } from '@/lib/organization/config'
import { officeClaimantBodySchema } from '@/lib/validations/office-claimant'
import Link from 'next/link'
import { Ban, Check, CheckCircle2, ExternalLink, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import type { FlagReason, ItemStatus } from '@/lib/constants'

const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  spam: 'Spam or misleading content',
  inappropriate_content: 'Inappropriate or offensive content',
  scam: 'Suspected scam or fraudulent activity',
  duplicate: 'Duplicate posting',
  harassment: 'Harassment or bullying',
  fake_item: 'Fake or incorrect item information',
  other: 'Other reason',
}

interface ItemActionsMenuProps {
  item: {
    id: string
    title: string
    status: ItemStatus
    removed_flag_id: string | null
    pickup_method?: string | null
    type?: 'lost' | 'found'
  }
  onUpdate: () => void
}

export function ItemActionsMenu({ item, onUpdate }: ItemActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [recoverOpen, setRecoverOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [removalReason, setRemovalReason] = useState<FlagReason>('spam')
  const [removalNotes, setRemovalNotes] = useState('')
  const [claimantName, setClaimantName] = useState('')
  const [claimantStudentId, setClaimantStudentId] = useState('')

  const isRemoved = item.status === 'removed'
  const canMarkRecovered = item.status === 'active' && item.pickup_method === 'office'

  async function handleRestore() {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/admin/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to restore item')
      }

      onUpdate()
    } catch (error) {
      console.error('Error restoring item:', error)
      alert(error instanceof Error ? error.message : 'Failed to restore item')
    } finally {
      setSubmitting(false)
      setRestoreOpen(false)
    }
  }

  async function handleRemove() {
    if (!removalNotes.trim()) {
      alert('Please provide notes for why this item is being removed')
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
      if (!data.success) {
        throw new Error(data.error || 'Failed to remove item')
      }

      onUpdate()
      setRemovalReason('spam')
      setRemovalNotes('')
      setRemoveOpen(false)
    } catch (error) {
      console.error('Error removing item:', error)
      alert(error instanceof Error ? error.message : 'Failed to remove item')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRecover() {
    const parsed = officeClaimantBodySchema.safeParse({ claimantName, claimantStudentId })
    if (!parsed.success) {
      alert(parsed.error.errors[0]?.message ?? 'Invalid claimant details')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/items/${item.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimantName: parsed.data.claimantName,
          claimantStudentId: parsed.data.claimantStudentId,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to mark item as recovered')
      }

      onUpdate()
      setClaimantName('')
      setClaimantStudentId('')
      setRecoverOpen(false)
    } catch (error) {
      console.error('Error marking item as recovered:', error)
      alert(error instanceof Error ? error.message : 'Failed to mark item as recovered')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-overlay hover:text-text-primary"
            aria-label={`Open item actions for ${item.title}`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/item/${item.id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Item Page
            </Link>
          </DropdownMenuItem>

          {item.removed_flag_id && (
            <DropdownMenuItem asChild>
              <Link href={`/admin/flags?flagId=${item.removed_flag_id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Removal Flag
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {isRemoved ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                setMenuOpen(false)
                setRestoreOpen(true)
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              Restore Item
            </DropdownMenuItem>
          ) : (
            <>
              {canMarkRecovered && (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    setMenuOpen(false)
                    setRecoverOpen(true)
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Recovered
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                className="text-danger focus:bg-danger/10 focus:text-danger"
                onSelect={(event) => {
                  event.preventDefault()
                  setMenuOpen(false)
                  setRemoveOpen(true)
                }}
              >
                <Ban className="mr-2 h-4 w-4" />
                Remove Item
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={recoverOpen} onOpenChange={setRecoverOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark as Recovered</DialogTitle>
            <DialogDescription>
              Record the claimant details before completing this office pickup item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Complete <span className="font-medium text-text-primary">{item.title}</span> and record who collected it.
            </p>

            <div>
              <label htmlFor={`claimant-name-${item.id}`} className="text-sm font-medium text-text-primary">
                Claimant name
              </label>
              <input
                id={`claimant-name-${item.id}`}
                value={claimantName}
                onChange={(e) => setClaimantName(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 focus:ring-offset-bg-base"
                maxLength={120}
                disabled={submitting}
              />
            </div>

            <div>
              <label htmlFor={`claimant-student-id-${item.id}`} className="text-sm font-medium text-text-primary">
                {organization.claimantReference.label}{organization.claimantReference.required ? '' : ' (optional)'}
              </label>
              <input
                id={`claimant-student-id-${item.id}`}
                value={claimantStudentId}
                onChange={(e) => setClaimantStudentId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 focus:ring-offset-bg-base"
                maxLength={64}
                disabled={submitting}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setRecoverOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRecover}
                disabled={submitting || !claimantName.trim() || (organization.claimantReference.required && !claimantStudentId.trim())}
              >
                {submitting ? 'Recovering...' : 'Confirm Recovery'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Remove Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Remove <span className="font-medium text-text-primary">{item.title}</span> from public view.
            </p>

            <div>
              <label className="text-sm font-medium text-text-primary">Reason</label>
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
              <label className="text-sm font-medium text-text-primary">Notes</label>
              <Textarea
                value={removalNotes}
                onChange={(e) => setRemovalNotes(e.target.value)}
                placeholder="Explain why this item is being removed..."
                className="mt-1"
                rows={4}
                maxLength={500}
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-text-tertiary">
                {removalNotes.length}/500 characters
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setRemoveOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={submitting || !removalNotes.trim()}
              >
                {submitting ? 'Removing...' : 'Confirm Removal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        onConfirm={handleRestore}
        title="Restore Item"
        description={`Restore "${item.title}" to active status?`}
        confirmText={submitting ? 'Restoring...' : 'Restore'}
        variant="default"
      />
    </>
  )
}
