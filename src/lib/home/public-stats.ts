import 'server-only'
import { unstable_cache } from 'next/cache'
import { getPublicSupabaseClient } from '@/lib/supabase/public'

export type PublicStats = {
  totalUsers: number
  totalItems: number
  itemsRecovered: number
}

const ZERO_STATS: PublicStats = {
  totalUsers: 0,
  totalItems: 0,
  itemsRecovered: 0,
}

let lastKnownStats: PublicStats | null = null

const fetchPublicStats = unstable_cache(
  async (): Promise<PublicStats> => {
    const { data, error } = await getPublicSupabaseClient()
      .rpc('get_public_stats')
      .single()

    if (error) {
      throw error
    }

    const row = data as {
      total_users?: number | null
      total_items?: number | null
      items_recovered?: number | null
    } | null
    const stats = {
      totalUsers: Number(row?.total_users ?? 0),
      totalItems: Number(row?.total_items ?? 0),
      itemsRecovered: Number(row?.items_recovered ?? 0),
    }
    lastKnownStats = stats
    return stats
  },
  ['homepage-public-stats'],
  { revalidate: 900, tags: ['homepage-public-stats'] }
)

export async function getPublicStats(): Promise<PublicStats> {
  try {
    return await fetchPublicStats()
  } catch (error) {
    console.error('Error fetching public stats:', error)
    return lastKnownStats ?? ZERO_STATS
  }
}
