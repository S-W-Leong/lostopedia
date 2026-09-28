'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, MapPin, Calendar, ImageIcon, X, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { SelectionCardRadioGroup } from '@/components/ui/selection-card-radio-group'
import { NativeSelect } from '@/components/ui/native-select'
import { GooglePlacesAutocomplete } from '@/components/forms/GooglePlacesAutocomplete'
import { LocationMapPicker } from '@/components/maps/LocationMapPicker'
import { validateItemImage } from '@/lib/images/validate'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { itemEditSchema, type ItemEditValues } from '@/lib/validations/item'
import { ITEM_CATEGORIES, CATEGORY_LABELS } from '@/lib/constants'
import { LOST_FOUND_OFFICE_PICKUP_CARD_SUMMARY } from '@/lib/campus/lost-found-office'
import { OfficePickupDetails } from '@/components/office/OfficePickupDetails'
import type { Item } from '@/types'

export default function EditItemPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [item, setItem] = useState<Item | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoadingItem, setIsLoadingItem] = useState(true)
  const [isAdminUser, setIsAdminUser] = useState(false)
  /** 0-based indices of current item images to remove on save (only when not replacing with new files). */
  const [removedImageIndices, setRemovedImageIndices] = useState<number[]>([])

  const itemId = params.id as string

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItemEditValues>({
    resolver: zodResolver(itemEditSchema),
    defaultValues: {
      images: [],
    },
  })

  const watchedLatitude = useWatch({ control, name: 'latitude', defaultValue: undefined })
  const watchedLongitude = useWatch({ control, name: 'longitude', defaultValue: undefined })
  const watchedLocationText = useWatch({ control, name: 'locationText', defaultValue: '' })
  const watchedImages = useWatch({ control, name: 'images', defaultValue: [] as File[] })
  const watchedPickupMethod = useWatch({ control, name: 'pickupMethod' }) as
    | 'office'
    | 'meetup'
    | undefined

  // Fetch item data
  useEffect(() => {
    async function fetchItem() {
      if (!itemId) return

      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('items')
          .select('id, posted_by, status, geo_location, type, title, description, category, image_url, image_metadata, location_text, location_precision, pickup_method, date_lost_found, created_at, updated_at, completed_at, expires_at, campus_id, is_flagged, flag_count')
          .eq('id', itemId)
          .single()

        if (fetchError || !data) {
          setError('Item not found')
          setIsLoadingItem(false)
          return
        }

        const typedData = data as {
          id: string
          posted_by: string
          status: string
          geo_location: unknown
          type: string
          title: string
          description: string | null
          category: string
          image_url: string | null
          image_metadata: unknown
          location_text: string | null
          location_precision: string | null
          pickup_method: string | null
          date_lost_found: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          expires_at: string | null
          campus_id: string | null
          is_flagged: boolean
          flag_count: number
        }

        // Check ownership
        if (user && typedData.posted_by !== user.id) {
          setError('You do not have permission to edit this item')
          setIsLoadingItem(false)
          return
        }

        // Check if item is editable
        if (typedData.status !== 'active') {
          setError('Only active items can be edited')
          setIsLoadingItem(false)
          return
        }

        // Transform to Item type
        // Parse geo_location using the helper function result
        let geoLocation = null
        if (typedData.geo_location) {
          try {
            // Call the helper function to convert geography to GeoJSON
            const { data: geoJson } = await supabase.rpc('get_item_geo_json', {
              item_geo: typedData.geo_location,
            })
            type GeoJsonPoint = { coordinates?: [number, number] }
            const coords = (geoJson as GeoJsonPoint)?.coordinates
            if (coords && Array.isArray(coords)) {
              geoLocation = {
                latitude: coords[1],
                longitude: coords[0],
              }
            }
          } catch (err) {
            console.error('Error parsing geo_location:', err)
          }
        }

        const transformedItem: Item = {
          id: typedData.id,
          type: typedData.type as Item['type'],
          title: typedData.title,
          description: typedData.description ?? '',
          category: typedData.category as Item['category'],
          imageUrl: typedData.image_url,
          imageMetadata: (typedData.image_metadata ?? null) as Record<string, unknown> | null,
          locationText: typedData.location_text ?? '',
          pickupMethod: (typedData.pickup_method as 'office' | 'meetup' | null) ?? null,
          geoLocation,
          locationPrecision: (typedData.location_precision || 'approximate') as Item['locationPrecision'],
          dateLostFound: typedData.date_lost_found ?? null,
          createdAt: typedData.created_at,
          updatedAt: typedData.updated_at,
          status: typedData.status as Item['status'],
          completedAt: typedData.completed_at ?? null,
          expiresAt: typedData.expires_at ?? '',
          postedBy: typedData.posted_by,
          campusId: typedData.campus_id ?? '',
          isFlagged: typedData.is_flagged,
          flagCount: typedData.flag_count,
        }

        setItem(transformedItem)

        // Set form values
        setValue('title', transformedItem.title)
        setValue('description', transformedItem.description)
        setValue('category', transformedItem.category)
        setValue('locationText', transformedItem.locationText)
        if (transformedItem.geoLocation?.latitude != null && transformedItem.geoLocation?.longitude != null) {
          setValue('latitude', transformedItem.geoLocation.latitude)
          setValue('longitude', transformedItem.geoLocation.longitude)
        }
        if (transformedItem.dateLostFound) {
          setValue('dateLostFound', transformedItem.dateLostFound)
        }
        if (transformedItem.pickupMethod) {
          setValue('pickupMethod', transformedItem.pickupMethod)
        }
        setValue('images', [])
        setRemovedImageIndices([])

        setIsLoadingItem(false)
      } catch (err) {
        console.error('Error fetching item:', err)
        setError('Failed to load item')
        setIsLoadingItem(false)
      }
    }

    if (user) {
      fetchItem()
    }
  }, [itemId, user, setValue])

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      setIsAdminUser((data as { is_admin: boolean } | null)?.is_admin ?? false)
    }
    checkAdmin()
  }, [user])

  const onSubmit = async (data: ItemEditValues) => {
    setError(null)
    setSuccess(false)

    try {
      // Build FormData for API request
      const formData = new FormData()
      formData.append('title', data.title)
      formData.append('description', data.description)
      formData.append('category', data.category)
      formData.append('locationText', data.locationText)

      if (data.latitude) formData.append('latitude', data.latitude.toString())
      if (data.longitude) formData.append('longitude', data.longitude.toString())
      if (data.dateLostFound) formData.append('dateLostFound', data.dateLostFound)
      // Only send pickupMethod for admins; non-admins don't see the picker and
      // the API guard would reject 'office' from a non-admin anyway.
      if (item?.type === 'found' && isAdminUser && data.pickupMethod) {
        formData.append('pickupMethod', data.pickupMethod)
      }

      // Add new images if present
      const images = data.images || []
      images.forEach((image) => {
        formData.append('images', image)
      })

      // Add removed image indices if present
      if (removedImageIndices.length > 0 && images.length === 0) {
        formData.append('removeImageIndices', JSON.stringify(removedImageIndices))
      }

      // Call API route
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to update item')
        return
      }

      setSuccess(true)

      setTimeout(() => {
        router.push(`/item/${itemId}`)
      }, 1500)
    } catch (err) {
      console.error('Error updating item:', err)
      setError('An unexpected error occurred')
    }
  }

  if (authLoading || isLoadingItem) {
      return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  if (error && !item) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    )
  }

  if (!item) {
    return null
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-4 -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="mb-2 text-3xl font-bold text-text-primary">Edit Item</h1>
        <p className="text-text-secondary">Update the details of your item</p>
      </div>

      {success && (
        <Alert variant="success" className="mb-6">
          <strong>Success!</strong> Your item has been updated. Redirecting...
        </Alert>
      )}

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information Section */}
        <div className="space-y-4 rounded-lg border border-border bg-bg-elevated p-6">
          <h2 className="mb-4 text-xl font-semibold text-text-primary">Basic Information</h2>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" error={!!errors.title} required>
              Title
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder={`What did you ${item.type === 'lost' ? 'lose' : 'find'}?`}
              error={!!errors.title}
            />
            {errors.title && (
              <p className="text-sm text-danger">{errors.title.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" error={!!errors.category} required>
              Category
            </Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <NativeSelect
                  ref={field.ref}
                  name={field.name}
                  id="category"
                  aria-invalid={!!errors.category}
                  className={errors.category ? '[&_select]:border-danger' : undefined}
                  value={field.value ?? ''}
                  onBlur={field.onBlur}
                  onChange={(e) => {
                    const v = e.target.value
                    field.onChange(v === '' ? undefined : v)
                  }}
                >
                  <option value="" disabled hidden>
                    Select a category
                  </option>
                  {ITEM_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </NativeSelect>
              )}
            />
            {errors.category && (
              <p className="text-sm text-danger">{errors.category.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" error={!!errors.description}>
              Description
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={`Describe the item in detail. Include brand, color, size, unique features, etc.`}
              rows={5}
              className={errors.description ? 'border-danger' : ''}
            />
            {errors.description && (
              <p className="text-sm text-danger">{errors.description.message}</p>
            )}
          </div>
        </div>

        {/* Location & Date Section */}
        <div className="space-y-4 rounded-lg border border-border bg-bg-elevated p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-text-primary">
            <MapPin className="h-5 w-5" />
            Location & Date
          </h2>

          {/* Location */}
          <Controller
            name="locationText"
            control={control}
            render={({ field }) => (
              <GooglePlacesAutocomplete
                value={field.value}
                onChange={(value, lat, lng) => {
                  field.onChange(value)
                  if (lat != null && lng != null) {
                    setValue('latitude', lat)
                    setValue('longitude', lng)
                  }
                }}
                error={errors.locationText?.message}
                placeholder={`Where did you ${item.type === 'lost' ? 'lose' : 'find'} it?`}
                required
              />
            )}
          />

          {/* Map picker: click to tag location */}
          <LocationMapPicker
            latitude={watchedLatitude}
            longitude={watchedLongitude}
            locationText={watchedLocationText}
            onLocationChange={(locationText, lat, lng) => {
              setValue('locationText', locationText)
              setValue('latitude', lat)
              setValue('longitude', lng)
            }}
            hint="Click on the map to pin the location (or use the search above)"
          />

          {/* Date Lost/Found */}
          <div className="space-y-2">
            <Label htmlFor="dateLostFound" error={!!errors.dateLostFound}>
              <Calendar className="inline h-4 w-4 mr-1" />
              Date {item.type === 'lost' ? 'Lost' : 'Found'} (Optional)
            </Label>
            <Input
              id="dateLostFound"
              type="date"
              {...register('dateLostFound')}
              max={new Date().toISOString().split('T')[0]}
              error={!!errors.dateLostFound}
            />
            {errors.dateLostFound && (
              <p className="text-sm text-danger">{errors.dateLostFound.message}</p>
            )}
          </div>
        </div>

        {/* Photos */}
        <div className="rounded-lg border border-border bg-bg-elevated p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-text-primary">
            <ImageIcon className="h-5 w-5" />
            Photos
          </h2>
          {(() => {
            const existingUrls =
              (item?.imageMetadata as { urls?: string[] } | undefined)?.urls ??
              (item?.imageUrl ? [item.imageUrl] : [])
            const visibleExisting = existingUrls.filter((_, i) => !removedImageIndices.includes(i))
            const newFiles = watchedImages ?? []
            const totalCount = visibleExisting.length + newFiles.length
            const canAdd = totalCount < 3

            return (
              <div className="space-y-3">
                {visibleExisting.length > 0 && (
                  <p className="text-sm text-text-secondary">
                    Current images — click the cross to remove
                  </p>
                )}
                <div className="grid grid-cols-3 gap-4">
                  {/* Existing images (with remove cross) */}
                  {existingUrls.map((url, index) => {
                    if (removedImageIndices.includes(index)) return null
                    return (
                      <div
                        key={`existing-${index}`}
                        className="relative group aspect-square rounded-lg border-2 border-border"
                      >
                        <div className="absolute inset-0 overflow-hidden rounded-lg bg-surface-2">
                          <Image
                            src={url}
                            alt={`Current ${index + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setRemovedImageIndices((prev) => [...prev, index].sort((a, b) => a - b))
                          }
                          className="absolute -right-2 -top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-danger text-danger-foreground shadow-md transition-colors hover:bg-danger/90"
                          aria-label="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded z-10">
                          {visibleExisting.indexOf(url) + 1}
                        </div>
                      </div>
                    )
                  })}
                  {/* New files (to be uploaded, with remove cross) */}
                  {newFiles.map((file, index) => (
                    <div
                      key={`new-${index}`}
                      className="relative group aspect-square rounded-lg border-2 border-border"
                    >
                      <div className="absolute inset-0 overflow-hidden rounded-lg bg-surface-2">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`New ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = newFiles.filter((_, i) => i !== index)
                          setValue('images', next)
                        }}
                        className="absolute -right-2 -top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-danger text-danger-foreground shadow-md transition-colors hover:bg-danger/90"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded z-10">
                        {visibleExisting.length + index + 1}
                      </div>
                    </div>
                  ))}
                  {/* Add button (grey skeleton + plus) */}
                  {canAdd && (
                    <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-bg-overlay transition-colors hover:border-border-hover hover:bg-surface-2">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          e.target.value = ''
                          if (files.length === 0) return
                          const allowed = 3 - totalCount
                          const toAdd: File[] = []
                          for (const file of files) {
                            if (toAdd.length >= allowed) break
                            const validation = validateItemImage(file)
                            if (!validation.error) toAdd.push(file)
                          }
                          if (toAdd.length > 0) {
                            setValue('images', [...newFiles, ...toAdd])
                          }
                        }}
                      />
                      <Plus className="h-10 w-10 text-text-tertiary" aria-hidden />
                      <span className="sr-only">Add images</span>
                    </label>
                  )}
                </div>
                {errors.images?.message && (
                  <p className="text-sm text-danger">{errors.images.message}</p>
                )}
              </div>
            )
          })()}
        </div>

        {/* Pickup Method (Only for Found Items, Admin Only) */}
        {item?.type === 'found' && isAdminUser && (
          <div className="space-y-4 rounded-lg border border-border bg-bg-elevated p-6">
            <h2 className="mb-4 text-xl font-semibold text-text-primary">Pickup Method</h2>
            <p className="mb-4 text-sm text-text-secondary">
              How would you prefer the owner to retrieve this found item?
            </p>
            <Controller
              name="pickupMethod"
              control={control}
              render={({ field }) => (
                <SelectionCardRadioGroup
                  name={field.name}
                  legend="Choose how the owner can retrieve this item"
                  legendClassName="sr-only"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.pickupMethod?.message}
                  options={[
                    {
                      value: 'office',
                      title: 'Lost & Found Office',
                      description: LOST_FOUND_OFFICE_PICKUP_CARD_SUMMARY,
                      activeClassName: 'border-found bg-found-muted ring-2 ring-found/20',
                    },
                    {
                      value: 'meetup',
                      title: 'Meet Up',
                      description: 'I will meet the owner to return it personally',
                      activeClassName: 'border-found bg-found-muted ring-2 ring-found/20',
                    },
                  ]}
                />
              )}
            />
            {watchedPickupMethod === 'office' && (
              <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
                <OfficePickupDetails variant="compact" />
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={isSubmitting}
            disabled={isSubmitting || success}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
