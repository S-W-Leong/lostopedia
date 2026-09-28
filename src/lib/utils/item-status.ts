import type { ItemStatus } from '@/lib/constants'

/**
 * True when the row is still `active` in the DB but `expires_at` is in the past
 * (e.g. expiration cron has not run yet).
 */
export function isStaleActiveItem(
  status: string,
  expiresAt: string | null | undefined
): boolean {
  if (status !== 'active') return false
  if (expiresAt == null || expiresAt === '') return false
  return new Date(expiresAt).getTime() <= Date.now()
}

/** Status exposed to clients: stale active listings are treated as expired. */
export function effectiveItemStatus(
  status: string,
  expiresAt: string | null | undefined
): ItemStatus {
  if (isStaleActiveItem(status, expiresAt)) return 'expired'
  return status as ItemStatus
}
