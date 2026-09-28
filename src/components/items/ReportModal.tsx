'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import type { FlagReason } from '@/lib/constants'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: string
  itemTitle: string
  onSuccess?: () => void
}

const FLAG_REASONS: Record<FlagReason, string> = {
  spam: 'Spam or misleading content',
  inappropriate_content: 'Inappropriate or offensive content',
  scam: 'Suspected scam or fraudulent activity',
  duplicate: 'Duplicate posting',
  harassment: 'Harassment or bullying',
  fake_item: 'Fake or incorrect item information',
  other: 'Other reason',
}

export function ReportModal({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  onSuccess,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<FlagReason | ''>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Please select a reason')
      return
    }

    if (description.length > 500) {
      setError('Description must be 500 characters or less')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          reason: selectedReason,
          ...(description.trim()
            ? { description: description.trim() }
            : {}),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess?.()
          handleClose()
        }, 2000)
      } else {
        setError(data.error || 'Failed to submit report')
      }
    } catch (err) {
      console.error('Error submitting report:', err)
      setError('Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedReason('')
    setDescription('')
    setError(null)
    setSuccess(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
            Report Item
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Report &quot;{itemTitle}&quot; for review by our moderation team.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center">
                <span className="text-white text-xl">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">Report submitted successfully</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Thank you for helping keep our community safe.
                </p>
              </div>
            </div>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* Reason Selection */}
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Reason for reporting *
              </label>
              <div className="mt-2 space-y-2">
                {(Object.keys(FLAG_REASONS) as FlagReason[]).map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedReason === reason
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value as FlagReason)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {FLAG_REASONS[reason]}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Additional details (optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any additional context that might help our review..."
                className="mt-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {description.length}/500 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <Alert variant="error">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant="destructive"
                className="flex-1"
                disabled={submitting || !selectedReason}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

