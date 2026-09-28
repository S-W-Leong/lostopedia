import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminOperationId } from '@/lib/contracts/admin/v1/schemas'
import { createReputationEvent } from '@/lib/supabase/reputation'
import { itemFormSchema } from '@/lib/validations/item'
import { APP_CONFIG } from '@/lib/constants'
import { assertDefaultLocation, DefaultLocationError } from '@/lib/organization/location'

export interface OperationActorContext {
  actorType: 'machine' | 'session'
  actorId?: string | null
  displayName: string
}

interface DraftItemInput {
  type?: 'lost' | 'found'
  title?: string
  description?: string
  category?: string
  locationText?: string
  campusId?: string
  pickupMethod?: 'office' | 'meetup'
  dateLostFound?: string
  latitude?: number
  longitude?: number
  imageUrls?: string[]
  briefDescription?: string
}

function buildDraftTitle(item: DraftItemInput, index: number): string {
  if (item.title) return item.title
  if (item.briefDescription) {
    const clean = item.briefDescription.trim()
    return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean
  }
  return `Found item #${index + 1}`
}

function buildDraftDescription(item: DraftItemInput): string {
  if (item.description) return item.description
  if (item.briefDescription) return item.briefDescription
  return 'No additional description provided.'
}

function getMissingDraftFields(item: DraftItemInput): string[] {
  const missing: string[] = []
  if (!item.category) missing.push('category')
  if (!item.locationText) missing.push('locationText')
  if (!item.campusId) missing.push('campusId')
  return missing
}

export async function runAdminAutomationOperation(
  operationId: AdminOperationId,
  input: Record<string, unknown>,
  actor: OperationActorContext
) {
  const supabase = await createClient()

  switch (operationId) {
    case 'admin.items.list': {
      let query = supabase
        .from('items')
        .select('id, type, title, description, category, image_url, image_metadata, location_text, pickup_method, geo_location, location_precision, date_lost_found, created_at, updated_at, status, completed_at, expires_at, posted_by, campus_id, is_flagged, flag_count, admin_notes', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(Number(input.offset || 0), Number(input.offset || 0) + Number(input.limit || 50) - 1)

      if (input.type) query = query.eq('type', String(input.type))
      if (input.status) query = query.eq('status', String(input.status))
      if (input.category) query = query.eq('category', String(input.category))
      if (typeof input.flagged === 'boolean') query = query.eq('is_flagged', input.flagged)

      const { data, error, count } = await query
      if (error) throw new Error('Failed to list items')

      return {
        items: data ?? [],
        total: count ?? 0,
      }
    }
    case 'admin.users.list': {
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(Number(input.offset || 0), Number(input.offset || 0) + Number(input.limit || 50) - 1)

      const search = input.search ? String(input.search) : ''
      if (search) {
        query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`)
      }
      if (typeof input.banned === 'boolean') query = query.eq('is_banned', input.banned)
      if (typeof input.admins === 'boolean' && input.admins) query = query.eq('is_admin', true)

      const { data, error, count } = await query
      if (error) throw new Error('Failed to list users')

      return {
        users: data ?? [],
        total: count ?? 0,
      }
    }
    case 'admin.reputation.list': {
      let query = supabase
        .from('reputation_events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(Number(input.offset || 0), Number(input.offset || 0) + Number(input.limit || 50) - 1)

      if (input.userId) {
        query = query.eq('user_id', String(input.userId))
      }

      const { data, error, count } = await query
      if (error) throw new Error('Failed to list reputation events')

      return {
        events: data ?? [],
        total: count ?? 0,
      }
    }
    case 'admin.users.update-status': {
      const updates: Record<string, unknown> = {
        is_banned: Boolean(input.is_banned),
      }
      if (input.is_banned) {
        updates.banned_at = new Date().toISOString()
        updates.banned_reason = String(input.banned_reason || 'No reason provided')
      } else {
        updates.banned_at = null
        updates.banned_reason = null
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates as any)
        .eq('id', String(input.userId))
        .select('*')
        .single()

      if (error) throw new Error('Failed to update user status')
      return { user: data }
    }
    case 'admin.reputation.adjust': {
      const result = await createReputationEvent({
        userId: String(input.userId),
        eventType: 'admin_adjustment',
        pointsChange: Number(input.points),
        notes: `Admin automation adjustment by ${actor.displayName}: ${String(input.reason)}`,
        relatedItemId: input.relatedItemId ? String(input.relatedItemId) : undefined,
      })
      if (!result.success) {
        throw new Error(result.error || 'Failed to adjust reputation')
      }
      return { result: 'ok' }
    }
    case 'admin.items.post-draft': {
      const items = Array.isArray(input.items) ? (input.items as DraftItemInput[]) : []
      const drafts = await Promise.all(items.map(async (item, index) => {
        const missingFields = getMissingDraftFields(item)
        let canonicalLocationId: string | undefined
        if (item.campusId) {
          try {
            canonicalLocationId = await assertDefaultLocation(supabase, item.campusId)
          } catch (error) {
            if (error instanceof DefaultLocationError && error.code === 'setup') throw error
            missingFields.push('campusId')
          }
        }
        const normalized = {
          type: item.type || 'found',
          title: buildDraftTitle(item, index),
          description: buildDraftDescription(item),
          category: item.category,
          locationText: item.locationText,
          campusId: canonicalLocationId,
          pickupMethod: item.pickupMethod || 'office',
          dateLostFound: item.dateLostFound,
          latitude: item.latitude,
          longitude: item.longitude,
          imageUrls: item.imageUrls || [],
        }

        return {
          index,
          status: missingFields.length > 0 ? 'needs_input' : 'ready',
          missingFields,
          draft: normalized,
        }
      }))

      return {
        drafts,
        total: drafts.length,
        ready: drafts.filter((draft) => draft.status === 'ready').length,
      }
    }
    case 'admin.items.post-confirm': {
      if (!actor.actorId) {
        throw new Error('Posting confirmation requires actor identity')
      }

      const items = Array.isArray(input.items) ? (input.items as Record<string, unknown>[]) : []
      const admin = createAdminClient()
      const created: Array<{ index: number; itemId: string }> = []
      const failed: Array<{ index: number; error: string; details?: unknown }> = []

      for (const [index, item] of items.entries()) {
        const toValidate = {
          type: item.type,
          title: item.title,
          description: item.description,
          category: item.category,
          locationText: item.locationText,
          latitude: item.latitude,
          longitude: item.longitude,
          dateLostFound: item.dateLostFound,
          pickupMethod: item.pickupMethod,
          images: [],
        }

        const validation = itemFormSchema.safeParse(toValidate)
        if (!validation.success) {
          failed.push({
            index,
            error: 'Validation failed',
            details: validation.error.flatten().fieldErrors,
          })
          continue
        }

        const parsed = validation.data
        let canonicalLocationId: string
        try {
          canonicalLocationId = await assertDefaultLocation(admin, item.campusId)
        } catch (error) {
          failed.push({ index, error: error instanceof Error ? error.message : 'Invalid location' })
          continue
        }
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + APP_CONFIG.itemExpirationDays)
        const geoLocation =
          typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number'
            ? `POINT(${parsed.longitude} ${parsed.latitude})`
            : null

        const imageUrls = Array.isArray(item.imageUrls) ? item.imageUrls.map(String).slice(0, 3) : []

        const { data, error } = await admin
          .from('items')
          .insert({
            type: parsed.type,
            title: parsed.title,
            description: parsed.description,
            category: parsed.category,
            location_text: parsed.locationText,
            geo_location: geoLocation,
            date_lost_found: parsed.dateLostFound || null,
            posted_by: actor.actorId,
            campus_id: canonicalLocationId,
            pickup_method: parsed.type === 'found' ? parsed.pickupMethod || 'office' : null,
            status: 'active',
            expires_at: expiresAt.toISOString(),
            location_precision:
              typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number'
                ? 'approximate'
                : 'hidden',
            image_url: imageUrls[0] || null,
            image_metadata: imageUrls.length > 0 ? { urls: imageUrls } : null,
            ai_text_embedding: null,
            ai_processed_at: null,
            ai_version: null,
          } as any)
          .select('id')
          .single()

        if (error || !data) {
          failed.push({
            index,
            error: error?.message || 'Failed to create item',
          })
          continue
        }

        created.push({
          index,
          itemId: (data as { id: string }).id,
        })
      }

      return {
        created,
        failed,
        totalRequested: items.length,
        createdCount: created.length,
        failedCount: failed.length,
      }
    }
    case 'admin.items.bulk-update':
    case 'admin.users.delete':
      // Handled by dry-run/confirm flow in a later unit.
      throw new Error('Destructive operations require dry-run support')
    default:
      throw new Error('Unsupported operation')
  }
}
