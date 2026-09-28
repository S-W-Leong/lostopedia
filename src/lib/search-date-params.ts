/**
 * Posted-date filter for /api/search: bounds use listing created_at in UTC calendar days.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function parseOne(value: string | null): string | null | 'invalid' {
  if (value == null || !String(value).trim()) return null
  const v = String(value).trim()
  if (!ISO_DATE.test(v)) return 'invalid'
  const t = Date.parse(`${v}T00:00:00.000Z`)
  if (Number.isNaN(t)) return 'invalid'
  return v
}

export type ParsedSearchDateRange =
  | { ok: true; dateFrom: string | null; dateTo: string | null }
  | { ok: false; error: string }

/**
 * Parse and validate optional dateFrom / dateTo query params (YYYY-MM-DD).
 */
export function parseSearchDateRange(
  dateFromParam: string | null,
  dateToParam: string | null
): ParsedSearchDateRange {
  const from = parseOne(dateFromParam)
  const to = parseOne(dateToParam)
  if (from === 'invalid' || to === 'invalid') {
    return { ok: false, error: 'Invalid date. Use YYYY-MM-DD (UTC calendar day).' }
  }
  if (from && to && from > to) {
    return { ok: false, error: 'dateFrom must be on or before dateTo.' }
  }
  return { ok: true, dateFrom: from, dateTo: to }
}

/**
 * Inclusive UTC bounds for filtering items.created_at (timestamptz).
 */
export function createdAtUtcBounds(dateFrom: string | null, dateTo: string | null): {
  gte?: string
  lte?: string
} {
  const out: { gte?: string; lte?: string } = {}
  if (dateFrom) out.gte = `${dateFrom}T00:00:00.000Z`
  if (dateTo) out.lte = `${dateTo}T23:59:59.999Z`
  return out
}
