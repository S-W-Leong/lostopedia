'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { MapMarker, MapPopupDetails } from '@/lib/map-items'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function MapItemPopup({ item }: { item: MapMarker }) {
  const [details, setDetails] = useState<MapPopupDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authRequired, setAuthRequired] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let current = true
    setError(null)
    setAuthRequired(false)
    const load = async () => {
      try {
        const response = await fetch(`/api/map/items/${item.id}`, { signal: controller.signal })
        if (!current) return
        if (response.status === 401) {
          setAuthRequired(true)
          setError('Sign in to see item details.')
          return
        }
        if (!response.ok) throw new Error('Request failed')
        const data = await response.json()
        if (!data.success) throw new Error('Request failed')
        if (current) setDetails(data.item)
      } catch {
        if (current) setError('Unable to load item details.')
      }
    }
    void load()
    return () => { current = false; controller.abort() }
  }, [item.id, attempt])

  if (error) return (
    <div className="mb-3 text-sm" role="status">
      <p>{error}</p>
      {authRequired ? <Link href="/login" className="underline">Sign in</Link> :
        <Button variant="outline" size="sm" onClick={() => setAttempt(value => value + 1)}>Retry details</Button>}
    </div>
  )
  if (!details) return <p role="status" className="mb-3 text-sm">Loading item details...</p>

  return (
    <>
      {details.imageUrl && <div className="relative h-32 mb-2 rounded overflow-hidden">
        <Image src={details.imageUrl} alt={item.title} fill sizes="256px" className="object-cover" />
      </div>}
      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{details.description}</p>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
        <MapPin className="h-3 w-3" /><span className="line-clamp-1">{details.locationText}</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <Calendar className="h-3 w-3" /><span>{formatDistanceToNow(new Date(details.createdAt), { addSuffix: true })}</span>
      </div>
    </>
  )
}
