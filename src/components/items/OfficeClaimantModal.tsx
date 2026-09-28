'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { organization } from '@/lib/organization/config'
import type { OrganizationConfig } from '@/lib/organization/schema'
import { createOfficeClaimantBodySchema } from '@/lib/validations/office-claimant'

interface OfficeClaimantModalProps {
  open: boolean
  onClose: () => void
  itemTitle: string
  /** Called with a trimmed name and nullable reference. */
  onConfirm: (claimantName: string, claimantStudentId: string | null) => void | Promise<void>
  reference?: OrganizationConfig['claimantReference']
}

export function OfficeClaimantModal({
  open,
  onClose,
  itemTitle,
  onConfirm,
  reference = organization.claimantReference,
}: OfficeClaimantModalProps) {
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    const parsed = createOfficeClaimantBodySchema(reference).safeParse({
      claimantName: name,
      claimantStudentId: studentId,
    })
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid claimant details')
      return
    }
    setSubmitting(true)
    try {
      await Promise.resolve(onConfirm(parsed.data.claimantName, parsed.data.claimantStudentId))
      setName('')
      setStudentId('')
    } catch {
      // Parent shows error; keep modal open for retry
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setError(null)
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record who claimed the item</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-secondary">
          Complete <span className="font-medium text-text-primary">{itemTitle}</span> by
          recording who received or claimed the item. Claimant details are visible to
          the item owner and administrators.
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="claimant-name" className="text-sm font-medium text-text-primary">
              Full name
            </label>
            <Input
              id="claimant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Claimant name"
              className="mt-1"
              disabled={submitting}
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="claimant-student-id" className="text-sm font-medium text-text-primary">
              {reference.label}{reference.required ? '' : ' (optional)'}
            </label>
            <Input
              id="claimant-student-id"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder={reference.label}
              className="mt-1"
              disabled={submitting}
              autoComplete="off"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Completing…' : 'Mark complete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
