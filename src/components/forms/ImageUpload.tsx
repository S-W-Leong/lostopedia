'use client'

import { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { validateItemImage } from '@/lib/images/validate'

interface ImageUploadProps {
  images: File[]
  onChange: (files: File[]) => void
  error?: string
  maxImages?: number
  label?: string
  required?: boolean
}

export function ImageUpload({
  images,
  onChange,
  error,
  maxImages = 3,
  label = 'Images',
  required = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string>('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setValidationError('')

    if (files.length === 0) return

    // Check total count
    if (images.length + files.length > maxImages) {
      setValidationError(`Maximum ${maxImages} images allowed`)
      return
    }

    // Validate each file
    for (const file of files) {
      const validation = validateItemImage(file)
      if (validation.error) {
        setValidationError(validation.error)
        return
      }
    }

    // Add new files
    onChange([...images, ...files])

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onChange(newImages)
    setValidationError('')
  }

  const getImagePreview = (file: File): string => {
    return URL.createObjectURL(file)
  }

  return (
    <div className="space-y-3">
      <Label error={!!(error || validationError)} required={required}>
        {label}
        <span className="ml-2 text-sm font-normal text-text-muted">
          (Max {maxImages} images, 10MB each)
        </span>
      </Label>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square overflow-hidden rounded-lg border-2 border-border bg-surface-2">
                <img
                  src={getImagePreview(image)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -right-2 -top-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-danger text-danger-foreground shadow-md transition-colors hover:bg-danger/90"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {images.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            {images.length === 0 ? (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Upload Images
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Add More Images ({images.length}/{maxImages})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error Messages */}
      {(error || validationError) && (
        <p className="text-sm text-danger">{error || validationError}</p>
      )}

      {/* Help Text */}
      {images.length === 0 && !error && !validationError && (
        <p className="text-sm text-text-muted">
          You can upload up to {maxImages} images. Supported formats: JPEG, PNG, WebP, GIF
        </p>
      )}
    </div>
  )
}
