'use client'

import { useCallback, useEffect, useState } from 'react'
import { AutomationTokenCreateModal } from '@/components/admin/AutomationTokenCreateModal'
import { AutomationTokenRevokeDialog } from '@/components/admin/AutomationTokenRevokeDialog'
import type { DbAdminAutomationToken } from '@/types/database'

interface TokensResponse {
  success: boolean
  tokens: DbAdminAutomationToken[]
  total: number
}

export default function AdminAutomationTokensPage() {
  const automationEnabled = process.env.NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED === 'true'
  const [tokens, setTokens] = useState<DbAdminAutomationToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<DbAdminAutomationToken | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadTokens = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/automation-tokens?limit=100&offset=0')
      const payload = (await response.json()) as TokensResponse
      if (!response.ok || !payload.success) {
        setError('Failed to load tokens.')
        setTokens([])
        return
      }
      setTokens(payload.tokens ?? [])
    } catch {
      setError('Failed to load tokens.')
      setTokens([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!automationEnabled) {
      setLoading(false)
      return
    }
    loadTokens()
  }, [automationEnabled, loadTokens])

  if (!automationEnabled) {
    return (
      <div className="min-w-0 max-w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Automation Tokens</h1>
          <p className="mt-1 text-text-secondary">
            Admin automation is temporarily paused.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-bg-elevated p-10 text-center text-text-secondary">
          Token creation, revocation, MCP access, and admin automation APIs are disabled for now.
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Automation Tokens</h1>
          <p className="mt-1 text-text-secondary">
            Create and revoke admin automation tokens without SQL access.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Create token
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-bg-elevated">
        {loading ? (
          <div className="p-10 text-center text-text-secondary">Loading tokens...</div>
        ) : tokens.length === 0 ? (
          <div className="p-10 text-center text-text-secondary">No automation tokens found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem]">
              <thead className="border-b border-border bg-bg-base">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Token
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Service Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Scopes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Last Used
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tokens.map((token) => (
                  <tr key={token.id} className="hover:bg-bg-overlay">
                    <td className="px-4 py-3 text-sm text-text-primary">
                      <p className="font-medium">{token.token_name}</p>
                      <p className="text-xs text-text-tertiary">{token.token_prefix}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {token.service_account_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {token.scopes.join(', ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {token.last_used_at
                        ? new Date(token.last_used_at).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {token.expires_at ? new Date(token.expires_at).toLocaleString() : 'No expiry'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          token.is_active
                            ? 'rounded bg-success/20 px-2 py-1 text-success'
                            : 'rounded bg-danger/20 px-2 py-1 text-danger'
                        }
                      >
                        {token.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={!token.is_active}
                        onClick={() => setRevokeTarget(token)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <div className="border-t border-border px-4 py-3 text-sm text-danger">{error}</div>}
      </div>

      {showCreate && (
        <AutomationTokenCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={loadTokens}
        />
      )}

      {revokeTarget && (
        <AutomationTokenRevokeDialog
          tokenId={revokeTarget.id}
          tokenName={revokeTarget.token_name}
          onClose={() => setRevokeTarget(null)}
          onRevoked={loadTokens}
        />
      )}
    </div>
  )
}
