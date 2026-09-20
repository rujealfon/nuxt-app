import { useLogger } from './logger'
import { useRedis } from './redis'

// Atomically increments the counter and sets the window expiry on first hit,
// so concurrent requests can't all pass a stale read.
const CONSUME_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`

export interface RateLimitStorage {
  consume: (
    key: string,
    rule: { window: number, max: number },
  ) => Promise<{ allowed: boolean, retryAfter: number | null }>
}

// Shared default policy: the Nitro middleware and Better Auth read the same
// window and maximum from here instead of restating them.
export const rateLimitPolicy = { window: 60, max: 100 } as const

export interface RateLimitStorageOptions {
  // When true, a store outage denies the request instead of allowing it.
  // Better Auth's per-endpoint brute-force limiter opts in so a Redis outage
  // cannot silently disable auth throttling.
  failClosed?: boolean
}

// Redis-backed `RateLimitStorage` shared by the Nitro middleware and Better
// Auth. The Nitro limiter fails open. When the store is unavailable it allows
// the request and logs the failure, so a cache outage cannot take the API down.
// Better Auth passes `failClosed` because its stricter limiter guards sign-in.
export function createRateLimitStorage(options: RateLimitStorageOptions = {}): RateLimitStorage {
  return {
    async consume(key: string, rule: { window: number, max: number }) {
      try {
        const windowMs = Math.max(1000, Math.round(rule.window * 1000))
        const [count, ttl] = await useRedis().eval(
          CONSUME_SCRIPT,
          1,
          `rate-limit:${key}`,
          windowMs,
        ) as [number, number]

        if (count <= rule.max) {
          return { allowed: true, retryAfter: null }
        }

        return {
          allowed: false,
          retryAfter: Math.max(1, Math.ceil(ttl / 1000)),
        }
      }
      catch (error) {
        if (options.failClosed) {
          useLogger().error({ err: error }, 'rate limit store unreachable; denying request')
          return { allowed: false, retryAfter: Math.max(1, Math.ceil(rule.window)) }
        }

        useLogger().error({ err: error }, 'rate limit store unreachable; allowing request')
        return { allowed: true, retryAfter: null }
      }
    },
  }
}
