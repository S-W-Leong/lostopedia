'use client'

import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  MapPin,
  Calendar,
  Edit,
  Trash2,
  Clock,
  AlertCircle,
  MessageCircle,
  Sparkles,
  CheckCircle,
  Loader2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Alert } from '@/components/ui/alert'
import { UserLink } from '@/components/ui/user-link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { CATEGORY_LABELS, MESSAGING_ENABLED } from '@/lib/constants'
import { MatchesModal } from '@/components/items/MatchesModal'
import { RecoveryModal } from '@/components/items/RecoveryModal'
import { OfficeClaimantModal } from '@/components/items/OfficeClaimantModal'
import type { Item, UserProfile } from '@/types'
import { useEffect, useState } from 'react'
import { ReportButton } from '@/components/items/ReportButton'
import { ReputationDisplay } from '@/components/ui/reputation-display'
import { OfficePickupDetails } from '@/components/office/OfficePickupDetails'
import { canViewClaimantDetails } from '@/lib/utils/claimant'
import { organization } from '@/lib/organization/config'

interface ItemWithPoster extends Item {
  poster: UserProfile & { isAdmin: boolean }
}

export default function ItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [item, setItem] = useState<ItemWithPoster | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showMatchesModal, setShowMatchesModal] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [showOfficeClaimantModal, setShowOfficeClaimantModal] = useState(false)
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [showCompletionNotice, setShowCompletionNotice] = useState(false)

  const itemId = params.id as string

  useEffect(() => {
    async function fetchItem() {
      try {
        const supabase = createClient()
        const claimantPromise = user ? fetch(`/api/items/${itemId}`) : Promise.resolve(null)

        const { data, error } = await supabase
          .from('items')
          .select(
            `
            id, type, title, description, category, image_url, image_metadata,
            location_text, pickup_method, geo_location, location_precision,
            date_lost_found, created_at, updated_at, status, completed_at, expires_at,
            posted_by, campus_id, is_flagged, flag_count, recovered_by,
            poster:users!posted_by (
              id,
              display_name,
              avatar_url,
              reputation_score,
              is_admin
            ),
            helper:users!recovered_by (
              id,
              display_name,
              avatar_url,
              reputation_score
            )
          `
          )
          .eq('id', itemId)
          .single()

        if (error) {
          console.error('Fetch error:', error)
          setError('Item not found')
          setIsLoading(false)
          return
        }

        // Type assertion for Supabase response
        const typedData = data as any
        const claimantResponse = await claimantPromise
        const claimantResult = claimantResponse?.ok ? await claimantResponse.json() : null
        const claimant = claimantResult?.success ? claimantResult.item : null

        // Transform database schema to domain types
        // Parse geo_location using the helper function result
        let geoLocation = null
        if (typedData.geo_location) {
          try {
            // Call the helper function to convert geography to GeoJSON
            const { data: geoJson } = await supabase
              .rpc('get_item_geo_json', { item_geo: typedData.geo_location } as any)
            
            if (geoJson) {
              const geoData = geoJson as { coordinates?: number[] }
              if (geoData.coordinates && Array.isArray(geoData.coordinates) && geoData.coordinates.length >= 2) {
                geoLocation = {
                  latitude: geoData.coordinates[1],
                  longitude: geoData.coordinates[0],
                }
              }
            }
          } catch (err) {
            console.error('Error parsing geo_location:', err)
          }
        }

        const transformedItem: ItemWithPoster = {
          id: typedData.id,
          type: typedData.type,
          title: typedData.title,
          description: typedData.description,
          category: typedData.category,
          imageUrl: typedData.image_url,
          imageMetadata: typedData.image_metadata,
          locationText: typedData.location_text,
          pickupMethod: typedData.pickup_method,
          geoLocation,
          locationPrecision: typedData.location_precision || 'approximate',
          dateLostFound: typedData.date_lost_found,
          createdAt: typedData.created_at,
          updatedAt: typedData.updated_at,
          status: typedData.status,
          completedAt: typedData.completed_at,
          expiresAt: typedData.expires_at,
          postedBy: typedData.posted_by,
          campusId: typedData.campus_id,
          isFlagged: typedData.is_flagged,
          flagCount: typedData.flag_count,
          claimantName: claimant?.claimantName ?? null,
          claimantStudentId: claimant?.claimantStudentId ?? null,
          claimantRecordedBy: claimant?.claimantRecordedBy ?? null,
          recoveredBy: typedData.recovered_by ?? null,
          recoveryHelper: typedData.helper
            ? {
                id: typedData.helper.id,
                displayName: typedData.helper.display_name,
                avatarUrl: typedData.helper.avatar_url,
                reputationScore: typedData.helper.reputation_score,
              }
            : null,
          poster: {
            id: typedData.poster.id,
            displayName: typedData.poster.display_name,
            avatarUrl: typedData.poster.avatar_url,
            reputationScore: typedData.poster.reputation_score,
            isAdmin: typedData.poster.is_admin ?? false,
          },
        }

        setItem(transformedItem)
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Failed to load item')
      } finally {
        setIsLoading(false)
      }
    }

    fetchItem()
  }, [itemId, user])

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      setIsCurrentUserAdmin((data as { is_admin: boolean } | null)?.is_admin ?? false)
    }
    checkAdmin().catch((err) => console.error('Error checking admin status:', err))
  }, [user])

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to delete item')
        setIsDeleting(false)
        return
      }

      router.push('/my-items')
    } catch (err) {
      console.error('Error deleting item:', err)
      setError('An unexpected error occurred')
      setIsDeleting(false)
    }
  }

  const completeItem = async (opts: {
    helperId?: string
    claimant?: { name: string; studentId: string | null }
  }) => {
    setIsCompleting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {}
      if (item?.type === 'lost') {
        if (opts.helperId) body.helper_user_id = opts.helperId
      } else {
        if (!opts.claimant) {
          throw new Error('Claimant details are required to complete a found item')
        }
        body.claimantName = opts.claimant.name
        body.claimantStudentId = opts.claimant.studentId
      }

      const response = await fetch(`/api/items/${itemId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to mark item as completed')
      }

      const now = new Date().toISOString()

      let recoveryHelperNext: UserProfile | null | undefined
      let recoveredByNext: string | null | undefined
      if (item?.type === 'lost') {
        recoveredByNext = opts.helperId ?? null
        if (opts.helperId) {
          const supabase = createClient()
          const { data: helperRow } = await supabase
            .from('users')
            .select('id, display_name, avatar_url, reputation_score')
            .eq('id', opts.helperId)
            .single()
          if (helperRow) {
            recoveryHelperNext = {
              id: helperRow.id,
              displayName: helperRow.display_name,
              avatarUrl: helperRow.avatar_url,
              reputationScore: helperRow.reputation_score,
            }
          } else {
            recoveryHelperNext = null
          }
        } else {
          recoveryHelperNext = null
        }
      }

      if (item) {
        setItem({
          ...item,
          status: 'completed',
          completedAt: now,
          ...(item.type === 'found' && opts.claimant
            ? {
                claimantName: opts.claimant.name,
                claimantStudentId: opts.claimant.studentId,
                claimantRecordedBy: user?.id ?? item.claimantRecordedBy,
              }
            : {}),
          ...(item.type === 'lost'
            ? {
                recoveredBy: recoveredByNext ?? null,
                recoveryHelper: recoveryHelperNext ?? null,
              }
            : {}),
        })
      }

      setShowRecoveryModal(false)
      setShowOfficeClaimantModal(false)
      setShowCompletionNotice(true)
    } catch (err) {
      console.error('Error completing item:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete item')
      throw err
    } finally {
      setIsCompleting(false)
    }
  }

  const handleCompleteAction = async () => {
    if (!item) return

    if (item.type === 'lost') {
      setShowRecoveryModal(true)
      return
    }

    setShowOfficeClaimantModal(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading item...</p>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <strong>Error:</strong> {error || 'Item not found'}
        </Alert>
        <div className="mt-6">
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const isOwner = user?.id === item.postedBy
  const canMessage = MESSAGING_ENABLED && user && !isOwner && item.status === 'active'
  const canManageItem =
    item.status === 'active' &&
    (isOwner || (isCurrentUserAdmin && item.pickupMethod === 'office'))
  const canReport = !isOwner && Boolean(user)
  const hasHeaderActions = canManageItem || canReport
  const images: string[] = (item.imageMetadata?.urls as string[]) || (item.imageUrl ? [item.imageUrl] : [])
  const daysUntilExpiry = Math.ceil(
    (new Date(item.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {showCompletionNotice && item.status === 'completed' && (
        <Alert variant="success" className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <strong>Item marked complete</strong>
              <p className="text-sm mt-1 opacity-90">
                The listing below now shows the completed state
                {item.type === 'found' &&
                  (item.claimantName || item.claimantStudentId) &&
                  ', including who claimed it'}
                {item.type === 'lost' && item.recoveryHelper && ', including who helped recover it'}
                .
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-found/40 bg-white/80"
              onClick={() => router.push('/my-items')}
            >
              Go to My Items
            </Button>
          </div>
        </Alert>
      )}

      {/* Header with Actions */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge
              variant={item.type === 'lost' ? 'destructive' : 'default'}
              className={
                item.type === 'lost'
                  ? 'bg-lost text-white'
                  : 'bg-found text-white'
              }
            >
              {item.type.toUpperCase()}
            </Badge>
            <Badge variant="outline">{CATEGORY_LABELS[item.category]}</Badge>
            {item.status !== 'active' && (
              <Badge variant="secondary">{item.status}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 break-words sm:text-3xl">
            {item.title}
          </h1>
        </div>

        {hasHeaderActions && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            {canManageItem && (
              <>
                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/item/${item.id}/edit`)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                  disabled={isCompleting}
                  onClick={() => void handleCompleteAction()}
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Completing…
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </>
                  )}
                </Button>
                {isOwner && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Item</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this item? This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
            {canReport && (
              <ReportButton
                onClick={() => router.push(`/item/${itemId}/flag`)}
                variant="outline"
                size="sm"
              />
            )}
          </div>
        )}
      </div>

      {/* Expiration Warning */}
      {item.status === 'active' && daysUntilExpiry <= 14 && (
        <Alert variant="warning" className="mb-6">
          <Clock className="h-4 w-4" />
          <strong>Expires in {daysUntilExpiry} days</strong>
          {isOwner && daysUntilExpiry <= 7 && (
            <span> - You can extend this listing from your My Items page</span>
          )}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          {images.length > 0 && (
            <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src={images[currentImageIndex]}
                  alt={`${item.title} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-contain"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setCurrentImageIndex((prev) =>
                          prev === 0 ? images.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-10 w-10 flex items-center justify-center rounded-full text-lg"
                      aria-label="Previous image"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setCurrentImageIndex((prev) =>
                          prev === images.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-10 w-10 flex items-center justify-center rounded-full text-lg"
                      aria-label="Next image"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                        index === currentImageIndex
                          ? 'border-primary'
                          : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
          </div>

          {item.status === 'completed' && item.type === 'lost' && item.recoveryHelper && (
            <div className="rounded-lg border-2 border-sky-200 bg-sky-50 p-6">
              <h2 className="text-xl font-semibold mb-3 text-sky-950">Recovered with help from</h2>
              <div className="flex items-center gap-3">
                <UserLink
                  userId={item.recoveryHelper.id}
                  displayName={item.recoveryHelper.displayName}
                >
                  <Avatar
                    src={item.recoveryHelper.avatarUrl || undefined}
                    alt={item.recoveryHelper.displayName}
                    size="lg"
                  />
                </UserLink>
                <div>
                  <UserLink
                    userId={item.recoveryHelper.id}
                    displayName={item.recoveryHelper.displayName}
                    className="font-medium text-sky-950 hover:text-accent transition-colors"
                  />
                  <ReputationDisplay
                    score={item.recoveryHelper.reputationScore}
                    variant="compact"
                    size="sm"
                  />
                </div>
              </div>
              <p className="mt-3 text-sm text-sky-900/85">
                The poster credited this person for helping recover this item.
              </p>
            </div>
          )}

          {item.status === 'completed' &&
            item.type === 'found' &&
            canViewClaimantDetails(user?.id, isCurrentUserAdmin, item.postedBy) &&
            (item.claimantName || item.claimantStudentId) && (
              <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-6">
                <h2 className="text-xl font-semibold mb-3 text-emerald-900">Claimed by</h2>
                <dl className="space-y-2 text-emerald-950">
                  {item.claimantName && (
                    <div>
                      <dt className="text-sm font-medium text-emerald-800">Name</dt>
                      <dd className="text-base">{item.claimantName}</dd>
                    </div>
                  )}
                  {item.claimantStudentId && (
                    <div>
                      <dt className="text-sm font-medium text-emerald-800">{organization.claimantReference.label}</dt>
                      <dd className="text-base">{item.claimantStudentId}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

          {/* Location & Date */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-3">Details</h2>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Location</div>
                <div className="text-gray-600">{item.locationText}</div>
                {item.pickupMethod === 'office' && item.locationText && (
                  <p className="text-xs text-gray-500 mt-2 max-w-prose">
                    This describes where the item was found. To collect an office-held listing, go to the
                    {organization.office.name} in the pickup section below—not necessarily to this map
                    location.
                  </p>
                )}
              </div>
            </div>

            {item.dateLostFound && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">
                    Date {item.type === 'lost' ? 'Lost' : 'Found'}
                  </div>
                  <div className="text-gray-600">
                    {format(new Date(item.dateLostFound), 'MMMM d, yyyy')}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Posted</div>
                <div className="text-gray-600">
                  {format(new Date(item.createdAt), 'MMMM d, yyyy')}
                </div>
              </div>
            </div>

            {item.type === 'found' && item.pickupMethod && (
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900">Pickup Method</div>
                  {item.pickupMethod === 'office' ? (
                    <div className="mt-2 text-gray-600">
                      <OfficePickupDetails variant="full" />
                    </div>
                  ) : (
                    <div className="text-gray-600">Meet Up</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Poster Information */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Posted By</h2>
            <div className="flex items-center gap-3 mb-4">
              <UserLink userId={item.poster.id} displayName={item.poster.displayName}>
                <Avatar
                  src={item.poster.avatarUrl || undefined}
                  alt={item.poster.displayName}
                  size="lg"
                />
              </UserLink>
              <div>
                <UserLink
                  userId={item.poster.id}
                  displayName={item.poster.displayName}
                  className="font-medium text-gray-900 hover:text-accent transition-colors"
                />
                {item.poster.isAdmin && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                    Admin
                  </span>
                )}
                <ReputationDisplay
                  score={item.poster.reputationScore}
                  variant="compact"
                  size="sm"
                />
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {canMessage && (
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => {
                    router.push(`/messages/thread?itemId=${item.id}&userId=${item.postedBy}`)
                  }}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              )}

              {MESSAGING_ENABLED && !user && !isOwner && item.status === 'active' && (
                <Button
                  size="lg"
                  variant="default"
                  className="w-full"
                  onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/item/${item.id}`)}`)}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Log in to contact poster
                </Button>
              )}

              {isOwner && (
                <div className="text-sm text-gray-500 text-center">
                  This is your item
                </div>
              )}
            </div>
          </div>

          {/* AI Match Search - Owner Only */}
          {isOwner && item.status === 'active' && (
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-3">Find Matches</h2>
              <p className="text-sm text-gray-600 mb-4">
                Use AI to search for items that might match yours
              </p>
              <Button
                onClick={() => setShowMatchesModal(true)}
                className="w-full"
                variant="default"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Find Potential Matches
              </Button>
            </div>
          )}

          {/* Item Status */}
          {item.status === 'active' && (
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-3">Listing Status</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-green-600">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expires:</span>
                  <span className="font-medium">
                    {format(new Date(item.expiresAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days remaining:</span>
                  <span className="font-medium">{daysUntilExpiry} days</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Matches Modal */}
      <MatchesModal
        isOpen={showMatchesModal}
        onClose={() => setShowMatchesModal(false)}
        itemId={itemId}
        itemTitle={item.title}
      />

      <OfficeClaimantModal
        open={showOfficeClaimantModal}
        onClose={() => setShowOfficeClaimantModal(false)}
        itemTitle={item.title}
        onConfirm={async (name, studentId) => {
          await completeItem({ claimant: { name, studentId } })
        }}
      />

      {/* Recovery Modal — lost items only (optional helper credit) */}
      <RecoveryModal
        isOpen={showRecoveryModal}
        onClose={() => {
          setShowRecoveryModal(false)
        }}
        itemTitle={item.title}
        onComplete={async (helperId) => {
          await completeItem({ helperId })
        }}
      />
    </div>
  )
}
