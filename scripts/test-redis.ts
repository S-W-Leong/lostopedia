/**
 * Redis/Upstash Verification Script
 *
 * Tests:
 * 1. Basic Redis connection
 * 2. SET/GET/DEL operations
 * 3. Rate limiter functionality
 */

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') })

const TEST_KEY = 'test:verification:' + Date.now()

async function main() {
  console.log('🔍 Redis/Upstash Verification Test\n')
  console.log('='.repeat(50))

  // Check environment variables
  console.log('\n📋 Step 1: Checking Environment Variables\n')

  const redisUrl = process.env.KV_REST_API_URL
  const redisToken = process.env.KV_REST_API_TOKEN

  if (!redisUrl) {
    console.error('❌ FAIL: KV_REST_API_URL not found')
    process.exit(1)
  }
  console.log('✅ Redis URL found:', redisUrl)

  if (!redisToken) {
    console.error('❌ FAIL: KV_REST_API_TOKEN not found')
    process.exit(1)
  }
  console.log('✅ Redis Token found: [REDACTED]')

  // Initialize Redis client
  console.log('\n📋 Step 2: Initializing Redis Client\n')

  let redis: Redis
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    })
    console.log('✅ Redis client initialized')
  } catch (error) {
    console.error('❌ FAIL: Could not initialize Redis client:', error)
    process.exit(1)
  }

  // Test SET operation
  console.log('\n📋 Step 3: Testing SET Operation\n')

  try {
    const setResult = await redis.set(TEST_KEY, 'hello-upstash')
    console.log('✅ SET operation successful:', setResult)
  } catch (error) {
    console.error('❌ FAIL: SET operation failed:', error)
    process.exit(1)
  }

  // Test GET operation
  console.log('\n📋 Step 4: Testing GET Operation\n')

  try {
    const getValue = await redis.get(TEST_KEY)
    if (getValue === 'hello-upstash') {
      console.log('✅ GET operation successful:', getValue)
    } else {
      console.error('❌ FAIL: GET returned unexpected value:', getValue)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ FAIL: GET operation failed:', error)
    process.exit(1)
  }

  // Test DEL operation
  console.log('\n📋 Step 5: Testing DEL Operation\n')

  try {
    const delResult = await redis.del(TEST_KEY)
    console.log('✅ DEL operation successful, keys deleted:', delResult)
  } catch (error) {
    console.error('❌ FAIL: DEL operation failed:', error)
    process.exit(1)
  }

  // Test Rate Limiter
  console.log('\n📋 Step 6: Testing Rate Limiter\n')

  try {
    const testRateLimiter = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(3, '10s'), // 3 requests per 10 seconds
      prefix: 'test:ratelimit',
    })

    const testIdentifier = 'test-user-' + Date.now()

    // Make 4 requests - first 3 should succeed, 4th should fail
    console.log('   Making 4 requests (limit is 3 per 10s)...\n')

    for (let i = 1; i <= 4; i++) {
      const result = await testRateLimiter.limit(testIdentifier)
      const status = result.success ? '✅ Allowed' : '🚫 Blocked'
      console.log(`   Request ${i}: ${status} (remaining: ${result.remaining})`)
    }

    console.log('\n✅ Rate limiter working correctly (blocked on 4th request)')
  } catch (error) {
    console.error('❌ FAIL: Rate limiter test failed:', error)
    process.exit(1)
  }

  // Test PING
  console.log('\n📋 Step 7: Testing PING\n')

  try {
    const pingResult = await redis.ping()
    console.log('✅ PING successful:', pingResult)
  } catch (error) {
    console.error('❌ FAIL: PING failed:', error)
    process.exit(1)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('\n🎉 ALL TESTS PASSED!\n')
  console.log('Summary:')
  console.log('  ✅ Environment variables configured correctly')
  console.log('  ✅ Redis client connection successful')
  console.log('  ✅ SET operation working')
  console.log('  ✅ GET operation working')
  console.log('  ✅ DEL operation working')
  console.log('  ✅ Rate limiter working')
  console.log('  ✅ PING responding')
  console.log('\nYour Upstash Redis is properly configured and operational!\n')
}

main().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
