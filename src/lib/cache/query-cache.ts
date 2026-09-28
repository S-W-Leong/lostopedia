import { createHash } from 'crypto'
import { Redis } from '@upstash/redis'

let redis: Redis | null = null
let initialized = false

function getRedis(): Redis | null {
  if (initialized) return redis
  initialized = true
  try {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN
    if (url && token) {
      redis = new Redis({ url, token })
    }
  } catch (error) {
    console.error('[QueryCache] Failed to init Redis:', error)
    redis = null
  }
  return redis
}

const VERSION_KEY = 'items:ver'

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = getRedis()
  if (!client) return null
  try {
    return (await client.get<T>(key)) ?? null
  } catch (error) {
    console.error('[QueryCache] get error:', error)
    return null
  }
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = getRedis()
  if (!client) return
  try {
    await client.set(key, value as any, { ex: ttlSeconds })
  } catch (error) {
    console.error('[QueryCache] set error:', error)
  }
}

export async function currentItemsVersion(): Promise<number> {
  const client = getRedis()
  if (!client) return 0
  try {
    const v = await client.get<number>(VERSION_KEY)
    return Number(v) || 0
  } catch (error) {
    console.error('[QueryCache] version read error:', error)
    return 0
  }
}

export async function bumpItemsVersion(): Promise<void> {
  const client = getRedis()
  if (!client) return
  try {
    await client.incr(VERSION_KEY)
  } catch (error) {
    console.error('[QueryCache] version bump error:', error)
  }
}

export function buildItemsCacheKey(
  version: number,
  kind: 'list' | 'search',
  params: Record<string, string | null | undefined>
): string {
  const normalized = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k] ?? ''}`)
    .join('&')
  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 24)
  return `items:v${version}:${kind}:${hash}`
}
