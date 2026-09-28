'use client'

import { useState } from 'react'

interface Props {
  tokenId: string
  tokenName: string
  onClose: () => void
  onRevoked: () => void
}

export function AutomationTokenRevokeDialog({
  tokenId,
  tokenName,
  onClose,
  onRevoked,
}: Props) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function revoke() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/automation-tokens/${tokenId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, reason: reason || undefined }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        setError(payload.error || 'Failed to revoke token.')
        return
      }

      onRevoked()
      onClose()
    } catch {
      setError('Failed to revoke token.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-bg-elevated p-6">
        <h2 className="text-lg font-semibold text-text-primary">Revoke token</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Revoke <span className="font-medium text-text-primary">{tokenName}</span>? This action
          disables future authentication for this token.
        </p>

        <label className="mt-4 block text-sm text-text-secondary">
          Reason (optional)
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 h-24 w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-primary"
          />
        </label>

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <div className="mt-4 flex gap-3">
          <button
            onClick={revoke}
            disabled={loading}
            className="rounded-md bg-danger px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Revoking...' : 'Confirm revoke'}
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3 py-2 text-sm text-text-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

