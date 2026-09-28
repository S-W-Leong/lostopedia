'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ReputationDisplay } from '@/components/ui/reputation-display'
import { getReputationInfo } from '@/lib/utils/reputation'
import { Alert } from '@/components/ui/alert'

interface ReputationAdjustProps {
  userId: string
  currentScore: number
  onUpdate: () => void
}

export function ReputationAdjust({
  userId,
  currentScore,
  onUpdate,
}: ReputationAdjustProps) {
  const [points, setPoints] = useState('0')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const adjustment = parseInt(points || '0')
  const newScore = currentScore + adjustment

  async function handleSubmit() {
    if (isNaN(adjustment)) {
      alert('Please enter a valid integer')
      return
    }

    if (adjustment < -500 || adjustment > 500) {
      alert('Adjustment must be between -500 and +500')
      return
    }

    if (!reason.trim()) {
      alert('Please provide a reason for the adjustment')
      return
    }

    if (reason.trim().length < 10) {
      alert('Reason must be at least 10 characters')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          points: adjustment,
          reason: reason.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        onUpdate()
        setPoints('0')
        setReason('')
        alert(data.message || 'Reputation adjusted successfully')
      } else {
        alert(data.error || 'Failed to adjust reputation')
      }
    } catch (error) {
      console.error('Error adjusting reputation:', error)
      alert('Failed to adjust reputation')
    } finally {
      setSubmitting(false)
    }
  }

  const currentInfo = getReputationInfo(currentScore)
  const newInfo = getReputationInfo(newScore)
  const willBeBanned = newScore < 0

  return (
    <div className="space-y-4">
      {/* Current Score */}
      <div>
        <p className="text-sm text-text-secondary mb-2">Current Reputation</p>
        <ReputationDisplay score={currentScore} variant="detailed" />
      </div>

      {/* Points Adjustment */}
      <div>
        <label className="text-sm text-text-secondary">
          Points to Add/Subtract (-500 to +500)
        </label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            type="number"
            min="-500"
            max="500"
            step="1"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="0"
          />
          {adjustment > 0 && <TrendingUp className="h-5 w-5 text-green-500" />}
          {adjustment < 0 && <TrendingDown className="h-5 w-5 text-red-500" />}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Common values: +15 (item return), +5 (completion), -25 (flag penalty)
        </p>
      </div>

      {/* Preview New Score */}
      {adjustment !== 0 && (
        <div className="border border-border rounded-lg p-3 bg-muted/50">
          <p className="text-sm text-text-secondary mb-2">Preview After Adjustment</p>
          <ReputationDisplay score={newScore} variant="detailed" />

          {/* Tier change indicator */}
          {currentInfo.tier !== newInfo.tier && (
            <div className="mt-2 text-xs">
              <span className={currentInfo.color}>{currentInfo.tierName}</span>
              <span className="mx-1">→</span>
              <span className={newInfo.color}>{newInfo.tierName}</span>
            </div>
          )}

          {/* Auto-ban warning */}
          {willBeBanned && (
            <Alert variant="error" className="mt-3">
              <p className="font-semibold">Warning: Auto-ban will trigger</p>
              <p className="text-sm">
                Score below 0 will automatically suspend the user's account
              </p>
            </Alert>
          )}
        </div>
      )}

      {/* Reason */}
      <div>
        <label className="text-sm text-text-secondary">
          Reason (required, min 10 characters)
        </label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why you're adjusting this user's reputation..."
          className="mt-1"
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {reason.length}/500 characters
        </p>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={submitting || !reason.trim() || points === '0' || reason.length < 10}
        className="w-full"
      >
        {submitting ? 'Applying...' : 'Apply Adjustment'}
      </Button>
    </div>
  )
}

