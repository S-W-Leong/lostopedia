'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin, Calendar, ImageIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { SelectionCardRadioGroup } from '@/components/ui/selection-card-radio-group'
import { NativeSelect } from '@/components/ui/native-select'
import { GooglePlacesAutocomplete } from '@/components/forms/GooglePlacesAutocomplete'
import { LocationMapPicker } from '@/components/maps/LocationMapPicker'
import { ImageUpload } from '@/components/forms/ImageUpload'
import { useAuth } from '@/hooks/useAuth'
import { itemFormSchema, type ItemFormValues } from '@/lib/validations/item'
import { ITEM_CATEGORIES, CATEGORY_LABELS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { LOST_FOUND_OFFICE_PICKUP_CARD_SUMMARY } from '@/lib/campus/lost-found-office'
import { organization } from '@/lib/organization/config'
import { resolveDefaultLocationId } from '@/lib/organization/location'
import { OfficePickupDetails } from '@/components/office/OfficePickupDetails'

export default function PostItemPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successOfficePickup, setSuccessOfficePickup] = useState(false)
  const [campusId, setCampusId] = useState<string | null>(null)
  const [isAdminUser, setIsAdminUser] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      type: 'lost',
      title: '',
      description: '',
      category: undefined,
      locationText: '',
      dateLostFound: '',
      images: [],
    },
  })

  const selectedType = useWatch({ control, name: 'type', defaultValue: 'lost' })

  useEffect(() => {
    if (selectedType === 'found' && !isAdminUser) {
      setValue('pickupMethod', 'meetup')
    }
  }, [selectedType, isAdminUser, setValue])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Fetch campus ID on mount
  useEffect(() => {
    async function fetchCampus() {
      const supabase = createClient()
      try {
        setCampusId(await resolveDefaultLocationId(supabase))
      } catch (error) {
        console.error('Failed to fetch campus:', error)
        setError('The default location is unavailable. Please contact support.')
      }
    }

    fetchCampus()
  }, [])

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

  const onSubmit = async (data: ItemFormValues) => {
    setError(null)
    setSuccess(false)
    setSuccessOfficePickup(false)

    if (!campusId || !user) {
      setError('Location information not loaded. Please refresh the page.')
      return
    }

    try {
      // Build FormData for API request (supports images)
      const formData = new FormData()
      formData.append('type', data.type)
      formData.append('title', data.title)
      formData.append('description', data.description)
      formData.append('category', data.category)
      formData.append('locationText', data.locationText)
      formData.append('campusId', campusId)
      
      if (data.type === 'found' && data.pickupMethod) {
        formData.append('pickupMethod', data.pickupMethod)
      }

      if (data.latitude) formData.append('latitude', data.latitude.toString())
      if (data.longitude) formData.append('longitude', data.longitude.toString())
      if (data.dateLostFound) formData.append('dateLostFound', data.dateLostFound)

      // Add images if present
      const images = data.images || []
      images.forEach((image) => {
        formData.append('images', image)
      })

      // Call API route
      const response = await fetch('/api/items', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to create item. Please try again.')
        return
      }

      if (data.type === 'found' && data.pickupMethod === 'office') {
        setSuccessOfficePickup(true)
      }

      setSuccess(true)

      setTimeout(() => {
        router.push(`/item/${result.itemId}`)
      }, 1500)
    } catch (error) {
      console.error('Error submitting form:', error)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  if (authLoading || !user) {
      return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-text-primary">Post an Item</h1>
        <p className="text-text-secondary">
          Help reunite lost items with their owners or find your lost belongings
        </p>
      </div>

      {success && (
        <Alert variant="success" className="mb-6">
          <strong>Success!</strong> Your item has been posted. Redirecting to item page...
          {successOfficePickup && (
            <p className="text-sm mt-2 opacity-95">
              Owners should collect this item at {organization.office.name}. Full collection details are on the item page and in Help.
            </p>
          )}
        </Alert>
      )}

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Item Type Section */}
        <div className="rounded-lg border border-border bg-bg-elevated p-6">
          <h2 className="mb-4 text-xl font-semibold text-text-primary">Item Type</h2>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <SelectionCardRadioGroup
                name={field.name}
                legend="Choose whether this is a lost or found item"
                legendClassName="sr-only"
                value={field.value}
                onChange={field.onChange}
                error={errors.type?.message}
                options={[
                  {
                    value: 'lost',
                    title: 'I Lost Something',
                    description: 'Post an item you’ve lost',
                    activeClassName: 'border-lost bg-lost-muted ring-2 ring-lost/20',
                  },
                  {
                    value: 'found',
                    title: 'I Found Something',
                    description: 'Post an item you’ve found',
                    activeClassName: 'border-found bg-found-muted ring-2 ring-found/20',
                  },
                ]}
              />
            )}
          />
        </div>

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
              placeholder={`What did you ${selectedType === 'lost' ? 'lose' : 'find'}?`}
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
            <p className="text-sm text-text-muted">
              {watch('description')?.length || 0} / 1000 characters
            </p>
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
                placeholder={`Where did you ${selectedType === 'lost' ? 'lose' : 'find'} it?`}
                required
              />
            )}
          />

          {/* Map picker: click to tag location */}
          <LocationMapPicker
            latitude={watch('latitude')}
            longitude={watch('longitude')}
            locationText={watch('locationText')}
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
              Date {selectedType === 'lost' ? 'Lost' : 'Found'} (Optional)
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

        {/* Images Section */}
        <div className="rounded-lg border border-border bg-bg-elevated p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-text-primary">
            <ImageIcon className="h-5 w-5" />
            Photos
          </h2>
          <Controller
            name="images"
            control={control}
            render={({ field }) => (
              <ImageUpload
                images={field.value || []}
                onChange={field.onChange}
                error={errors.images?.message}
                maxImages={3}
              />
            )}
          />
        </div>

        {/* Pickup Method (Only for Found Items, Admin Only) */}
        {selectedType === 'found' && isAdminUser && (
          <div className="rounded-lg border border-border bg-bg-elevated p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-text-primary">Pickup Method</h2>
            <p className="text-sm text-text-secondary mb-4">
              How would you prefer the owner to retrieve this found item?
            </p>
            <Controller
              name="pickupMethod"
              control={control}
              render={({ field }) => (
                <>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => field.onChange('office')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all text-left ${
                      field.value === 'office'
                        ? 'border-found bg-found/10 ring-2 ring-found/20'
                        : 'border-border hover:border-border/70'
                    }`}
                  >
                    <div className="text-lg font-semibold text-text-primary mb-1">
                      Lost &amp; Found Office
                    </div>
                    <div className="text-sm text-text-secondary">
                      {LOST_FOUND_OFFICE_PICKUP_CARD_SUMMARY}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange('meetup')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all text-left ${
                      field.value === 'meetup'
                        ? 'border-found bg-found/10 ring-2 ring-found/20'
                        : 'border-border hover:border-border/70'
                    }`}
                  >
                    <div className="text-lg font-semibold text-text-primary mb-1">
                      Meet Up
                    </div>
                    <div className="text-sm text-text-secondary">
                      Meet the owner in person to return the item
                    </div>
                  </button>
                </div>
                {field.value === 'office' && (
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-4 mt-4">
                    <OfficePickupDetails variant="compact" />
                  </div>
                )}
                </>
              )}
            />
            {errors.pickupMethod && (
              <p className="mt-2 text-sm text-red-600">{errors.pickupMethod.message}</p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex flex-col-reverse sm:flex-row gap-4">
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
            {isSubmitting ? 'Creating...' : 'Post Item'}
          </Button>
        </div>
      </form>
    </div>
  )
}
