'use client'

import { useState } from 'react'
import { CheckCircle, Search, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Alert } from '@/components/ui/alert'

interface Helper {
  user_id: string
  display_name: string
  avatar_url: string | null
}

interface RecoveryModalProps {
  isOpen: boolean
  onClose: () => void
  itemTitle: string
  onComplete: (helperId?: string) => Promise<void>
}

export function RecoveryModal({
  isOpen,
  onClose,
  itemTitle,
  onComplete,
}: RecoveryModalProps) {
  const [selectedHelper, setSelectedHelper] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Helper[]>([])
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      if (data.success) {
        setSearchResults(data.users.map((u: any) => ({
          user_id: u.id,
          display_name: u.display_name,
          avatar_url: u.avatar_url,
        })))
      }
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await onComplete(selectedHelper || undefined)
      // Do not call handleClose() here: the parent typically unmounts this dialog
      // or advances to another step (e.g. claimant). Calling onClose would clear
      // that next-step state in the same tick.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedHelper(null)
    setSearchQuery('')
    setSearchResults([])
    setError(null)
    onClose()
  }

  const renderHelperButton = (helper: Helper) => (
    <button
      key={helper.user_id}
      onClick={() => setSelectedHelper(helper.user_id)}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors w-full text-left ${
        selectedHelper === helper.user_id
          ? 'bg-accent/10 border-accent'
          : 'bg-bg-overlay border-border hover:bg-border/50'
      }`}
    >
      <Avatar
        src={helper.avatar_url}
        alt={helper.display_name}
        size="sm"
      />
      <span className="text-sm font-medium text-text-primary">
        {helper.display_name}
      </span>
      {selectedHelper === helper.user_id && (
        <CheckCircle className="ml-auto h-5 w-5 text-accent" />
      )}
    </button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Mark as Recovered
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            &quot;{itemTitle}&quot; - Did someone help you recover this item?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Helper Selection */}
          <div>
            <label className="text-sm font-medium text-text-primary">
              Who helped you? (optional)
            </label>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSearch}
                  disabled={searching}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map(renderHelperButton)}
                </div>
              ) : (
                <p className="text-xs text-text-secondary">
                  Search and select a helper, or continue without selecting anyone.
                </p>
              )}
            </div>
          </div>

          {/* Clear selection button */}
          {selectedHelper && (
            <button
              onClick={() => setSelectedHelper(null)}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Clear selection (recovered on my own)
            </button>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="error">
              <p className="text-sm">{error}</p>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : selectedHelper ? (
                'Complete & Credit Helper'
              ) : (
                'Mark as Recovered'
              )}
            </Button>
          </div>

          {/* Info text */}
          {selectedHelper && (
            <p className="text-xs text-center text-text-secondary">
              The helper will receive +0.5 reputation and a notification
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
