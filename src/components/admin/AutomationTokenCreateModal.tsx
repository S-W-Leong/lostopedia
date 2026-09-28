'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  onClose: () => void
  onCreated: () => void
}

const ALL_SCOPES = ['read', 'mutate', 'destructive'] as const

export function AutomationTokenCreateModal({ onClose, onCreated }: Props) {
  const [tokenName, setTokenName] = useState('')
  const [serviceAccountName, setServiceAccountName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [scopes, setScopes] = useState<string[]>(['read'])
  const [confirmDestructiveScope, setConfirmDestructiveScope] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [presentedToken, setPresentedToken] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  const needsDestructiveConfirm = useMemo(
    () => scopes.includes('destructive'),
    [scopes]
  )

  useEffect(() => {
    if (!presentedToken || copyState !== 'copied') return

    const timeoutId = window.setTimeout(() => {
      setCopyState('idle')
    }, 2000)

    return () => window.clearTimeout(timeoutId)
  }, [copyState, presentedToken])

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/automation-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenName,
          serviceAccountName,
          expiresAt: expiresAt || undefined,
          scopes,
          confirmDestructiveScope,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        setError(payload.error || 'Failed to create token.')
        return
      }

      setPresentedToken(payload.presentedToken)
      setCopyState('idle')
      onCreated()
    } catch {
      setError('Failed to create token.')
    } finally {
      setLoading(false)
    }
  }

  function toggleScope(scope: string) {
    if (scopes.includes(scope)) {
      setScopes(scopes.filter((s) => s !== scope))
    } else {
      setScopes([...scopes, scope])
    }
  }

  async function copyToken() {
    if (!presentedToken) return
    try {
      await navigator.clipboard.writeText(presentedToken)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-lg border border-border bg-bg-elevated p-6">
        <h2 className="text-xl font-semibold text-text-primary">Create automation token</h2>

        {presentedToken ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-text-secondary">
              Token created successfully. Store this value securely now. It will not be shown again.
            </p>
            <div className="rounded-md border border-border bg-bg-base p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
                Token value
              </p>
              <div className="break-all font-mono text-xs text-text-primary">
                {presentedToken}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={copyToken}
                className="min-w-28"
                variant={copyState === 'copied' ? 'secondary' : 'default'}
              >
                {copyState === 'copied' ? 'Copied' : 'Copy token'}
              </Button>
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
              {copyState === 'error' ? (
                <p className="text-sm text-danger">Clipboard copy failed. Copy the token manually.</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <label className="block text-sm text-text-secondary">
              Token name
              <Input
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="mt-1 bg-bg-base"
              />
            </label>

            <label className="block text-sm text-text-secondary">
              Service account name
              <Input
                value={serviceAccountName}
                onChange={(e) => setServiceAccountName(e.target.value)}
                className="mt-1 bg-bg-base"
              />
            </label>

            <label className="block text-sm text-text-secondary">
              Expires at (optional)
              <Input
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                type="datetime-local"
                className="mt-1 h-11 bg-bg-base"
              />
            </label>

            <fieldset>
              <legend className="text-sm text-text-secondary">Scopes</legend>
              <div className="mt-2 flex gap-3">
                {ALL_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={scopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                    />
                    {scope}
                  </label>
                ))}
              </div>
            </fieldset>

            {needsDestructiveConfirm && (
              <label className="flex items-start gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={confirmDestructiveScope}
                  onChange={(e) => setConfirmDestructiveScope(e.target.checked)}
                />
                I understand this token can run destructive admin operations.
              </label>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex gap-3">
              <Button
                onClick={submit}
                disabled={scopes.length === 0}
                isLoading={loading}
              >
                {loading ? 'Creating token' : 'Create token'}
              </Button>
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
