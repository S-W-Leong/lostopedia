'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import type { FlagReason } from '@/lib/constants'

const FLAG_REASONS: Record<FlagReason, string> = {
  spam: 'Spam or misleading content',
  inappropriate_content: 'Inappropriate or offensive content',
  scam: 'Suspected scam or fraudulent activity',
  duplicate: 'Duplicate posting',
  harassment: 'Harassment or bullying',
  fake_item: 'Fake or incorrect item information',
  other: 'Other reason',
}

export default function FlagItemPage() {
  const params = useParams()
  const router = useRouter()
  const itemId = params.id as string
  
  const [item, setItem] = useState<{ id: string; title: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedReason, setSelectedReason] = useState<FlagReason | ''>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch item details
  useEffect(() => {
    async function fetchItem() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('items')
          .select('id, title')
          .eq('id', itemId)
          .single()

        if (error || !data) {
          setError('Item not found')
          return
        }

        setItem(data as { id: string; title: string })
      } catch (err) {
        console.error('Error fetching item:', err)
        setError('Failed to load item')
      } finally {
        setLoading(false)
      }
    }

    if (itemId) {
      fetchItem()
    }
  }, [itemId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
          router.push(`/item/${itemId}`)
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

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Alert variant="error">
          <AlertTriangle className="h-4 w-4" />
          <p>{error || 'Item not found'}</p>
        </Alert>
        <div className="mt-6">
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report Item</h1>
          <p className="text-gray-600">
            Help keep our community safe by reporting inappropriate content
          </p>
        </div>
      </div>

      {/* Item Info Card */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-1">
          Reporting this item:
        </h2>
        <p className="text-lg font-semibold text-gray-900">
          {item.title}
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <Alert variant="success" className="mb-6">
          <strong>Success!</strong> Your report has been submitted. Redirecting...
        </Alert>
      )}

      {/* Form */}
      {!success && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Reason Selection */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Reason for reporting *</h2>
            <div className="space-y-2">
              {(Object.keys(FLAG_REASONS) as FlagReason[]).map((reason) => (
                <label
                  key={reason}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedReason === reason
                      ? 'bg-red-50 border-red-300 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value as FlagReason)}
                    className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {FLAG_REASONS[reason]}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Additional Details</h2>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">
                Additional details (optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any additional context that might help our review..."
                className="bg-white border-gray-200 text-gray-900"
                rows={5}
                maxLength={500}
              />
              <p className="text-sm text-gray-500">
                {description.length} / 500 characters
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="error">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={submitting || !selectedReason}
              isLoading={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
