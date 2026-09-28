import { describe, it, expect } from 'vitest'
import {
  parseSearchDateRange,
  createdAtUtcBounds,
} from '@/lib/search-date-params'

describe('parseSearchDateRange', () => {
  it('accepts empty range', () => {
    expect(parseSearchDateRange(null, null)).toEqual({
      ok: true,
      dateFrom: null,
      dateTo: null,
    })
    expect(parseSearchDateRange('', '')).toEqual({
      ok: true,
      dateFrom: null,
      dateTo: null,
    })
  })

  it('accepts open-ended ranges', () => {
    expect(parseSearchDateRange('2026-01-01', null)).toEqual({
      ok: true,
      dateFrom: '2026-01-01',
      dateTo: null,
    })
    expect(parseSearchDateRange(null, '2026-12-31')).toEqual({
      ok: true,
      dateFrom: null,
      dateTo: '2026-12-31',
    })
  })

  it('rejects invalid format', () => {
    const r = parseSearchDateRange('01-01-2026', null)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('YYYY-MM-DD')
  })

  it('rejects from after to', () => {
    const r = parseSearchDateRange('2026-02-01', '2026-01-01')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('dateFrom')
  })

  it('accepts same-day range', () => {
    expect(parseSearchDateRange('2026-06-15', '2026-06-15')).toEqual({
      ok: true,
      dateFrom: '2026-06-15',
      dateTo: '2026-06-15',
    })
  })
})

describe('createdAtUtcBounds', () => {
  it('returns empty object when no bounds', () => {
    expect(createdAtUtcBounds(null, null)).toEqual({})
  })

  it('returns gte/lte ISO strings', () => {
    expect(createdAtUtcBounds('2026-03-01', '2026-03-31')).toEqual({
      gte: '2026-03-01T00:00:00.000Z',
      lte: '2026-03-31T23:59:59.999Z',
    })
  })
})
