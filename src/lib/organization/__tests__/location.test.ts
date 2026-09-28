import { describe, expect, it, vi } from 'vitest'
import { assertDefaultLocation, resolveDefaultLocationId } from '../location'

function locationClient(result: { data: { id: string } | null; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result)
  const eq = vi.fn().mockReturnThis()
  const select = vi.fn().mockReturnValue({ eq, single })
  const from = vi.fn().mockReturnValue({ select })
  return { client: { from } as any, from, select, eq, single }
}

describe('default location', () => {
  it('resolves the configured active slug through a single-result query', async () => {
    const query = locationClient({ data: { id: 'location-1' }, error: null })
    await expect(resolveDefaultLocationId(query.client)).resolves.toBe('location-1')
    expect(query.from).toHaveBeenCalledWith('campuses')
    expect(query.select).toHaveBeenCalledWith('id')
    expect(query.eq).toHaveBeenCalledWith('slug', 'main')
    expect(query.eq).toHaveBeenCalledWith('is_active', true)
    expect(query.single).toHaveBeenCalledOnce()
  })

  it('reports missing or ambiguous active location as setup failure', async () => {
    const query = locationClient({ data: null, error: { code: 'PGRST116' } })
    await expect(resolveDefaultLocationId(query.client)).rejects.toMatchObject({ code: 'setup' })
  })

  it.each([null, '', 'other-location'])('rejects requested location %s', async requested => {
    const query = locationClient({ data: { id: 'location-1' }, error: null })
    await expect(assertDefaultLocation(query.client, requested)).rejects.toMatchObject({ code: 'validation' })
  })

  it('returns the canonical ID for the requested default location', async () => {
    const query = locationClient({ data: { id: 'location-1' }, error: null })
    await expect(assertDefaultLocation(query.client, 'location-1')).resolves.toBe('location-1')
  })
})
